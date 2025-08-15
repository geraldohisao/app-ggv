import { describe, it, expect } from 'vitest';
import { stripSourceTags } from '../../src/utils/aiText';

describe('stripSourceTags', () => {
  it('removes [#src:...] tags and Fontes lines', () => {
    const input = 'Texto antes [#src:web:1]\n### Fontes: abc\nresto';
    const out = stripSourceTags(input);
    expect(out.includes('[#src:')).toBe(false);
    expect(/fontes/i.test(out)).toBe(false);
  });
});


