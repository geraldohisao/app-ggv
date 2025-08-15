import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('supabaseService – policies/grants (mock)', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it('getAppSetting retorna mensagem de permissão negada mapeada', async () => {
    vi.doMock('../../services/supabaseClient', () => ({
      supabase: { rpc: vi.fn(async () => ({ data: null, error: { message: 'permission denied' } })) }
    }));
    const svc = await import('../../services/supabaseService');
    await expect(svc.getAppSetting('x')).rejects.toThrow(/Apenas administradores/);
  });

  it('upsertAppSetting trata erro de permissão', async () => {
    vi.doMock('../../services/supabaseClient', () => ({
      supabase: { rpc: vi.fn(async () => ({ error: { message: 'Permissão negada' } })) }
    }));
    const svc = await import('../../services/supabaseService');
    await expect(svc.upsertAppSetting('k', 'v')).rejects.toThrow(/Permissão negada/);
  });
});


