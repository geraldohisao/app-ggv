import type { WebSearchConfig, WebSource } from './index';
import { fetchWithTimeout } from '../../utils/net';

// Cache leve em memória (TTL 60s)
type CacheEntry = { at: number; items: WebSource[] };
const memCache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

function cacheKey(q: string, cfg: WebSearchConfig): string {
  return `${cfg.provider}|${cfg.topK}|${(cfg.hint || '').trim()}|${q.trim()}`.toLowerCase();
}

function clearExpired() {
  const now = Date.now();
  for (const [k, v] of memCache.entries()) {
    if (now - v.at > TTL_MS) memCache.delete(k);
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const wrapped = p.finally(() => clearTimeout(timer));
  // We pass AbortController to fetch directly below; just return wrapped promise here
  return wrapped;
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.search = ''; // remove tracking/query para dedupe simples
    return url.toString();
  } catch { return u; }
}

function domainOf(u: string): string {
  try { return new URL(u).hostname.toLowerCase(); } catch { return ''; }
}

export async function searchGoogleCse(query: string, cfg: WebSearchConfig): Promise<WebSource[]> {
  try {
    clearExpired();
    const key = cacheKey(query, cfg);
    const now = Date.now();
    const cached = memCache.get(key);
    if (cached && now - cached.at <= TTL_MS) return cached.items;

    const q = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?q=${q}&key=${cfg.apiKey}&cx=${cfg.cx}&num=${Math.max(1, Math.min(cfg.topK, 5))}&hl=pt-BR`;

  const res = await fetchWithTimeout(url, { timeoutMs: cfg.timeoutMs, retries: 1 }).catch(() => null as any);
    if (!res || !res.ok) return [];
    const data = await res.json().catch(() => null as any);
    const items: any[] = data && Array.isArray(data.items) ? data.items : [];

    const mapped: WebSource[] = items.map((it: any) => ({
      title: String(it.title || '').trim(),
      url: normalizeUrl(String(it.link || '').trim()),
      snippet: String(it.snippet || '').trim(),
      provider: 'google_cse',
    }));

    // Dedupe por domínio + título (case-insensitive)
    const seen = new Set<string>();
    const deduped: WebSource[] = [];
    for (const m of mapped) {
      if (!m.title || !m.url) continue;
      let snippet = m.snippet || '';
      if (snippet.length > 300) snippet = snippet.slice(0, 300) + '…';
      const key2 = `${domainOf(m.url)}|${m.title.toLowerCase()}`;
      if (!seen.has(key2)) {
        seen.add(key2);
        deduped.push({ ...m, snippet });
      }
      if (deduped.length >= cfg.topK) break;
    }

    memCache.set(key, { at: now, items: deduped });
    return deduped;
  } catch {
    return [];
  }
}


