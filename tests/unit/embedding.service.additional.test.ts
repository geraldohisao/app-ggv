import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('embeddingService – casos adicionais', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it('RPC kd_match OK retorna lista', async () => {
    vi.doMock('../../services/supabaseClient', () => ({
      supabase: { rpc: vi.fn(async () => ({ data: [{ id: '1', content: 'a' }], error: null })) }
    }));
    vi.doMock('../../services/supabaseService', () => ({ getAppSetting: vi.fn(async () => 'AIza-TEST') }));
    const mod = await import('../../services/embeddingService');
    // força remoto
    mod.setUseRemoteEmbeddings(true);
    // mock fetch de embedding
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, json: async () => ({ embedding: { values: new Array(768).fill(0.01) } }) })) as any;
    const res = await mod.findMostRelevantDocuments('q', 2);
    expect(Array.isArray(res)).toBe(true);
  });

  it('fallback local quando RPC falha', async () => {
    vi.doMock('../../services/supabaseClient', () => ({ supabase: { rpc: vi.fn(async () => ({ data: null, error: { message: 'fail' } })) } }));
    vi.doMock('../../services/supabaseService', () => ({ getAppSetting: vi.fn(async () => null) }));
    const mod = await import('../../services/embeddingService');
    const docs = [{ id: 'x', embedding: new Array(768).fill(0.01) } as any];
    const res = await mod.findMostRelevantDocuments('q', docs, 1);
    expect(res.length).toBeLessThanOrEqual(1);
  });

  it('embedding remoto com shape inválido → fallback mock', async () => {
    vi.doMock('../../services/supabaseService', () => ({ getAppSetting: vi.fn(async () => 'AIza-TEST') }));
    const mod = await import('../../services/embeddingService');
    mod.setUseRemoteEmbeddings(true);
    (globalThis as any).fetch = vi.fn(async () => ({ ok: true, json: async () => ({ bad: true }) })) as any;
    const v = await mod.generateEmbedding('texto');
    expect(v.length).toBe(768);
  });
});


