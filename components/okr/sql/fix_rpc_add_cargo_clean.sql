-- Recriar list_all_profiles com campo cargo

DROP FUNCTION IF EXISTS public.list_all_profiles();

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
  -- ✅ SEM LIMIT - retorna TODOS
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_all_profiles() TO authenticated, service_role;

-- Recriar list_active_profiles com campo cargo

DROP FUNCTION IF EXISTS public.list_active_profiles();

CREATE OR REPLACE FUNCTION public.list_active_profiles()
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
  WHERE p.is_active = TRUE
  ORDER BY p.created_at DESC;
  -- ✅ SEM LIMIT - retorna TODOS os ativos
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_profiles() TO authenticated, service_role;

-- Testar a RPC corrigida
SELECT 
  name,
  cargo,
  department,
  role
FROM list_all_profiles()
WHERE name IN ('César Intrieri', 'Dev Team', 'Eduardo Espindola', 'Djiovane Santos')
ORDER BY name;

