import { supabase } from './supabaseClient';
import { getAppSetting } from './supabaseService';

let gisLoaded = false;
let tokenClient: any = null;
let cachedAccessToken: string | null = null;

async function getGoogleClientId(): Promise<string> {
  // 1) Tentar buscar do Supabase primeiro
  try {
    const v = await getAppSetting('GOOGLE_OAUTH_CLIENT_ID');
    if (typeof v === 'string' && v.trim()) {
      console.log('✅ GMAIL - Client ID obtido do Supabase');
      return v.trim();
    }
  } catch (error) {
    console.warn('⚠️ GMAIL - Erro ao buscar Client ID do Supabase:', error);
  }

  // 2) Tentar buscar de configuração local/global
  const local: any = (globalThis as any).APP_CONFIG_LOCAL;
  const localId = local?.GOOGLE_OAUTH_CLIENT_ID;
  if (localId && typeof localId === 'string' && localId.trim()) {
    console.log('✅ GMAIL - Client ID obtido de configuração local');
    return localId.trim();
  }

  // 3) Tentar buscar de variáveis de ambiente (Vite)
  const envId = import.meta.env?.VITE_GMAIL_CLIENT_ID;
  if (envId && typeof envId === 'string' && envId.trim()) {
    console.log('✅ GMAIL - Client ID obtido de variável de ambiente');
    return envId.trim();
  }

  // 4) Fallback para Client ID hardcoded (apenas para produção específica)
  const isProduction = window.location.hostname === 'app.grupoggv.com';
  if (isProduction) {
    // 🚨 ATENÇÃO: Este Client ID deve estar configurado no Google Cloud Console
    // para o domínio app.grupoggv.com com scopes gmail.send e gmail.compose
    const productionClientId = '1048970542386-8u3v6p7c2s8l5q9k1m0n2b4x7y6z3a5w.apps.googleusercontent.com';
    console.log('🔧 GMAIL - Usando Client ID de produção (fallback)');
    console.log('⚠️ GMAIL - IMPORTANTE: Verificar se este Client ID está configurado corretamente no Google Console');
    console.log('🔗 GMAIL - Console: https://console.cloud.google.com/apis/credentials');
    return productionClientId;
  }

  console.error('❌ GMAIL - Nenhuma configuração de Client ID encontrada');
  throw new Error('GOOGLE_OAUTH_CLIENT_ID não configurado. Verifique as configurações do Supabase ou variáveis de ambiente.');
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
      console.log('🔍 GMAIL - Verificando sessão do Supabase:', {
        provider: session.user.app_metadata?.provider,
        hasProviderToken: !!(session as any).provider_token,
        hasProviderAccessToken: !!(session as any).provider_access_token,
        hasAccessToken: !!(session as any).access_token
      });
      
      const anySess: any = session as any;
      // Tentar múltiplos campos onde o token pode estar
      const prov = (anySess?.provider_token as string) || 
                   (anySess?.provider_access_token as string) || 
                   (session?.access_token as string) ||
                   null;
      
      if (prov && session.user.app_metadata?.provider === 'google') {
        console.log('✅ GMAIL - Token do Supabase OAuth encontrado (válido por 100h)');
        console.log('🔑 GMAIL - Tipo de token encontrado:', prov.substring(0, 20) + '...');
        cachedAccessToken = prov;
        
        // Salvar no cache com duração da sessão do Supabase (100h)
        const sessionDurationHours = 100;
        const sessionDurationSeconds = sessionDurationHours * 60 * 60;
        saveTokenToCache(prov, sessionDurationSeconds, 'supabase', session.user.id);
        
        return prov;
      } else if (session.user.app_metadata?.provider !== 'google') {
        console.log('ℹ️ GMAIL - Usuário não logou com Google, será necessário OAuth separado');
      } else if (session.user.app_metadata?.provider === 'google' && !prov) {
        console.log('⚠️ GMAIL - Login com Google detectado, mas token não encontrado na sessão');
        console.log('📋 GMAIL - Campos da sessão disponíveis:', Object.keys(session));
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
  const maxRetries = 3; // Aumentando para 3 tentativas
  
  console.log('📧 GMAIL - Iniciando processo de envio de e-mail...', {
    destinatario: to,
    assunto: subject.substring(0, 50) + '...',
    tamanhoHtml: html.length,
    timestamp: new Date().toISOString()
  });
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`📧 GMAIL - Tentativa ${retryCount + 1} de ${maxRetries + 1}...`);
      
      // Verificar configuração do Client ID antes de tentar obter token
      try {
        const clientId = await getGoogleClientId();
        console.log('✅ GMAIL - Client ID configurado:', clientId.substring(0, 20) + '...');
      } catch (configError) {
        console.error('❌ GMAIL - Erro de configuração:', configError);
        throw new Error(`Configuração Gmail inválida: ${configError instanceof Error ? configError.message : 'Erro desconhecido'}`);
      }
      
      const token = await getAccessToken();
      console.log('✅ GMAIL - Token obtido:', token.substring(0, 20) + '...');
      
      // Testar permissões antes de tentar enviar
      console.log('🔍 GMAIL - Testando permissões...');
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
            console.log('📋 GMAIL - Tipo de token no cache:', cache.source);
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
      
      console.log('✅ GMAIL - Permissões validadas com sucesso');
      
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
      
      console.log('📧 GMAIL - Resposta da API:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        destinatario: to
      });
      
      if (!res.ok) {
        let details = '';
        let errorData = null;
        try { 
          errorData = await res.json(); 
          details = errorData?.error?.message || JSON.stringify(errorData); 
          console.log('❌ GMAIL - Detalhes do erro completo:', errorData);
        } catch (parseError) {
          console.warn('⚠️ GMAIL - Erro ao fazer parse da resposta de erro:', parseError);
        }
        
        // Diagnóstico específico para erro 401
        if (res.status === 401) {
          console.log('🚨 GMAIL - ERRO 401 UNAUTHORIZED - Diagnóstico detalhado:');
          console.log('🔍 GMAIL - Status da sessão do usuário:');
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('📋 GMAIL - Sessão ativa:', !!session);
            console.log('📋 GMAIL - Provider:', session?.user?.app_metadata?.provider);
            console.log('📋 GMAIL - User ID:', session?.user?.id?.substring(0, 8) + '...');
            console.log('📋 GMAIL - Email:', session?.user?.email);
            
            // Verificar se há tokens na sessão
            const sessionAny: any = session;
            const hasProviderToken = !!(sessionAny?.provider_token || sessionAny?.provider_access_token);
            console.log('📋 GMAIL - Tem token de provider:', hasProviderToken);
            
          } catch (sessionError) {
            console.error('❌ GMAIL - Erro ao verificar sessão:', sessionError);
          }
          
          console.log('🔧 GMAIL - Tentando limpar tokens e reautenticar...');
          await clearCachedTokens();
          retryCount++;
          continue;
        }
        
        // Se for erro de permissão (403), tentar reautenticar
        if (res.status === 403 && (details.includes('insufficient authentication scopes') || details.includes('insufficient permissions'))) {
          console.log('🔄 GMAIL - Erro de permissão 403, tentando reautenticar...');
          await clearCachedTokens();
          retryCount++;
          continue;
        }
        
        // Para outros erros de autorização, também tentar reautenticar
        if ([401, 403].includes(res.status)) {
          console.log(`🔄 GMAIL - Erro de autorização ${res.status}, tentando reautenticar...`);
          await clearCachedTokens();
          retryCount++;
          continue;
        }
        
        throw new Error(`Gmail API falhou: ${res.status} ${res.statusText}${details ? ' - ' + details : ''}`);
      }
      
      // Obter detalhes da resposta de sucesso
      let responseData = null;
      try {
        responseData = await res.json();
        console.log('✅ GMAIL - Resposta de sucesso completa:', responseData);
        console.log('📧 GMAIL - Message ID:', responseData?.id);
        console.log('📧 GMAIL - Thread ID:', responseData?.threadId);
      } catch (e) {
        console.warn('⚠️ GMAIL - Não foi possível ler resposta JSON:', e);
      }
      
      console.log('✅ GMAIL - E-mail enviado com sucesso para:', to);
      return true;
      
    } catch (error) {
      console.error(`❌ GMAIL - Erro na tentativa ${retryCount + 1}:`, error);
      
      if (retryCount >= maxRetries) {
        // Executar diagnóstico completo antes de falhar
        console.log('🩺 GMAIL - Executando diagnóstico final...');
        try {
          await diagnoseGmailIssue();
        } catch (diagError) {
          console.warn('⚠️ GMAIL - Erro no diagnóstico:', diagError);
        }
        
        // Se for erro de permissão, fornecer instruções específicas
        if (error instanceof Error && (error.message.includes('insufficient authentication scopes') || error.message.includes('insufficient permissions'))) {
          throw new Error('🔐 Gmail API: Permissões insuficientes. Clique no botão "Reautenticar" abaixo ou faça logout e login novamente para conceder permissões de envio de e-mail.');
        }
        
        // Se for erro de configuração
        if (error instanceof Error && error.message.includes('GOOGLE_OAUTH_CLIENT_ID')) {
          throw new Error('⚙️ Gmail API: Configuração não encontrada. Entre em contato com o suporte técnico.');
        }
        
        // Se for erro de rede/timeout
        if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout'))) {
          throw new Error('🌐 Gmail API: Problema de conexão. Verifique sua internet e tente novamente.');
        }
        
        // Erro genérico mais informativo
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        throw new Error(`📧 Gmail API: Não foi possível enviar o e-mail após 3 tentativas. Erro: ${errorMsg}. Tente reautenticar clicando no botão abaixo.`);
      }
      
      // Limpar tokens e tentar novamente
      await clearCachedTokens();
      retryCount++;
    }
  }
  
  // Este ponto nunca deveria ser alcançado, mas mantemos como fallback
  throw new Error('📧 Gmail API: Sistema de retry falhou. Tente reautenticar ou entre em contato com o suporte.');
}



