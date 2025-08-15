export type SourceItem = {
  id?: string;
  name?: string;
  title?: string;
  score: number;
  kind: 'doc' | 'overview';
  content?: string;
};

export type BuildContextParams = {
  kdDocs?: Array<Partial<SourceItem>>;
  koDocs?: Array<Partial<SourceItem>>;
  maxDocs?: number;
  maxCharsPerDoc?: number;
  minScore?: number;
  dedupeBy?: string; // 'id|name|title'
};

export type BuildContextResult = {
  text: string;
  sources: Array<Omit<SourceItem, 'content'>>;
};

function truncateClean(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  let slice = text.slice(0, maxChars);
  // evite quebrar no meio da palavra
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 0 && maxChars - lastSpace < 40) slice = slice.slice(0, lastSpace);
  return slice + '\n...[conteúdo truncado]';
}

export function buildContext(params: BuildContextParams): BuildContextResult {
  const { startStep } = require('../utils/logger');
  const {
    kdDocs = [],
    koDocs = [],
    maxDocs = 4,
    maxCharsPerDoc = 900,
    minScore = 0.15,
    dedupeBy = 'id|name|title',
  } = params || {} as any;

  const end = startStep({ requestId: 'n/a' }, 'build_context');

  const all: SourceItem[] = [
    ...koDocs.map(d => ({ ...d, kind: 'overview' as const })),
    ...kdDocs.map(d => ({ ...d, kind: 'doc' as const })),
  ];

  // score válido
  const filtered = all.filter(d => (typeof d.score === 'number' ? d.score >= minScore : true));

  // ordena desc por score
  filtered.sort((a, b) => (b.score || 0) - (a.score || 0));

  // dedupe
  const keys = dedupeBy.split('|').map(k => k.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique: SourceItem[] = [];
  for (const item of filtered) {
    const keyParts = keys.map(k => String((item as any)[k] ?? '')).filter(Boolean);
    const key = keyParts.join('|');
    if (!key || !seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  const limited = unique.slice(0, Math.max(0, maxDocs));

  const chunks: string[] = [];
  const sources: Array<Omit<SourceItem, 'content'>> = [];
  for (const src of limited) {
    const label = src.id || src.title || src.name || 'sem-id';
    const header = `[#src:${label} score=${(src.score ?? 0).toFixed(2)} kind=${src.kind}]`;
    const body = truncateClean((src.content || '').replace(/\[#src:[^\]]+\]/g, ''), maxCharsPerDoc);
    chunks.push(`${header}\n${body}`);
    const { content, ...rest } = src;
    sources.push(rest);
  }

  const text = chunks.length > 0
    ? chunks.join('\n\n')
    : 'Nenhum documento relevante encontrado.';

  const result = { text, sources };
  end();
  return result;
}


