import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as embedding from '../../services/embeddingService';
import { buildContext } from '../../src/rag/contextBuilder';
import { supabase } from '../../services/supabaseClient';

vi.mock('../../services/supabaseClient', () => ({
  supabase: { rpc: vi.fn() }
}));

describe('RAG — kd_match integration', () => {
  beforeEach(() => {
    (supabase.rpc as any).mockReset();
    vi.spyOn(embedding, 'generateEmbedding').mockResolvedValue(new Array(768).fill(0.01));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('chama kd_match com payload correto e retorna docs ordenados por score', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({
      data: [
        { id: 'a', name: 'Doc A', content: '...', score: 0.91, created_at: '2025-01-01T00:00:00Z' },
        { id: 'b', name: 'Doc B', content: '...', score: 0.72, created_at: '2025-01-02T00:00:00Z' }
      ],
      error: null
    });

    const results = await (embedding as any).findMostRelevantDocuments('minha pergunta', 5);

    expect(results).toHaveLength(2);
    // vem ordenado do banco por distância asc → score desc
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);

    // assert da chamada RPC
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = (supabase.rpc as any).mock.calls[0];
    expect(fn).toBe('kd_match');
    expect(args.top_k).toBe(5);
    expect(Array.isArray(args.query_embedding)).toBe(true);
    expect(args.query_embedding).toHaveLength(768);
  });

  it('fallback seguro: retorna [] quando kd_match falha', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const results = await (embedding as any).findMostRelevantDocuments('x', 3);
    expect(results).toEqual([]);
  });
});

describe('RAG — ko_match (overview)', () => {
  beforeEach(() => {
    (supabase.rpc as any).mockReset();
    vi.spyOn(embedding, 'generateEmbedding').mockResolvedValue(new Array(768).fill(0.02));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna overview com scores', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({
      data: [{ id: 'o1', title: 'Overview', content: '...', score: 0.8, created_at: '2025-02-01T00:00:00Z' }],
      error: null
    });

    const res = await (embedding as any).findOverviewMatch('pergunta', 2);
    expect(res[0].title).toBe('Overview');
    expect(res[0].score).toBeGreaterThan(0);
  });
  
  it('integra com contextBuilder para montar contexto', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({
      data: [ { id: 'd1', name: 'Doc 1', content: 'conteudo doc 1', score: 0.8 } ],
      error: null
    });
    vi.spyOn(embedding, 'generateEmbedding').mockResolvedValue(new Array(768).fill(0.03));
    const kd = await (embedding as any).findMostRelevantDocuments('q', 1);
    const res = buildContext({ kdDocs: kd, koDocs: [], maxDocs: 1 });
    expect(res.text).toMatch(/\[#src:d1/);
  });
});

describe('Embeddings — toggle em runtime', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('setUseRemoteEmbeddings alterna caminho remoto/local na chamada seguinte', async () => {
    const spy = vi.spyOn(embedding as any, 'generateEmbedding');
    // desliga remoto
    (embedding as any).setUseRemoteEmbeddings(false);
    await (embedding as any).generateEmbedding('q', 'RETRIEVAL_QUERY');
    // liga remoto
    (embedding as any).setUseRemoteEmbeddings(true);
    await (embedding as any).generateEmbedding('q', 'RETRIEVAL_QUERY');

    expect(spy).toHaveBeenCalledTimes(2);
  });
});


