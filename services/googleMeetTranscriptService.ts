/**
 * Google Meet Transcript Service
 * Busca transcrições de reuniões do Google Meet no Google Drive/Docs
 */

import { supabase } from './supabaseClient';
import { getAppSetting } from './supabaseService';

// ============================================
// TYPES
// ============================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface TranscriptSearchResult {
  files: DriveFile[];
  hasMore: boolean;
}

export interface TranscriptContent {
  fileId: string;
  fileName: string;
  content: string;
  webViewLink: string;
}

export interface TranscriptImport {
  id?: string;
  sprint_id: string;
  checkin_id?: string | null;
  calendar_event_id?: string | null;
  drive_file_id: string | null;
  docs_url: string | null;
  source_title: string | null;
  raw_text: string;
  status: 'pending' | 'accepted' | 'rejected';
  decided_by?: string | null;
  decided_at?: string | null;
  rejection_reason?: string | null;
  imported_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// GIS (Google Identity Services) Setup
// ============================================

let gisLoaded = false;
let tokenClient: any = null;

async function getGoogleClientId(): Promise<string> {
  try {
    const v = await getAppSetting('GOOGLE_OAUTH_CLIENT_ID');
    if (typeof v === 'string' && v.trim()) return v.trim();
  } catch (error) {
    console.warn('⚠️ DRIVE - Erro ao buscar Client ID:', error);
  }

  const isProduction = window.location.hostname === 'app.grupoggv.com';
  if (isProduction) {
    return '1048970542386-8u3v6p7c2s8l5q9k1m0n2b4x7y6z3a5w.apps.googleusercontent.com';
  }

  throw new Error('GOOGLE_OAUTH_CLIENT_ID não configurado');
}

async function ensureGis(): Promise<void> {
  if (gisLoaded) return;
  
  if ((window as any).google?.accounts?.oauth2) {
    gisLoaded = true;
    return;
  }
  
  console.log('🔄 DRIVE - Carregando Google Identity Services...');
  
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      gisLoaded = true;
      console.log('✅ DRIVE - Google Identity Services carregado');
      resolve();
    };
    script.onerror = () => reject(new Error('Falha ao carregar GIS'));
    document.head.appendChild(script);
  });
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

const TOKEN_CACHE_KEY = 'ggv_drive_token_cache';
const REFRESH_TOKEN_KEY = 'ggv_drive_refresh_token';

interface TokenCache {
  access_token: string;
  expires_at: number;
  source: 'supabase' | 'oauth';
  refresh_token?: string;
}

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;

function saveTokenToCache(token: string, expiresIn: number = 3600, source: 'supabase' | 'oauth' = 'oauth', refreshToken?: string): void {
  try {
    const cache: TokenCache = {
      access_token: token,
      expires_at: Date.now() + (expiresIn * 1000) - 5 * 60 * 1000,
      source,
      refresh_token: refreshToken
    };
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
    
    // Salvar refresh token separadamente (se fornecido)
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      cachedRefreshToken = refreshToken;
      console.log(`💾 DRIVE - Token e refresh token salvos no cache (${source})`);
    } else {
      console.log(`💾 DRIVE - Token salvo no cache (${source})`);
    }
  } catch (error) {
    console.warn('⚠️ DRIVE - Erro ao salvar token no cache:', error);
  }
}

async function getTokenFromCache(): Promise<string | null> {
  try {
    const cacheStr = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!cacheStr) return null;
    
    const cache: TokenCache = JSON.parse(cacheStr);
    
    if (cache.source === 'supabase') {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.removeItem(TOKEN_CACHE_KEY);
        return null;
      }
      return cache.access_token;
    }
    
    // Verificar se token expirou
    if (Date.now() < cache.expires_at) {
      console.log(`💾 DRIVE - Token ${cache.source} válido encontrado no cache`);
      // Restaurar refresh token também
      if (cache.refresh_token) {
        cachedRefreshToken = cache.refresh_token;
      }
      return cache.access_token;
    } else {
      // Token expirado - tentar renovar com refresh token
      const refreshToken = cache.refresh_token || localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        console.log('🔄 DRIVE - Token expirado, tentando renovar com refresh token...');
        const newToken = await refreshAccessToken(refreshToken);
        if (newToken) {
          return newToken;
        }
      }
      
      localStorage.removeItem(TOKEN_CACHE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return null;
    }
  } catch (error) {
    console.warn('⚠️ DRIVE - Erro ao ler token do cache:', error);
    localStorage.removeItem(TOKEN_CACHE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return null;
  }
}

