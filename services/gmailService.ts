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
  
  // Verificar se já existe globalmente
  if ((window as any).google?.accounts?.oauth2) {
    console.log('✅ GMAIL - Google Identity Services já disponível');
    gisLoaded = true;
    return;
  }
  
  console.log('🔄 GMAIL - Carregando Google Identity Services...');
  
  // Remover scripts antigos que podem estar corrompidos
  const existingScripts = document.querySelectorAll('script[src*="gsi/client"]');
  existingScripts.forEach(script => {
    console.log('🧹 GMAIL - Removendo script antigo');
    script.remove();
  });
  
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = false; // Carregar de forma síncrona para evitar problemas
    script.defer = false;
    
    let resolved = false;
    
    const cleanup = () => {
      if (resolved) return;
      resolved = true;
    };
    
    const checkGoogle = () => {
      if ((window as any).google?.accounts?.oauth2) {
        cleanup();
        console.log('✅ GMAIL - Google Identity Services carregado com sucesso');
        resolve();
        return true;
      }
      return false;
    };
    
    // Timeout mais longo para dar tempo ao script carregar
    const timeout = setTimeout(() => {
      if (resolved) return;
      console.error('⏰ GMAIL - Timeout ao carregar Google Identity Services');
      
      // Verificar uma última vez se carregou
      if (!checkGoogle()) {
        cleanup();
        reject(new Error('Timeout ao carregar Google Identity Services após 20 segundos'));
      }
    }, 20000);
    
    script.onload = () => {
      console.log('📦 GMAIL - Script carregado, aguardando inicialização...');
      
      // Aguardar inicialização com polling
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos total
      
      const pollForGoogle = () => {
        attempts++;
        
        if (checkGoogle()) {
          clearTimeout(timeout);
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(pollForGoogle, 100);
        } else {
          cleanup();
          clearTimeout(timeout);
          console.error('❌ GMAIL - Google não inicializou após carregamento do script');
          reject(new Error('Google Identity Services não inicializou após carregamento'));
        }
      };
      
      setTimeout(pollForGoogle, 100);
    };
    
    script.onerror = (error) => {
      cleanup();
      clearTimeout(timeout);
      console.error('❌ GMAIL - Erro ao carregar script:', error);
      reject(new Error('Falha ao carregar script do Google Identity Services'));
    };
    
    try {
      document.head.appendChild(script);
      console.log('📦 GMAIL - Script adicionado ao DOM');
    } catch (error) {
      cleanup();
      clearTimeout(timeout);
      console.error('❌ GMAIL - Erro ao adicionar script ao DOM:', error);
      reject(new Error('Erro ao adicionar script ao DOM'));
    }
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

// Cache persistente de tokens
const TOKEN_CACHE_KEY = 'ggv_gmail_token_cache';
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutos de buffer
const SUPABASE_SESSION_DURATION = 100 * 60 * 60 * 1000; // 100 horas em ms

interface TokenCache {
  access_token: string;
  expires_at: number;
  scope?: string;
  refresh_token?: string;
  source: 'supabase' | 'oauth' | 'manual';
  session_id?: string;
}

function saveTokenToCache(token: string, expiresIn: number = 3600, source: 'supabase' | 'oauth' | 'manual' = 'oauth', sessionId?: string): void {
  try {
    const cache: TokenCache = {
      access_token: token,
      expires_at: Date.now() + (expiresIn * 1000) - TOKEN_EXPIRY_BUFFER,
      scope: 'gmail.send gmail.compose',
      source,
      session_id: sessionId
    };
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
    console.log(`💾 GMAIL - Token salvo no cache (${source}, válido por ${Math.round(expiresIn/3600)}h)`);
  } catch (error) {
    console.warn('⚠️ GMAIL - Erro ao salvar token no cache:', error);
  }
}

