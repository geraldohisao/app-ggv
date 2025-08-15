import type { WebSource } from './index';
import { fetchWithTimeout } from '../../utils/net';

// Cache leve em memória (TTL 60s) — mesma estratégia do CSE
type CacheEntry = { at: number; items: WebSource[] };
const memCache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

type TavilyOpts = { apiKey: string; topK?: number; timeoutMs?: number };

function cacheKey(query: string, opts: TavilyOpts): string {
  const k = `${(opts.topK ?? 2)}|${(opts.timeoutMs ?? 5000)}|${query.trim()}`.toLowerCase();
  return `tavily|${k}`;
}

function clearExpired(): void {
  const now = Date.now();
  for (const [k, v] of memCache.entries()) {
    if (now - v.at > TTL_MS) memCache.delete(k);
  }
}

function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return u;
  }
}

function domainOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

export async function tavilySearch(
  query: string,
  { apiKey, topK = 2, timeoutMs = 5000 }: TavilyOpts
): Promise<WebSource[]> {
  try {
    const q = (query || '').trim();
    if (!q || !apiKey || !apiKey.trim()) return [];

    clearExpired();
    const key = cacheKey(q, { apiKey, topK, timeoutMs });
    const now = Date.now();
    const cached = memCache.get(key);
    if (cached && now - cached.at <= TTL_MS) return cached.items;

    const res = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: q,
        max_results: Math.max(1, Math.min(topK, 5)),
        search_depth: 'basic',
      }),
      timeoutMs,
      retries: 1,
    }).catch(() => null as any);

    if (!res || !res.ok) return [];
    const data = await res.json().catch(() => null as any);
    const items: any[] = data && Array.isArray(data.results) ? data.results : [];

    const mapped: WebSource[] = items.map((it: any) => ({
      title: String(it.title || '').trim(),
      url: normalizeUrl(String(it.url || '').trim()),
      snippet: String(it.content || it.snippet || '').trim(),
      provider: 'tavily',
    }));

    const seen = new Set<string>();
    const deduped: WebSource[] = [];
    for (const m of mapped) {
      if (!m.title || !m.url) continue;
      let snippet = m.snippet || '';
      if (snippet.length > 300) snippet = snippet.slice(0, 300) + '…';
      const k2 = `${domainOf(m.url)}|${m.title.toLowerCase()}`;
      if (!seen.has(k2)) {
        seen.add(k2);
        deduped.push({ ...m, snippet });
      }
      if (deduped.length >= topK) break;
    }

    memCache.set(key, { at: now, items: deduped });
    return deduped;
  } catch (err: any) {
    // Timeout/Abort e quaisquer outros erros → fallback silencioso
    if (err?.name === 'AbortError') return [];
    return [];
  }
}