/**
 * Renova access token usando refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    // NOTE: Refresh token exchange in the browser can fail for Web client types
    // because Google requires client_secret for the token endpoint.
    // We'll avoid this path and fall back to GIS token flow instead.
    return null;
  } catch (error) {
    console.error('❌ DRIVE - Erro ao renovar token:', error);
    return null;
  }
}

async function getAccessTokenViaGis(scopes: string): Promise<string> {
  await ensureGis();
  const clientId = await getGoogleClientId();
  const google: any = (window as any).google;
  if (!google?.accounts?.oauth2) {
    throw new Error('Google Identity Services indisponível');
  }

  const requestOnce = (prompt: '' | 'consent') => new Promise<any>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes,
      callback: (resp: any) => resolve(resp),
      error_callback: (err: any) => reject(err),
    });
    try {
      client.requestAccessToken({ prompt });
    } catch (e) {
      reject(e);
    }
  });

  let resp: any;
  try {
    resp = await requestOnce('');
  } catch (e) {
    resp = null;
  }
  if (resp?.error) {
    // Retry with consent if required
    resp = await requestOnce('consent');
  }

  if (!resp?.access_token) {
    throw new Error(resp?.error_description || resp?.error || 'Falha ao obter token do Google');
  }

  cachedAccessToken = resp.access_token;
  // Token client doesn't provide refresh token; cache for short time.
  saveTokenToCache(resp.access_token, resp.expires_in || 3600, 'oauth');
  return resp.access_token;
}

/**
 * Obtém access token para Google Drive API
 */
export async function getDriveAccessToken(): Promise<string> {
  // 1) Verificar cache em memória
  if (cachedAccessToken) {
    console.log('🔄 DRIVE - Usando token da memória');
    return cachedAccessToken;
  }
  
  // 2) Verificar cache persistente
  const cachedToken = await getTokenFromCache();
  if (cachedToken) {
    cachedAccessToken = cachedToken;
    return cachedToken;
  }
  
  // 3) Obter token do Supabase
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session && session.user) {
      const anySess: any = session;
      const providerToken = anySess?.provider_token || anySess?.provider_access_token;
      
      if (providerToken && session.user.app_metadata?.provider === 'google') {
        console.log('✅ DRIVE - Token do Supabase OAuth encontrado');
        cachedAccessToken = providerToken;
        saveTokenToCache(providerToken, 100 * 60 * 60, 'supabase');
        return providerToken;
      }
    }
  } catch (error) {
    console.warn('⚠️ DRIVE - Erro ao obter token do Supabase:', error);
  }

  // 4) Fallback: Use GIS token flow (no client_secret required)
  console.log('🔄 DRIVE - Token do Supabase não disponível, usando GIS token flow...');
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
    // Required for creating/updating calendar events with Meet
    'https://www.googleapis.com/auth/calendar.events'
  ].join(' ');
  const token = await getAccessTokenViaGis(scopes);
  return token;
}

/**
 * Testa se o token tem permissões de Drive
 */
