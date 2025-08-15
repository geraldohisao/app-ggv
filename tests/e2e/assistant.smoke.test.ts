import { describe, it, expect, vi } from 'vitest';

// Smoke E2E (leve) simulando backend de LLM
describe('assistant smoke', () => {
  it('com docs: resposta contém Fontes e marcador', async () => {
    // mock fetch devolvendo texto com citações
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Resposta exemplo.\n\nFontes: [#src:doc1]' }] } }] })
    })) as any;
    vi.doMock('../../services/supabaseService', () => ({
      getAppSetting: vi.fn(async () => 'AIza-TEST'),
      getLLMGenerationConfig: vi.fn(async () => ({ temperature: 0.7, topP: 0.95, topK: 1, maxOutputTokens: 64 })),
    }));
    const { getAIAssistantResponseStream } = await import('../../services/geminiService');
    const gen = getAIAssistantResponseStream('pergunta', { id: 'SDR', name: 'SDR' } as any, [], 'kb');
    let text = '';
    for await (const c of gen) text += c;
    expect(text).toMatch(/Fontes:/);
    expect(text).toMatch(/\[#src:/);
  });

  it('sem base: admite falta de base', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Não há base suficiente para responder com precisão.' }] } }] })
    })) as any;
    vi.doMock('../../services/supabaseService', () => ({
      getAppSetting: vi.fn(async () => 'AIza-TEST'),
      getLLMGenerationConfig: vi.fn(async () => ({ temperature: 0.7, topP: 0.95, topK: 1, maxOutputTokens: 64 })),
    }));
    const { getAIAssistantResponseStream } = await import('../../services/geminiService');
    const gen = getAIAssistantResponseStream('pergunta', { id: 'SDR', name: 'SDR' } as any, [], 'Nenhum documento relevante encontrado.');
    let text = '';
    for await (const c of gen) text += c;
    expect(text.toLowerCase()).toMatch(/não há base suficiente|sem documentos/);
  });
});


