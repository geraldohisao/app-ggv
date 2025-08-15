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
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'));
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
  const scopes = 'https://www.googleapis.com/auth/gmail.send';
  const google: any = (window as any).google;
  if (!google?.accounts?.oauth2) throw new Error('Google Identity Services indisponível');
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: scopes, prompt: '', callback: () => {} });
  }

  const tryRequest = (promptMode: '' | 'consent'): Promise<string> => new Promise((resolve, reject) => {
    let finished = false;
    const timeout = window.setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error('Timeout ao obter token do Google'));
      }
    }, 8000);
    tokenClient.callback = (resp: any) => {
      if (finished) return;
      window.clearTimeout(timeout);
      finished = true;
      if (resp?.access_token) return resolve(resp.access_token);
      reject(new Error(resp?.error || 'Falha ao obter token do Google'));
    };
    try { tokenClient.requestAccessToken({ prompt: promptMode }); } catch (e) { window.clearTimeout(timeout); reject(e); }
  });

  // 1) Tenta silencioso; 2) se falhar/timeout, abre consent
  let token: string;
  try {
    token = await tryRequest('');
  } catch {
    token = await tryRequest('consent');
  }
  cachedAccessToken = token;
  return token;
}

export async function sendEmailViaGmail({ to, subject, html }: { to: string; subject: string; html: string; }): Promise<boolean> {
  const token = await getAccessToken();
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
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    let details = '';
    try { const j = await res.json(); details = j?.error?.message || JSON.stringify(j); } catch {}
    throw new Error(`Gmail API falhou: ${res.status} ${res.statusText}${details ? ' - ' + details : ''}`);
  }
  return true;
}


