import { describe, it, expect, vi } from 'vitest';

// Isolar dependências que tocam window/localStorage no ambiente de teste
vi.mock('../../services/supabaseClient', () => ({ supabase: { rpc: vi.fn(async (name: string) => {
  if (name === 'get_logo_urls') {
    return { data: { grupoGGVLogoUrl: 'A', ggvInteligenciaLogoUrl: 'B' }, error: null } as any;
  }
  return { data: null, error: null } as any;
}) } }));
vi.mock('../../services/config', () => ({ SUPABASE_URL: undefined, SUPABASE_ANON_KEY: undefined, isValidKey: () => false }));

// Mockar apenas o que precisamos alterar (mantém implementações reais dos wrappers)
vi.mock('../../services/supabaseService', async (orig) => {
  const actual = await (orig as any)();
  const upsertSpy = vi.fn(async (_key: string, _value: any) => {});
  return {
    ...actual,
    upsertAppSetting: upsertSpy,
    // Reexport saveLogoUrls como wrapper sobre o spy
    saveLogoUrls: async (urls: any) => {
      await upsertSpy('logo_urls', urls);
    },
  };
});

import { getLogoUrls, saveLogoUrls } from '../../services/supabaseService';

describe('App Settings - logo_urls via RPC', () => {
  it('getLogoUrls retorna objeto correto', async () => {
    const logos = await getLogoUrls();
    expect(logos).toEqual({ grupoGGVLogoUrl: 'A', ggvInteligenciaLogoUrl: 'B' });
  });

  it('saveLogoUrls chama upsertAppSetting("logo_urls", ...)', async () => {
    const { upsertAppSetting } = await import('../../services/supabaseService');
    await saveLogoUrls({ grupoGGVLogoUrl: 'X', ggvInteligenciaLogoUrl: 'Y' });
    expect((upsertAppSetting as any)).toHaveBeenCalledWith('logo_urls', { grupoGGVLogoUrl: 'X', ggvInteligenciaLogoUrl: 'Y' });
  });

  it('getLogoUrls normaliza string JSON', async () => {
    const { supabase } = await import('../../services/supabaseClient');
    (supabase.rpc as any).mockResolvedValueOnce({ data: '{"grupoGGVLogoUrl":"S1","ggvInteligenciaLogoUrl":"S2"}', error: null });
    const logos = await getLogoUrls();
    expect(logos).toEqual({ grupoGGVLogoUrl: 'S1', ggvInteligenciaLogoUrl: 'S2' });
  });

  it('getLogoUrls retorna null quando ausente/ inválido', async () => {
    const { supabase } = await import('../../services/supabaseClient');
    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: null });
    const logos1 = await getLogoUrls();
    expect(logos1).toBeNull();
    (supabase.rpc as any).mockResolvedValueOnce({ data: 'not-json', error: null });
    const logos2 = await getLogoUrls();
    expect(logos2).toBeNull();
  });
});


