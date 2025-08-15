import { describe, it, expect } from 'vitest';
import { buildContext } from '../../src/rag/contextBuilder';

const mk = (n: number) => Array.from({ length: n }).map((_, i) => ({
  id: `d${i}`, name: `Doc ${i}`, score: 0.1 + (n - i) * 0.05, kind: 'doc' as const, content: 'x'.repeat(1200)
}));

describe('contextBuilder', () => {
  it('dedupe por id|name|title', () => {
    const kd = [
      { id: 'A', name: 'N', score: 0.8, kind: 'doc' as const, content: 'aaa' },
      { id: 'A', name: 'N-alt', score: 0.7, kind: 'doc' as const, content: 'bbb' },
    ];
    const res = buildContext({ kdDocs: kd, koDocs: [], maxDocs: 5, dedupeBy: 'id|name|title' });
    expect(res.sources.length).toBe(1);
  });

  it('trunca sem quebrar palavra e adiciona marcador', () => {
    const kd = [{ id: 'A', name: 'Nome', score: 0.9, kind: 'doc' as const, content: 'palavra '.repeat(400) }];
    const res = buildContext({ kdDocs: kd, koDocs: [], maxCharsPerDoc: 200 });
    expect(res.text).toMatch(/\[#src:A/);
    expect(res.text.length).toBeGreaterThan(50);
  });

  it('ordena por score desc e aplica maxDocs', () => {
    const kd = mk(6);
    const res = buildContext({ kdDocs: kd, koDocs: [], maxDocs: 3 });
    // 3 fontes apenas
    expect(res.sources.length).toBe(3);
    // primeiro tem score >= segundo
    expect(res.sources[0].score).toBeGreaterThanOrEqual(res.sources[1].score);
  });

  it('minScore filtra documentos', () => {
    const kd = [
      { id: 'a', name: 'x', score: 0.1, kind: 'doc' as const, content: '1' },
      { id: 'b', name: 'y', score: 0.9, kind: 'doc' as const, content: '2' },
    ];
    const res = buildContext({ kdDocs: kd, koDocs: [], minScore: 0.2 });
    expect(res.sources.some(s => s.id === 'a')).toBe(false);
    expect(res.sources.some(s => s.id === 'b')).toBe(true);
  });
});