// Função para forçar reautenticação
export async function forceGmailReauth(): Promise<void> {
  console.log('🔄 GMAIL - Iniciando reautenticação OAuth forçada...');
  
  // Limpar cache
  await clearCachedTokens();
  
  try {
    // Forçar novo OAuth com scopes corretos
    const clientId = await getGoogleClientId();
    await ensureGis();
    
    return new Promise((resolve, reject) => {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose',
        prompt: 'consent', // Força tela de consentimento
        callback: (response: any) => {
          if (response.access_token) {
            console.log('✅ GMAIL - Novo token OAuth obtido com sucesso');
            cachedAccessToken = response.access_token;
            saveTokenToCache(response.access_token, 3600, 'oauth');
            resolve();
          } else {
            console.error('❌ GMAIL - Falha na reautenticação OAuth:', response);
            reject(new Error('Falha na reautenticação OAuth'));
          }
        },
        error_callback: (error: any) => {
          console.error('❌ GMAIL - Erro na reautenticação OAuth:', error);
          reject(new Error(`Erro OAuth: ${error.type || 'desconhecido'}`));
        }
      });
      
      console.log('🚀 GMAIL - Solicitando token OAuth...');
      tokenClient.requestAccessToken();
    });
    
  } catch (error) {
    console.error('❌ GMAIL - Erro na configuração da reautenticação:', error);
    throw error;
  }
}

