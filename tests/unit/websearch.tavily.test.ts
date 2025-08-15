import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { searchWeb } from '../../src/services/webSearch';

const originalFetch = global.fetch;

describe('websearch.tavily (provider selection + behavior)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // @ts-ignore
    global.fetch = vi.fn();
  });

  it('returns [] when no keys present', async () => {
    // loadConfig reads app_settings via getAppSetting; but we override by passing cfg
    const res = await searchWeb('hello', { enabled: true, topK: 2, timeoutMs: 2000, apiKey: undefined, cx: undefined });
    expect(res).toEqual([]);
  });

  it('uses Tavily when key is present and performs dedupe/normalization', async () => {
    // Mock Tavily response
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [
      { title: 'Alpha', url: 'https://site.com/page?utm=1', content: 'texto alpha' },
      { title: 'alpha', url: 'https://site.com/page?utm=2', content: 'texto alpha duplicado' },
      { title: 'Beta', url: 'https://b.com/x', content: 'b'.repeat(500) },
    ] }) });

    // Force provider selection path by passing no CSE key and simulating app setting for Tavily via cfg is not supported.
    // Instead, we rely on the routing inside searchWeb which checks getAppSetting('TAVILY_API_KEY').
    // So we mock supabaseService.getAppSetting within the module cache.
    vi.doMock('../../services/supabaseService', () => ({
      getAppSetting: async (k: string) => {
        if (k === 'TAVILY_API_KEY') return 'tvly-test';
        if (k === 'USE_WEB_SEARCH') return true;
        if (k === 'WEB_CONTEXT_HINT') return '';
        if (k === 'WEB_TOPK') return 3;
        if (k === 'WEB_TIMEOUT_MS') return 5000;
        if (k === 'WEB_PROVIDER') return 'tavily';
        if (k === 'G_CSE_API_KEY') return undefined;
        if (k === 'G_CSE_CX') return undefined;
        return null;
      },
    }));

    const mod = await import('../../src/services/webSearch');
    const res = await mod.searchWeb('q', { enabled: true });
    expect(res.length).toBe(2);
    expect(res[0].title).toBe('Alpha');
    expect(res[0].url).toBe('https://site.com/page');
    expect(res[1].snippet.length).toBeLessThanOrEqual(301);
    expect(res[0].provider).toBe('tavily');
  });

  it('timeout returns []', async () => {
    // @ts-ignore
    global.fetch.mockImplementationOnce(() => new Promise(() => {}));
    vi.doMock('../../services/supabaseService', () => ({
      getAppSetting: async (k: string) => {
        if (k === 'TAVILY_API_KEY') return 'tvly-test';
        if (k === 'USE_WEB_SEARCH') return true;
        if (k === 'WEB_CONTEXT_HINT') return '';
        if (k === 'WEB_TOPK') return 2;
        if (k === 'WEB_TIMEOUT_MS') return 1;
        if (k === 'WEB_PROVIDER') return 'tavily';
        if (k === 'G_CSE_API_KEY') return undefined;
        if (k === 'G_CSE_CX') return undefined;
        return null;
      },
    }));
    const mod = await import('../../src/services/webSearch');
    const res = await mod.searchWeb('q', { enabled: true });
    expect(res).toEqual([]);
  });
});

afterAll(() => {
  // @ts-ignore
  global.fetch = originalFetch;
});


