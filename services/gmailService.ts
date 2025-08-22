import { supabase } from './supabaseClient';
import { getAppSetting } from './supabaseService';

let gisLoaded = false;
let tokenClient: any = null;
let cachedAccessToken: string | null = null;

async function getGoogleClientId(): Promise<string> {
  try {
    const v = await getAppSetting('GOOGLE_OAUTH_CLIENT_ID');
    if (typeof v === 'string' && v.trim()) return v.trim();
  } catch {}
  const local: any = (globalThis as any).APP_CONFIG_LOCAL;
  const id = local?.GOOGLE_OAUTH_CLIENT_ID;
  if (!id) throw new Error('GOOGLE_OAUTH_CLIENT_ID não configurado');
  return id;
}

async function ensureGis(): Promise<void> {
  if (gisLoaded) return;
  
  // Verificar se já existe o script
  const existingScript = document.querySelector('script[src*="gsi/client"]');
  if (existingScript && (window as any).google?.accounts?.oauth2) {
    gisLoaded = true;
    return;
  }
  
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; 
    s.defer = true;
    
    // Timeout para evitar travamento
    const timeout = setTimeout(() => {
      reject(new Error('Timeout ao carregar Google Identity Services'));
    }, 10000);
    
    s.onload = () => {
      clearTimeout(timeout);
      // Aguardar um pouco para garantir que a API está disponível
      setTimeout(() => {
        if ((window as any).google?.accounts?.oauth2) {
          resolve();
        } else {
          reject(new Error('Google Identity Services não inicializou corretamente'));
        }
      }, 100);
    };
    
    s.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Falha ao carregar Google Identity Services'));
    };
    
    document.head.appendChild(s);
  });
  
  gisLoaded = true;
}

function base64UrlEncode(input: string): string {
  // btoa lida com ASCII; para UTF-8 usamos TextEncoder
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64Encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function buildMime({ to, subject, html, fromName, fromEmail }: { to: string; subject: string; html: string; fromName?: string; fromEmail?: string; }): string {
  // Encode subject for UTF-8 per RFC 2047
  const encodedSubject = `=?UTF-8?B?${base64Encode(subject)}?=`;
  const headers = [
    fromEmail ? `From: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}` : undefined,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
  ].filter(Boolean);
  const raw = `${headers.join('\r\n')}\r\n\r\n${html}`;
  return base64UrlEncode(raw);
}

async function clearCachedTokens(): Promise<void> {
  cachedAccessToken = null;
  tokenClient = null;
  
  // Limpar tokens do localStorage/sessionStorage
  try {
    localStorage.removeItem('gmail_access_token');
    sessionStorage.removeItem('gmail_access_token');
  } catch {}
  
  console.log('🧹 GMAIL - Tokens cacheados limpos');
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken) return cachedAccessToken;
  
  // 0) Tenta reusar token do provedor (Supabase) quando disponível
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const anySess: any = session as any;
    const prov = (anySess?.provider_token as string) || (anySess?.provider_access_token as string) || null;
    if (prov) {
      cachedAccessToken = prov;
      return prov;
    }
  } catch {}

  await ensureGis();
  const clientId = await getGoogleClientId();
  
  // Escopo mais específico para envio de e-mail
  const scopes = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose';
  
  const google: any = (window as any).google;
  if (!google?.accounts?.oauth2) throw new Error('Google Identity Services indisponível');
  
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({ 
      client_id: clientId, 
      scope: scopes, 
      prompt: 'consent', // Sempre pedir consentimento para garantir permissões
      callback: () => {} 
    });
  }

  const tryRequest = (promptMode: '' | 'consent'): Promise<string> => new Promise((resolve, reject) => {
    let finished = false;
    const timeout = window.setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error('Timeout ao obter token do Google'));
      }
    }, 10000); // Aumentado para 10 segundos
    
    tokenClient.callback = (resp: any) => {
      if (finished) return;
      window.clearTimeout(timeout);
      finished = true;
      if (resp?.access_token) return resolve(resp.access_token);
      reject(new Error(resp?.error || 'Falha ao obter token do Google'));
    };
    
    try { 
      tokenClient.requestAccessToken({ prompt: promptMode }); 
    } catch (e) { 
      window.clearTimeout(timeout); 
      reject(e); 
    }
  });

  // Sempre tentar com consentimento primeiro para garantir permissões
  let token: string;
  try {
    token = await tryRequest('consent');
  } catch (error) {
    console.log('🔄 GMAIL - Tentando sem consentimento...');
    token = await tryRequest('');
  }
  
  cachedAccessToken = token;
  return token;
}

async function testGmailPermissions(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendEmailViaGmail({ to, subject, html }: { to: string; subject: string; html: string; }): Promise<boolean> {
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`📧 GMAIL - Tentativa ${retryCount + 1} de ${maxRetries + 1}...`);
      
      const token = await getAccessToken();
      
      // Testar permissões antes de tentar enviar
      const hasPermissions = await testGmailPermissions(token);
      if (!hasPermissions) {
        console.log('⚠️ GMAIL - Permissões insuficientes, tentando reautenticar...');
        await clearCachedTokens();
        retryCount++;
        continue;
      }
      
      // Dados do usuário para From (opcional)
      let fromName: string | undefined = undefined;
      let fromEmail: string | undefined = undefined;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        fromEmail = session?.user?.email || undefined;
        const md: any = session?.user?.user_metadata || {};
        fromName = md.full_name || md.name || undefined;
      } catch {}

      const raw = buildMime({ to, subject, html, fromName, fromEmail });
      
      console.log('📧 GMAIL - Enviando e-mail...');
      
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      
      if (!res.ok) {
        let details = '';
        try { 
          const j = await res.json(); 
          details = j?.error?.message || JSON.stringify(j); 
        } catch {}
        
        // Se for erro de permissão, tentar reautenticar
        if (res.status === 403 && (details.includes('insufficient authentication scopes') || details.includes('insufficient permissions'))) {
          console.log('🔄 GMAIL - Erro de permissão, tentando reautenticar...');
          await clearCachedTokens();
          retryCount++;
          continue;
        }
        
        throw new Error(`Gmail API falhou: ${res.status} ${res.statusText}${details ? ' - ' + details : ''}`);
      }
      
      console.log('✅ GMAIL - E-mail enviado com sucesso');
      return true;
      
    } catch (error) {
      console.error(`❌ GMAIL - Erro na tentativa ${retryCount + 1}:`, error);
      
      if (retryCount >= maxRetries) {
        // Se for erro de permissão, fornecer instruções específicas
        if (error instanceof Error && (error.message.includes('insufficient authentication scopes') || error.message.includes('insufficient permissions'))) {
          throw new Error('Gmail API: Permissões insuficientes. Por favor, faça logout e login novamente para conceder permissões de envio de e-mail.');
        }
        
        throw error;
      }
      
      // Limpar tokens e tentar novamente
      await clearCachedTokens();
      retryCount++;
    }
  }
  
  throw new Error('Gmail API: Falha após múltiplas tentativas');
}

// Função para forçar reautenticação
export async function forceGmailReauth(): Promise<void> {
  await clearCachedTokens();
  console.log('🔄 GMAIL - Reautenticação forçada');
}

// Função para verificar se o Gmail está configurado
export async function checkGmailSetup(): Promise<{ configured: boolean; error?: string }> {
  try {
    const clientId = await getGoogleClientId();
    return { configured: !!clientId };
  } catch (error) {
    return { configured: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}


