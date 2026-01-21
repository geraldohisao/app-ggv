-- ============================================
-- ATUALIZAR RPC - VERSÃO SIMPLES
-- ============================================

CREATE OR REPLACE FUNCTION public.list_all_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  user_function TEXT,
  cargo TEXT,
  department TEXT,
  organizational_unit TEXT,
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
    p.cargo,
    p.department,
    p.organizational_unit,
    p.is_active
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Resultado
SELECT '✅ RPC atualizada com organizational_unit' as status;

