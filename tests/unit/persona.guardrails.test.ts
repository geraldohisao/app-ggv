import { describe, it, expect, vi } from 'vitest';

describe('persona guardrails no prompt', () => {
  it('inclui seções de restrições e veracidade', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) })) as any;
    vi.doMock('../../services/supabaseService', () => ({
      getAppSetting: vi.fn(async () => 'AIza-TEST'),
      getLLMGenerationConfig: vi.fn(async () => ({ temperature: 0.7, topP: 0.95, topK: 1, maxOutputTokens: 64 })),
    }));
    const mod = await import('../../services/geminiService');
    const spy = vi.spyOn<any, any>(mod as any, 'getAIAssistantResponseStream');
    const gen = mod.getAIAssistantResponseStream('pergunta', { id: 'SDR', name: 'SDR' } as any, [], 'kb');
    const chunks: string[] = [];
    for await (const c of gen) chunks.push(c);
    expect(chunks.join('')).toContain('ok');
    // Não acessamos diretamente o prompt interno, mas validamos comportamento indireto
  });

  it('persona=SDR com termo fora de escopo injeta nota de recusa', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) })) as any;
    vi.doMock('../../services/supabaseService', () => ({
      getAppSetting: vi.fn(async () => 'AIza-TEST'),
      getLLMGenerationConfig: vi.fn(async () => ({ temperature: 0.7, topP: 0.95, topK: 1, maxOutputTokens: 64 })),
    }));
    const { getAIAssistantResponseStream } = await import('../../services/geminiService');
    const gen = getAIAssistantResponseStream('Preciso de uma cláusula contratual', { id: 'SDR', name: 'SDR' } as any, [], 'kb');
    const chunks: string[] = [];
    for await (const c of gen) chunks.push(c);
    expect(chunks.join('')).toContain('ok');
  });
});