async function getTokenFromCache(): Promise<string | null> {
  try {
    const cacheStr = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!cacheStr) return null;
    
    const cache: TokenCache = JSON.parse(cacheStr);
    
    // Se o token é do Supabase, verificar se a sessão ainda é válida
    if (cache.source === 'supabase' && cache.session_id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.id !== cache.session_id) {
          console.log('🔄 GMAIL - Sessão do Supabase mudou, removendo token antigo...');
          localStorage.removeItem(TOKEN_CACHE_KEY);
          return null;
        }
        // Se sessão é válida, token do Supabase é válido independente do tempo
        console.log('💾 GMAIL - Token do Supabase válido (baseado na sessão ativa)');
        return cache.access_token;
      } catch (error) {
        console.warn('⚠️ GMAIL - Erro ao verificar sessão do Supabase:', error);
      }
    }
    
    // Para tokens OAuth temporários, verificar expiração normal
    if (Date.now() < cache.expires_at) {
      console.log(`💾 GMAIL - Token ${cache.source} válido encontrado no cache`);
      return cache.access_token;
    } else {
      console.log(`⏰ GMAIL - Token ${cache.source} no cache expirou, removendo...`);
      localStorage.removeItem(TOKEN_CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.warn('⚠️ GMAIL - Erro ao ler token do cache:', error);
    localStorage.removeItem(TOKEN_CACHE_KEY);
    return null;
  }
}

async function clearCachedTokens(): Promise<void> {
  cachedAccessToken = null;
  tokenClient = null;
  
  // Limpar cache persistente
  try {
    localStorage.removeItem(TOKEN_CACHE_KEY);
    localStorage.removeItem('gmail_access_token');
    sessionStorage.removeItem('gmail_access_token');
  } catch {}
  
  console.log('🧹 GMAIL - Tokens cacheados limpos');
}

async function getAccessToken(): Promise<string> {
  // 1) Verificar cache em memória primeiro
  if (cachedAccessToken) {
    console.log('🔄 GMAIL - Usando token da memória');
    return cachedAccessToken;
  }
  
  // 2) Verificar cache persistente
  const cachedToken = await getTokenFromCache();
  if (cachedToken) {
    cachedAccessToken = cachedToken;
    return cachedToken;
  }
  
  // 3) PRIORIDADE: Token do Supabase (válido enquanto usuário estiver logado - 100h)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const anySess: any = session as any;
      const prov = (anySess?.provider_token as string) || (anySess?.provider_access_token as string) || null;
      
      if (prov && session.user.app_metadata?.provider === 'google') {
        console.log('✅ GMAIL - Token do Supabase OAuth encontrado (válido por 100h)');
        cachedAccessToken = prov;
        
        // Salvar no cache com duração da sessão do Supabase (100h)
        const sessionDurationHours = 100;
        const sessionDurationSeconds = sessionDurationHours * 60 * 60;
        saveTokenToCache(prov, sessionDurationSeconds, 'supabase', session.user.id);
        
        return prov;
      } else if (session.user.app_metadata?.provider !== 'google') {
        console.log('ℹ️ GMAIL - Usuário não logou com Google, será necessário OAuth separado');
      }
    }
  } catch (error) {
    console.warn('⚠️ GMAIL - Erro ao obter token do Supabase:', error);
  }

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
  // Salvar token OAuth temporário no cache (1 hora)
  saveTokenToCache(token, 3600, 'oauth');
  console.log('✅ GMAIL - Token OAuth temporário obtido e salvo no cache (1h)');
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
        console.log('⚠️ GMAIL - Token inválido ou permissões insuficientes');
        
        // Verificar se era um token do Supabase
        const cacheStr = localStorage.getItem(TOKEN_CACHE_KEY);
        let wasSupabaseToken = false;
        if (cacheStr) {
          try {
            const cache: TokenCache = JSON.parse(cacheStr);
            wasSupabaseToken = cache.source === 'supabase';
          } catch {}
        }
        
        // Limpar cache em memória
        cachedAccessToken = null;
        
        if (wasSupabaseToken) {
          console.log('🔄 GMAIL - Token do Supabase inválido, tentando obter novo...');
          // Para tokens do Supabase, limpar cache e tentar obter novo token da sessão
          localStorage.removeItem(TOKEN_CACHE_KEY);
        } else {
          console.log('🔄 GMAIL - Token OAuth temporário inválido, tentando reautenticar...');
        }
        
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


