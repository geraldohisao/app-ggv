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
  
  console.log('🔄 GMAIL - Carregando Google Identity Services...');
  
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; 
    s.defer = true;
    s.crossOrigin = 'anonymous'; // Adicionar crossOrigin para CSP
    
    // Timeout aumentado para conexões lentas
    const timeout = setTimeout(() => {
      console.error('⏰ GMAIL - Timeout ao carregar Google Identity Services');
      // Tentar método alternativo se timeout
      tryAlternativeLoad(resolve, reject);
    }, 15000);
    
    s.onload = () => {
      clearTimeout(timeout);
      console.log('📦 GMAIL - Script Google Identity Services carregado');
      
      // Aguardar mais tempo para garantir que a API está disponível
      setTimeout(() => {
        if ((window as any).google?.accounts?.oauth2) {
          console.log('✅ GMAIL - Google Identity Services inicializado com sucesso');
          resolve();
        } else {
          console.error('❌ GMAIL - Google Identity Services não inicializou');
          // Tentar método alternativo
          tryAlternativeLoad(resolve, reject);
        }
      }, 500);
    };
    
    s.onerror = (error) => {
      clearTimeout(timeout);
      console.error('❌ GMAIL - Erro ao carregar script (CSP?):', error);
      // Tentar método alternativo se erro de CSP
      tryAlternativeLoad(resolve, reject);
    };
    
    try {
      document.head.appendChild(s);
    } catch (error) {
      clearTimeout(timeout);
      console.error('❌ GMAIL - Erro ao adicionar script ao DOM:', error);
      tryAlternativeLoad(resolve, reject);
    }
  });
  
  gisLoaded = true;
}

// Método alternativo para carregar Google Identity Services
function tryAlternativeLoad(resolve: () => void, reject: (error: Error) => void): void {
  console.log('🔄 GMAIL - Tentando método alternativo de carregamento...');
  
  // Verificar se o Google já está disponível globalmente
  if ((window as any).google?.accounts?.oauth2) {
    console.log('✅ GMAIL - Google Identity Services já disponível globalmente');
    resolve();
    return;
  }
  
  // Tentar carregar via fetch e eval (fallback para CSP restritivo)
  fetch('https://accounts.google.com/gsi/client')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(scriptContent => {
      console.log('📦 GMAIL - Script obtido via fetch, executando...');
      
      // Criar script inline (pode funcionar mesmo com CSP restritivo)
      const script = document.createElement('script');
      script.textContent = scriptContent;
      document.head.appendChild(script);
      
      // Aguardar inicialização
      setTimeout(() => {
        if ((window as any).google?.accounts?.oauth2) {
          console.log('✅ GMAIL - Método alternativo funcionou!');
          resolve();
        } else {
          reject(new Error('Método alternativo falhou. Possível problema de CSP ou bloqueio de rede.'));
        }
      }, 1000);
    })
    .catch(fetchError => {
      console.error('❌ GMAIL - Método alternativo também falhou:', fetchError);
      reject(new Error(`Falha ao carregar Google Identity Services. CSP ou conectividade podem estar bloqueando. Erro: ${fetchError.message}`));
    });
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
    }, 15000); // Aumentado para 15 segundos
    
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
    console.warn('⚠️ GMAIL - Falha com consent, tentando sem:', error);
    try {
      token = await tryRequest('');
    } catch (secondError) {
      console.error('❌ GMAIL - Falha em ambas as tentativas:', secondError);
      throw new Error('Não foi possível obter autorização do Google. Verifique se os pop-ups estão habilitados e tente novamente.');
    }
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
        // Tentar fallback via Netlify Functions (funciona em localhost e produção)
        console.log('🔄 GMAIL - Tentando fallback via Netlify Functions...');
        try {
          const fallbackResult = await sendEmailViaNetlify({ to, subject, html });
          if (fallbackResult) {
            console.log('✅ FALLBACK - E-mail enviado via Netlify Functions');
            return true;
          }
        } catch (fallbackError) {
          console.error('❌ FALLBACK - Erro no fallback Netlify:', fallbackError);
          
          // Segundo fallback via Supabase Edge Functions
          console.log('🔄 GMAIL - Tentando segundo fallback via Supabase Edge Functions...');
          try {
            const supabaseFallback = await sendEmailViaSupabase({ to, subject, html });
            if (supabaseFallback) {
              console.log('✅ FALLBACK - E-mail enviado via Supabase Edge Functions');
              return true;
            }
          } catch (supabaseError) {
            console.error('❌ FALLBACK - Erro no fallback Supabase:', supabaseError);
          }
        }
        
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

// Fallback principal via Netlify Functions (funciona em localhost e produção)
async function sendEmailViaNetlify({ to, subject, html }: { to: string; subject: string; html: string; }): Promise<boolean> {
  try {
    console.log('📧 NETLIFY - Enviando e-mail via Netlify Functions...');
    
    // Detectar ambiente e usar endpoint apropriado
    const isLocal = window.location.hostname === 'localhost';
    const baseUrl = isLocal 
      ? 'https://app.grupoggv.com/.netlify/functions'  // Usar produção mesmo em local para teste
      : 'https://app.grupoggv.com/.netlify/functions'; // Produção
    
    const response = await fetch(`${baseUrl}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Netlify Function error: ${response.status} - ${errorData.error || errorData.message}`);
    }

    const data = await response.json();
    
    if (data?.success) {
      console.log('✅ NETLIFY - E-mail enviado com sucesso:', data.messageId);
      return true;
    }

    throw new Error('Netlify Function retornou falha');

  } catch (error) {
    console.error('❌ NETLIFY - Erro no fallback:', error);
    throw error;
  }
}

// Segundo fallback via Supabase Edge Functions
async function sendEmailViaSupabase({ to, subject, html }: { to: string; subject: string; html: string; }): Promise<boolean> {
  try {
    console.log('📧 SUPABASE - Enviando e-mail via Edge Functions...');
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html }
    });

    if (error) {
      console.error('❌ SUPABASE - Erro na Edge Function:', error);
      throw new Error(`Supabase Edge Function error: ${error.message}`);
    }

    if (data?.success) {
      console.log('✅ SUPABASE - E-mail enviado com sucesso:', data.messageId);
      return true;
    }

    throw new Error('Supabase Edge Function retornou falha');

  } catch (error) {
    console.error('❌ SUPABASE - Erro no fallback:', error);
    throw error;
  }
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


