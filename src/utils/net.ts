import { sanitizeErrorData, logSensitiveDataAttempt } from './sanitizeErrorData';
import { generateIncidentHash } from './incidentGrouping';

export type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number; // number of retries after the first attempt (idempotent only)
  retryBackoffMs?: number; // base backoff
};

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 5000, retries = 0, retryBackoffMs = 400, ...init } = options;

  const attempt = async (attemptIndex: number): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      if (!res.ok && attemptIndex < retries) {
        // Quick exponential backoff for transient errors
        const delay = retryBackoffMs * Math.pow(2, attemptIndex) + Math.round(Math.random() * 150);
        await new Promise(r => setTimeout(r, delay));
        return attempt(attemptIndex + 1);
      }
      return res;
    } catch (err: any) {
      if ((err?.name === 'AbortError' || String(err?.message || '').includes('timeout')) && attemptIndex < retries) {
        const delay = retryBackoffMs * Math.pow(2, attemptIndex) + Math.round(Math.random() * 150);
        await new Promise(r => setTimeout(r, delay));
        return attempt(attemptIndex + 1);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  return attempt(0);
}

export async function postCriticalAlert(payload: {
  title: string;
  message: string;
  context?: any;
}) {
  try {
    // Sanitizar dados antes do processamento
    const originalPayload = { ...payload };
    const sanitizedPayload = {
      title: payload.title,
      message: payload.message,
      context: sanitizeErrorData({
        title: payload.title,
        message: payload.message,
        stack: payload.context?.stack || '',
        context: payload.context,
        url: payload.context?.url || '',
        user: payload.context?.user
      }).context
    };
    
    // Log de segurança se dados foram sanitizados
    if (JSON.stringify(originalPayload) !== JSON.stringify(sanitizedPayload)) {
      logSensitiveDataAttempt(originalPayload, sanitizedPayload, 'postCriticalAlert');
    }
    
    // Gerar hash de incidente robusto
    const incidentHash = generateIncidentHash({
      title: sanitizedPayload.title,
      message: sanitizedPayload.message,
      stack: sanitizedPayload.context?.stack || '',
      url: sanitizedPayload.context?.url || '',
      context: sanitizedPayload.context
    });
    
    // Deduplication and rate limiting to avoid flooding Chat
    const now = Date.now();
    const keySource = `${sanitizedPayload.title}|${sanitizedPayload.message}|${incidentHash}`;
    let key = keySource;
    try {
      key = btoa(unescape(encodeURIComponent(keySource))).slice(0, 100);
    } catch {}
    const windowMs = 60_000; // 1 minute window
    const maxPerWindow = 3;
    const storeKey = `crit-alert:${key}`;
    const raw = sessionStorage.getItem(storeKey);
    let info: { count: number; windowStart: number } = raw ? JSON.parse(raw) : { count: 0, windowStart: now };
    if (now - info.windowStart > windowMs) {
      info = { count: 0, windowStart: now };
    }
    if (info.count >= maxPerWindow) {
      return; // drop excessive alerts
    }
    info.count += 1;
    sessionStorage.setItem(storeKey, JSON.stringify(info));

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    let endpoint = '/api/alert';
    if (isLocalhost && typeof window !== 'undefined' && window.location.port !== '8888') {
      endpoint = 'http://localhost:8888/.netlify/functions/alert';
    }
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sanitizedPayload,
        incidentHash, // Adicionar hash do incidente
        context: {
          ...(sanitizedPayload.context || {}),
          // Always attach minimal environment info
          href: typeof window !== 'undefined' ? window.location.href : '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: typeof navigator !== 'undefined' ? navigator.language : '',
          appVersion: (typeof window !== 'undefined' && (window as any).__APP_VERSION__) || '',
        }
      })
    }).catch(() => {});
  } catch {}
}

type CriticalFetchOptions = {
  enable?: boolean;
  urlPatterns?: (string | RegExp)[];
  minStatusToAlert?: number; // e.g., 500
};

function getStoredUserSafe(): { name?: string; email?: string; role?: string } | undefined {
  try {
    // Prefer session saved by current auth flow
    const rawPrimary = localStorage.getItem('ggv-user') || sessionStorage.getItem('ggv-user');
    const rawEmergency = localStorage.getItem('ggv-emergency-user');
    const raw = rawPrimary || rawEmergency || '';
    if (!raw) return undefined;
    const u = JSON.parse(raw);
    // Normalize common fields
    const name = u?.name || u?.full_name || u?.user_metadata?.name || u?.user?.name;
    const email = u?.email || u?.user_metadata?.email || u?.user?.email;
    const role = u?.role || u?.user_metadata?.role || u?.user?.role;
    return { name, email, role };
  } catch {
    return undefined;
  }
}

export function enableCriticalFetchAlerts(options: CriticalFetchOptions = {}) {
  if (typeof window === 'undefined' || (window as any).__CRIT_FETCH_PATCHED__) return;
  const {
    enable = true,
    minStatusToAlert = 500,
    urlPatterns = [
      '/api/',
      '/.netlify/functions/',
      /https?:\/\/[^/]*supabase\.(?:co|in)\//
    ]
  } = options;

  if (!enable) return;

  const origFetch = window.fetch.bind(window);
  (window as any).__CRIT_FETCH_PATCHED__ = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as any)?.url || String(input);
    const method = (init?.method || (typeof input !== 'string' && (input as Request)?.method) || 'GET').toUpperCase();

    const matchesCritical = () => {
      try {
        return urlPatterns.some(p => typeof p === 'string' ? url.includes(p) : (p as RegExp).test(url));
      } catch {
        return false;
      }
    };

    try {
      const res = await origFetch(input as any, init);
      if (matchesCritical() && res.status >= minStatusToAlert) {
        // clone response safely
        let bodySnippet = '';
        try {
          const text = await res.clone().text();
          bodySnippet = text.slice(0, 500);
        } catch {}
        postCriticalAlert({
          title: `HTTP ${res.status} em ${method}`,
          message: `Falha em requisição crítica` ,
          context: {
            url,
            method,
            status: res.status,
            responsePreview: bodySnippet,
            user: getStoredUserSafe(),
            userAgent: navigator.userAgent,
            appVersion: (window as any).__APP_VERSION__ || ''
          }
        });
      }
      return res;
    } catch (err: any) {
      if (matchesCritical()) {
        postCriticalAlert({
          title: `Erro de rede em ${method}`,
          message: err?.message || String(err),
          context: {
            url,
            method,
            errorName: err?.name,
            user: getStoredUserSafe(),
            userAgent: navigator.userAgent,
            appVersion: (window as any).__APP_VERSION__ || ''
          }
        });
      }
      throw err;
    }
  };
}


