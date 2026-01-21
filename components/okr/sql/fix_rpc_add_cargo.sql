-- ============================================
-- CORRIGIR RPC: Adicionar campo 'cargo'
-- ============================================
-- Problema: list_all_profiles não retorna 'cargo'
-- Solução: Recriar RPC incluindo 'cargo'
-- ============================================

-- Recriar a função com CARGO incluído
DROP FUNCTION IF EXISTS public.list_all_profiles();

CREATE OR REPLACE FUNCTION public.list_all_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  user_function TEXT,
  cargo TEXT,           -- ✅ ADICIONADO!
  department TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.cargo,              -- ✅ ADICIONADO!
    p.department,
    p.is_active
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_all_profiles() TO authenticated, service_role;

COMMENT ON FUNCTION public.list_all_profiles IS 'Lista todos os perfis incluindo cargo, department e user_function';

-- ============================================
-- TAMBÉM CORRIGIR list_active_profiles
-- ============================================

DROP FUNCTION IF EXISTS public.list_active_profiles();

CREATE OR REPLACE FUNCTION public.list_active_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  user_function TEXT,
  cargo TEXT,           -- ✅ ADICIONADO!
  department TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.cargo,              -- ✅ ADICIONADO!
    p.department,
    p.is_active
  FROM public.profiles p
  WHERE p.is_active = TRUE
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_profiles() TO authenticated, service_role;

COMMENT ON FUNCTION public.list_active_profiles IS 'Lista perfis ativos incluindo cargo, department e user_function';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Testar a RPC corrigida
SELECT 
  name,
  cargo,
  department,
  role
FROM list_all_profiles()
WHERE name IN ('César Intrieri', 'Dev Team', 'Eduardo Espindola', 'Djiovane Santos')
ORDER BY name;

-- ============================================
-- FIM
-- ============================================

/*
✅ Agora list_all_profiles e list_active_profiles retornam:
- id, email, name, role, user_function, CARGO, department, is_active

PRÓXIMO PASSO:
1. Execute este script
2. Recarregue a página no frontend (Ctrl+F5)
3. Os cargos devem aparecer!
*/