export async function testDrivePermissions(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================
// GOOGLE DRIVE API
// ============================================

/**
 * Busca transcrições de reuniões no Google Drive
 * Transcrições do Meet são salvas como Google Docs com padrão de nome específico
 */
export async function searchMeetTranscripts(
  query?: string,
  maxResults: number = 50,
  daysBack: number = 180,
  strictTranscriptFilter: boolean = false
): Promise<TranscriptSearchResult> {
  try {
    console.log('🔍 DRIVE - Buscando transcrições do Meet...');
    
    const token = await getDriveAccessToken();
    
    // Data limite (últimos X dias)
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - daysBack);
    const dateString = dateLimit.toISOString();
    
    // Buscar arquivos do Google Docs
    let searchQuery = `mimeType='application/vnd.google-apps.document' and modifiedTime > '${dateString}'`;
    
    if (query) {
      // Se tem query, buscar no nome E no conteúdo
      searchQuery += ` and (name contains '${query}' or fullText contains '${query}')`;
    }
    
    // Filtro para transcrições - agora mais amplo
    // Inclui padrões do Google Meet e outros serviços comuns
    if (strictTranscriptFilter) {
      // Modo estrito: apenas transcrições oficiais do Meet
      searchQuery += ` and (name contains 'Transcript' or name contains 'Transcrição' or name contains 'transcript')`;
    } else {
      // Modo flexível: inclui Sprint, reunião, meeting, notes, ata, planejamento, OKR, etc
      searchQuery += ` and (name contains 'Transcript' or name contains 'Transcrição' or name contains 'transcript' or name contains 'Sprint' or name contains 'sprint' or name contains 'reunião' or name contains 'Reunião' or name contains 'meeting' or name contains 'Meeting' or name contains 'notes' or name contains 'ata' or name contains 'Ata' or name contains 'check-in' or name contains 'Check-in' or name contains 'checkin' or name contains 'planejamento' or name contains 'Planejamento' or name contains 'OKR' or name contains 'okr' or name contains 'planning' or name contains 'Planning')`;
    }
    
    // Primeira busca: arquivos recentes com padrão de transcrição
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('fields', 'files(id,name,mimeType,createdTime,modifiedTime,webViewLink,parents,description),nextPageToken');
    url.searchParams.set('pageSize', maxResults.toString());
    url.searchParams.set('orderBy', 'modifiedTime desc'); // Mais recentes primeiro
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    url.searchParams.set('supportsAllDrives', 'true');
    
    console.log('🔍 DRIVE - Query:', searchQuery);
    console.log('🔍 DRIVE - Buscando últimos', daysBack, 'dias');
    
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.error?.message || `Erro ${res.status}`);
    }
    
    const data = await res.json();
    const files = data.files || [];
    
    // Filtrar e ordenar por relevância
    const sortedFiles = files.sort((a: DriveFile, b: DriveFile) => {
      // Priorizar arquivos que têm "Transcript" exatamente (Google Meet oficial)
      const aIsOfficial = a.name.toLowerCase().includes('transcript') || a.name.toLowerCase().includes('transcrição');
      const bIsOfficial = b.name.toLowerCase().includes('transcript') || b.name.toLowerCase().includes('transcrição');
      
      if (aIsOfficial && !bIsOfficial) return -1;
      if (!aIsOfficial && bIsOfficial) return 1;
      
      // Depois por data de modificação (mais recente primeiro)
      return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
    });
    
    console.log(`✅ DRIVE - Encontrados ${sortedFiles.length} arquivos (últimos ${daysBack} dias)`);
    
    if (sortedFiles.length === 0) {
      console.log('💡 DRIVE - Dica: Verifique se:');
      console.log('   1. Transcrições estão habilitadas no Google Meet');
      console.log('   2. Reuniões foram gravadas nos últimos', daysBack, 'dias');
      console.log('   3. Você tem acesso às transcrições no Drive');
    }
    
    return {
      files: sortedFiles,
      hasMore: !!data.nextPageToken
    };
  } catch (error) {
    console.error('❌ DRIVE - Erro ao buscar transcrições:', error);
    throw error;
  }
}

/**
 * Busca transcrições por data (útil para encontrar transcrição de uma reunião específica)
 */
export async function searchTranscriptsByDate(
  date: Date,
  titleContains?: string
): Promise<TranscriptSearchResult> {
  try {
    const token = await getDriveAccessToken();
    
    // Buscar arquivos criados próximos à data especificada
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    let searchQuery = `mimeType='application/vnd.google-apps.document' and createdTime >= '${startDate.toISOString()}' and createdTime <= '${endDate.toISOString()}'`;
    
    if (titleContains) {
      searchQuery += ` and name contains '${titleContains}'`;
    }
    
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('fields', 'files(id,name,mimeType,createdTime,modifiedTime,webViewLink)');
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('orderBy', 'createdTime desc');
    
    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      throw new Error(`Erro ao buscar: ${res.status}`);
    }
    
    const data = await res.json();
    return {
      files: data.files || [],
      hasMore: false
    };
  } catch (error) {
    console.error('❌ DRIVE - Erro ao buscar por data:', error);
    throw error;
  }
}