// Função para verificar se o Gmail está configurado
export async function checkGmailSetup(): Promise<{ configured: boolean; error?: string; details?: any }> {
  try {
    console.log('🔍 GMAIL - Verificando configuração completa...');
    
    const clientId = await getGoogleClientId();
    console.log('✅ GMAIL - Client ID encontrado:', clientId.substring(0, 20) + '...');
    
    // Verificar se o Google Identity Services pode ser carregado
    await ensureGis();
    console.log('✅ GMAIL - Google Identity Services carregado');
    
    // Verificar sessão do usuário
    const { data: { session } } = await supabase.auth.getSession();
    const isGoogleUser = session?.user?.app_metadata?.provider === 'google';
    
    const details = {
      clientId: clientId.substring(0, 20) + '...',
      gisLoaded: true,
      hasSession: !!session,
      isGoogleUser,
      userEmail: session?.user?.email,
      hostname: window.location.hostname,
      isProduction: window.location.hostname === 'app.grupoggv.com'
    };
    
    console.log('📋 GMAIL - Configuração detalhada:', details);
    
    return { configured: true, details };
  } catch (error) {
    console.error('❌ GMAIL - Erro na verificação de configuração:', error);
    return { 
      configured: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      details: {
        hostname: window.location.hostname,
        isProduction: window.location.hostname === 'app.grupoggv.com'
      }
    };
  }
}

// Função para diagnóstico completo do Gmail
export async function diagnoseGmailIssue(): Promise<void> {
  console.log('🩺 GMAIL - DIAGNÓSTICO COMPLETO INICIADO');
  console.log('=' .repeat(50));
  
  // 1. Verificar configuração
  console.log('1️⃣ VERIFICANDO CONFIGURAÇÃO...');
  const setup = await checkGmailSetup();
  console.log('Configuração:', setup);
  
  // 2. Verificar sessão do usuário
  console.log('2️⃣ VERIFICANDO SESSÃO...');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Sessão ativa:', !!session);
    if (session) {
      console.log('Provider:', session.user?.app_metadata?.provider);
      console.log('Email:', session.user?.email);
      console.log('User ID:', session.user?.id?.substring(0, 8) + '...');
      
      // Verificar tokens na sessão
      const sessionAny: any = session;
      const providerToken = sessionAny?.provider_token || sessionAny?.provider_access_token;
      console.log('Tem provider token:', !!providerToken);
      if (providerToken) {
        console.log('Provider token (início):', providerToken.substring(0, 20) + '...');
      }
    }
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
  }
  
  // 3. Verificar cache de tokens
  console.log('3️⃣ VERIFICANDO CACHE...');
  const cachedToken = await getTokenFromCache();
  console.log('Token em cache:', !!cachedToken);
  if (cachedToken) {
    console.log('Token cache (início):', cachedToken.substring(0, 20) + '...');
  }
  
  // 4. Testar obtenção de token
  console.log('4️⃣ TESTANDO OBTENÇÃO DE TOKEN...');
  try {
    const token = await getAccessToken();
    console.log('✅ Token obtido com sucesso:', token.substring(0, 20) + '...');
    
    // 5. Testar permissões
    console.log('5️⃣ TESTANDO PERMISSÕES...');
    const hasPermissions = await testGmailPermissions(token);
    console.log('Permissões válidas:', hasPermissions);
    
  } catch (error) {
    console.error('❌ Erro ao obter token:', error);
  }
  
  console.log('=' .repeat(50));
  console.log('🩺 GMAIL - DIAGNÓSTICO COMPLETO FINALIZADO');
}


