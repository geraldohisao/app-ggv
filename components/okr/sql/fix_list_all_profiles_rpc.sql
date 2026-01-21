-- ============================================
-- CORRIGIR RPC list_all_profiles
-- ============================================
-- Problema: RPC não retorna 'department'
-- Solução: Adicionar department ao RETURNS TABLE
-- ============================================

-- Recriar a função com department incluído
DROP FUNCTION IF EXISTS public.list_all_profiles();

CREATE OR REPLACE FUNCTION public.list_all_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  user_function TEXT,
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
    p.department,
    p.is_active
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_all_profiles() TO authenticated, service_role;

COMMENT ON FUNCTION public.list_all_profiles IS 'Lista todos os perfis incluindo department e user_function';

-- ============================================
-- TAMBÉM CORRIGIR list_active_profiles (se existir)
-- ============================================

DROP FUNCTION IF EXISTS public.list_active_profiles();

CREATE OR REPLACE FUNCTION public.list_active_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  user_function TEXT,
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
    p.department,
    p.is_active
  FROM public.profiles p
  WHERE p.is_active = TRUE
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_profiles() TO authenticated, service_role;

COMMENT ON FUNCTION public.list_active_profiles IS 'Lista perfis ativos incluindo department e user_function';

-- ============================================
-- FIM
-- ============================================

-- Agora list_all_profiles e list_active_profiles retornam:
-- - id, email, name, role, user_function, department, is_active

