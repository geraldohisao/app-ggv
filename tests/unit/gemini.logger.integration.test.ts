import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('gemini logger integration', () => {
  beforeEach(() => {
    (globalThis as any).__DEV__ = true;
  });

  it('gera logs de prompt_ready e llm_done', async () => {
    // mock fetch response
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] }) })) as any;
    // mock app setting
    vi.doMock('../../services/supabaseService', () => ({
      getAppSetting: vi.fn(async () => 'AIza-TEST'),
      getLLMGenerationConfig: vi.fn(async () => ({ temperature: 0.7, topP: 0.95, topK: 1, maxOutputTokens: 64 })),
    }));
    const svc = await import('../../services/geminiService');
    const gen = svc.getAIAssistantResponseStream('hi', { name: 'p' } as any, [], 'kb');
    const chunks: string[] = [];
    for await (const c of gen) chunks.push(c);
    expect(chunks.join('')).toContain('hi');
  });
});


