-- ================================================================
-- 🎯 CRIAR RPC PARA LISTAR APENAS USUÁRIOS ATIVOS
-- ================================================================
-- Esta RPC retorna apenas usuários com is_active = true
-- Usada em dropdowns de seleção de usuários/SDRs
-- ================================================================

-- 1️⃣ Criar função para listar apenas usuários ativos
DROP FUNCTION IF EXISTS public.list_active_profiles();
CREATE OR REPLACE FUNCTION public.list_active_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  user_function TEXT,
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
    p.is_active
  FROM public.profiles p
  WHERE p.is_active = true  -- ✅ APENAS USUÁRIOS ATIVOS
  ORDER BY p.name;  -- Ordenar por nome para facilitar seleção
END;
$$;

-- 2️⃣ Conceder permissões
GRANT EXECUTE ON FUNCTION public.list_active_profiles() TO authenticated, service_role;

-- 3️⃣ Testar a função
SELECT 
  '✅ TESTE: Usuários Ativos' as info,
  COUNT(*) as total_ativos
FROM public.list_active_profiles();

-- 4️⃣ Ver alguns exemplos
SELECT 
  '📋 EXEMPLOS DE USUÁRIOS ATIVOS' as info,
  id,
  name,
  email,
  role,
  user_function
FROM public.list_active_profiles()
LIMIT 10;

-- ================================================================
-- ✅ RESULTADO ESPERADO:
-- ================================================================
-- Deve retornar apenas os 11 usuários ativos (não os 3 inativos)
-- ================================================================

