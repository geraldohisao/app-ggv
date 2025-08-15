import { getAppSetting } from './supabaseService';

export type WebSearchResult = {
  title: string;
  link: string;
  snippet: string;
};

export type WebSearchConfig = {
  enabled: boolean;
  hint?: string;
  topK: number;
  timeoutMs: number;
  cseApiKey?: string;
  cseCx?: string;
};

const defaultConfig: WebSearchConfig = {
  enabled: false,
  hint: '',
  topK: 2,
  timeoutMs: 2000,
};

export async function getWebSearchConfig(): Promise<WebSearchConfig> {
  try {
    const [enabled, hint, topK, timeoutMs, apiKey, cx] = await Promise.all([
      getAppSetting('USE_WEB_SEARCH').catch(() => false),
      getAppSetting('WEB_CONTEXT_HINT').catch(() => ''),
      getAppSetting('WEB_TOPK').catch(() => 2),
      getAppSetting('WEB_TIMEOUT_MS').catch(() => 5000),
      getAppSetting('G_CSE_API_KEY').catch(() => undefined),
      getAppSetting('G_CSE_CX').catch(() => undefined),
    ]);
    return {
      enabled: Boolean(enabled === true || String(enabled).toLowerCase() === 'true'),
      hint: typeof hint === 'string' ? hint : '',
      topK: Number(topK || 2) || 2,
      timeoutMs: Number(timeoutMs || 2000) || 2000,
      cseApiKey: typeof apiKey === 'string' ? apiKey : undefined,
      cseCx: typeof cx === 'string' ? cx : undefined,
    };
  } catch {
    return { ...defaultConfig };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`webSearch timeout after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
  });
}

export async function webSearchRaw(query: string, cfg: WebSearchConfig): Promise<WebSearchResult[]> {
  if (!cfg.cseApiKey || !cfg.cseCx) return [];
  const q = encodeURIComponent(query);
  const url = `https://www.googleapis.com/customsearch/v1?key=${cfg.cseApiKey}&cx=${cfg.cseCx}&q=${q}&num=${Math.max(1, Math.min(cfg.topK, 5))}&hl=pt-BR`;
  const res = await withTimeout(fetch(url), cfg.timeoutMs);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null as any);
  const items: any[] = (data && Array.isArray(data.items)) ? data.items : [];
  return items.slice(0, cfg.topK).map(it => ({
    title: it.title || '',
    link: it.link || '',
    snippet: it.snippet || (Array.isArray(it.snippet_highlighted_words) ? it.snippet_highlighted_words.join(' ') : ''),
  }));
}

export function buildWebContext(results: WebSearchResult[], userQuery: string, hint?: string): string {
  if (!results || results.length === 0) return '';
  const header = '### Referências Web (resumo)\n';
  const blocks = results.map((r, i) => {
    const idx = i + 1;
    const label = `web:${idx}`;
    return `[#src:${label} score=0.50 kind=web]\nTítulo: ${r.title}\nResumo: ${r.snippet}\nURL: ${r.link}`;
  });
  const hintLine = hint && String(hint).trim() ? `\nContexto do usuário: ${String(hint).trim()}\n` : '';
  return `${header}${hintLine}${blocks.join('\n\n')}`;
}

export async function maybeSearchWeb(userQuery: string): Promise<{ text: string; used: boolean; }> {
  const cfg = await getWebSearchConfig();
  if (!cfg.enabled) return { text: '', used: false };
  try {
    const results = await webSearchRaw(userQuery + (cfg.hint ? ` ${cfg.hint}` : ''), cfg);
    const text = buildWebContext(results, userQuery, cfg.hint);
    return { text, used: results.length > 0 };
  } catch {
    return { text: '', used: false };
  }
}
