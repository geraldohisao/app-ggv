import { describe, it, expect } from 'vitest';
import { sanitizeOutput } from '../../src/utils/sanitizeOutput';

describe('sanitizeOutput', () => {
  it('remove AIza e sk- tokens', () => {
    const txt = 'Minha chave AIzaSyB-12345678901234567890 e outra sk-abcdefghijklmnopqrst';
    const out = sanitizeOutput(txt, 4000);
    expect(out).not.toMatch(/AIza/);
    expect(out).not.toMatch(/sk-/);
    expect(out).toMatch(/\[REDACTED\]/);
  });

  it('truncamento preserva palavra', () => {
    const base = 'palavra '.repeat(200);
    const out = sanitizeOutput(base, 100);
    expect(out.length).toBeLessThanOrEqual(102);
    expect(out.endsWith(' …')).toBe(true);
  });
});


