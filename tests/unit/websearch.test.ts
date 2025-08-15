import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchWeb, summarizeForContext } from '../../src/services/webSearch';

const originalFetch = global.fetch;

describe('webSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // @ts-ignore
    global.fetch = vi.fn();
  });

  it('returns [] without credentials', async () => {
    const res = await searchWeb('teste', { enabled: true, apiKey: undefined, cx: undefined });
    expect(res).toEqual([]);
  });

  it('dedupes and normalizes', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [
      { title: 'A', link: 'https://site.com/page?utm=1', snippet: 'texto1' },
      { title: 'a', link: 'https://site.com/page?utm=2', snippet: 'texto1-dup' },
      { title: 'B', link: 'https://outro.com/x', snippet: 'texto2'.padEnd(400, 'x') },
    ] }) });
    const res = await searchWeb('q', { enabled: true, apiKey: 'k', cx: 'cx', topK: 5 });
    expect(res.length).toBe(2);
    expect(res[0].title).toBe('A');
    expect(res[0].url).toBe('https://site.com/page');
    expect(res[1].snippet.length).toBeLessThanOrEqual(301);
  });

  it('timeout returns []', async () => {
    // @ts-ignore
    global.fetch.mockImplementationOnce(() => new Promise(() => {}));
    const res = await searchWeb('q', { enabled: true, apiKey: 'k', cx: 'cx', timeoutMs: 1 });
    expect(res).toEqual([]);
  });
});

describe('summarizeForContext', () => {
  it('formats section respecting maxChars', () => {
    const txt = summarizeForContext([
      { title: 'T1', url: 'u1', snippet: 's1', provider: 'google_cse' },
      { title: 'T2', url: 'u2', snippet: 's2', provider: 'google_cse' },
    ], 80);
    expect(txt.startsWith('### Informações Externas')).toBe(true);
    expect(txt.includes('T1')).toBe(true);
  });
});

afterAll(() => {
  // @ts-ignore
  global.fetch = originalFetch;
});