/**
 * Obtém o conteúdo de texto de um Google Docs
 */
export async function getDocumentContent(fileId: string): Promise<TranscriptContent> {
  try {
    console.log('📄 DOCS - Obtendo conteúdo do documento...', fileId);
    
    const token = await getDriveAccessToken();
    
    // Primeiro, obter metadados do arquivo
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,webViewLink`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (!metaRes.ok) {
      throw new Error('Não foi possível acessar o arquivo');
    }
    
    const metadata = await metaRes.json();
    
    // Exportar conteúdo como texto plano
    const contentRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (!contentRes.ok) {
      throw new Error('Não foi possível exportar o conteúdo');
    }
    
    const content = await contentRes.text();
    console.log('✅ DOCS - Conteúdo obtido:', content.length, 'caracteres');
    
    return {
      fileId,
      fileName: metadata.name,
      content,
      webViewLink: metadata.webViewLink || `https://docs.google.com/document/d/${fileId}/view`
    };
  } catch (error) {
    console.error('❌ DOCS - Erro ao obter conteúdo:', error);
    throw error;
  }
}

// ============================================
// SUPABASE INTEGRATION
// ============================================

/**
 * Salva importação de transcrição no Supabase
 */
export async function saveTranscriptImport(
  sprintId: string,
  transcript: TranscriptContent,
  calendarEventId?: string
): Promise<TranscriptImport | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    const importData: Partial<TranscriptImport> = {
      sprint_id: sprintId,
      calendar_event_id: calendarEventId || null,
      drive_file_id: transcript.fileId,
      docs_url: transcript.webViewLink,
      source_title: transcript.fileName,
      raw_text: transcript.content,
      status: 'pending',
      imported_by: userData.user.id
    };

    const { data, error } = await supabase
      .from('sprint_transcript_imports')
      .insert(importData)
      .select()
      .single();

    if (error) throw error;
    
    console.log('✅ TRANSCRIPT - Import salvo:', data.id);
    return data;
  } catch (error) {
    console.error('❌ TRANSCRIPT - Erro ao salvar import:', error);
    return null;
  }
}

/**
 * Busca importações pendentes de uma sprint
 */
export async function getPendingTranscriptImports(sprintId: string): Promise<TranscriptImport[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_transcript_imports')
      .select('*')
      .eq('sprint_id', sprintId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ TRANSCRIPT - Erro ao buscar pendentes:', error);
    return [];
  }
}

/**
 * Aceita uma transcrição importada
 */
export async function acceptTranscriptImport(
  importId: string,
  checkinId?: string
): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('sprint_transcript_imports')
      .update({
        status: 'accepted',
        checkin_id: checkinId || null,
        decided_by: userData.user.id,
        decided_at: new Date().toISOString()
      })
      .eq('id', importId);

    if (error) throw error;
    
    console.log('✅ TRANSCRIPT - Import aceito:', importId);
    return true;
  } catch (error) {
    console.error('❌ TRANSCRIPT - Erro ao aceitar:', error);
    return false;
  }
}

/**
 * Rejeita uma transcrição importada
 */
export async function rejectTranscriptImport(
  importId: string,
  reason?: string
): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('sprint_transcript_imports')
      .update({
        status: 'rejected',
        decided_by: userData.user.id,
        decided_at: new Date().toISOString(),
        rejection_reason: reason || null
      })
      .eq('id', importId);

    if (error) throw error;
    
    console.log('✅ TRANSCRIPT - Import rejeitado:', importId);
    return true;
  } catch (error) {
    console.error('❌ TRANSCRIPT - Erro ao rejeitar:', error);
    return false;
  }
}

/**
 * Busca histórico de importações de uma sprint
 */
export async function getTranscriptImportHistory(sprintId: string): Promise<TranscriptImport[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_transcript_imports')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ TRANSCRIPT - Erro ao buscar histórico:', error);
    return [];
  }
}
