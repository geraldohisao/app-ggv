import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch global
const g: any = globalThis as any;

describe('geminiService – casos adicionais', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('happy path: retorna texto da Gemini', async () => {
    g.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) })) as any;
    vi.doMock('../../services/supabaseService', () => ({ getAppSetting: vi.fn(async () => 'AIza-TEST') }));
    const svc = await import('../../services/geminiService');
    const gen = svc.getAIAssistantResponseStream('hi', { name: 'p', tone: 't' } as any, [], 'kb');
    const chunks: string[] = [];
    for await (const c of gen) chunks.push(c);
    expect(chunks.join('').trim()).toContain('ok');
  });

  it('erro 429: propaga mensagem amigável', async () => {
    g.fetch = vi.fn(async () => ({ ok: false, status: 429, statusText: 'Too Many Requests', json: async () => ({ error: { message: 'quota' } }) })) as any;
    vi.doMock('../../services/supabaseService', () => ({ getAppSetting: vi.fn(async () => 'AIza-TEST') }));
    const svc = await import('../../services/geminiService');
    const gen = svc.getAIAssistantResponseStream('hi', { name: 'p', tone: 't' } as any, [], 'kb');
    const chunks: string[] = [];
    for await (const c of gen) chunks.push(c);
    expect(chunks.join('')).toMatch(/Erro na API Gemini: 429/);
  });

  it('timeout/erro: cai em mensagem de erro', async () => {
    g.fetch = vi.fn(async () => { throw new Error('timeout'); }) as any;
    vi.doMock('../../services/supabaseService', () => ({ getAppSetting: vi.fn(async () => 'AIza-TEST') }));
    const svc = await import('../../services/geminiService');
    const gen = svc.getAIAssistantResponseStream('hi', { name: 'p', tone: 't' } as any, [], 'kb');
    const chunks: string[] = [];
    for await (const c of gen) chunks.push(c);
    expect(chunks.join('')).toMatch(/ocorreu um erro ao me comunicar/);
  });
});


