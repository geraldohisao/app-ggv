-- ============================================
-- RPC: snapshot do organograma (profiles + cargos)
-- Data: 2026-01-27
--
-- Problema:
-- - RLS em `public.profiles` pode limitar SELECT ao próprio usuário (por email)
-- - O organograma precisa listar todos os usuários ativos + cargos
--
-- Solução:
-- - Expor RPC SECURITY DEFINER que retorna um snapshot JSONB
-- - O frontend usa RPC por padrão e cai em fallback se não existir
-- ============================================
CREATE OR REPLACE FUNCTION public.get_org_chart_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF v_email = '' THEN
    RAISE EXCEPTION 'missing_email';
  END IF;

  RETURN jsonb_build_object(
    'usuarios',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'email', p.email,
            'cargo', p.cargo,
            'department', p.department,
            'role', p.role,
            'is_active', p.is_active,
            'avatar_url', p.avatar_url
          )
          ORDER BY p.name
        )
        FROM public.profiles p
        WHERE p.is_active = true
      ),
      '[]'::jsonb
    ),
    'cargos',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', c.name,
            'level', c.level
          )
          ORDER BY c.level, c.name
        )
        FROM public.cargos c
        WHERE c.is_active = true
      ),
      '[]'::jsonb
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_chart_snapshot() TO authenticated;

COMMENT ON FUNCTION public.get_org_chart_snapshot() IS
'Retorna snapshot (usuarios/cargos) para organograma. SECURITY DEFINER para evitar telas vazias quando RLS em profiles restringe leitura. Requer usuário autenticado e email no JWT.';

