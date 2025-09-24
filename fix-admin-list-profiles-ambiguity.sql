-- Script para corrigir ambiguidade da função admin_list_profiles
-- Execute no SQL Editor do Supabase

-- 1. REMOVER ambas as funções existentes para evitar conflito
DROP FUNCTION IF EXISTS public.admin_list_profiles();
DROP FUNCTION IF EXISTS public.admin_list_profiles(int, int, text);

-- 2. CRIAR função única e específica para listar perfis (sem parâmetros)
CREATE OR REPLACE FUNCTION public.admin_list_profiles_simple()
RETURNS TABLE (id uuid, email text, name text, role text, user_function text, created_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('SUPER_ADMIN','ADMIN')
  ) THEN
    RAISE EXCEPTION 'Permissão negada - apenas admins podem listar perfis';
  END IF;
  
  -- Retornar todos os perfis
  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.user_function, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 3. CRIAR função com parâmetros para paginação (se necessário)
CREATE OR REPLACE FUNCTION public.admin_list_profiles_paginated(
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE (id uuid, email text, name text, role text, user_function text, created_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('SUPER_ADMIN','ADMIN')
  ) THEN
    RAISE EXCEPTION 'Permissão negada - apenas admins podem listar perfis';
  END IF;
  
  -- Retornar perfis com filtros
  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.user_function, p.created_at
  FROM public.profiles p
  WHERE (p_search IS NULL OR p_search = '' OR
         LOWER(COALESCE(p.email,'') || ' ' || COALESCE(p.name,'')) LIKE '%' || LOWER(p_search) || '%')
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 4. CONCEDER permissões
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_simple() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_paginated(int, int, text) TO authenticated, service_role;

-- 5. TESTAR as funções
SELECT '=== TESTE admin_list_profiles_simple ===' as info;
SELECT COUNT(*) as total_profiles FROM public.admin_list_profiles_simple();

SELECT '=== TESTE admin_list_profiles_paginated ===' as info;
SELECT COUNT(*) as total_profiles FROM public.admin_list_profiles_paginated(10, 0, NULL);

-- 6. VERIFICAR se as funções foram criadas corretamente
SELECT 
    '=== FUNÇÕES CRIADAS ===' as info,
    proname as function_name,
    pronargs as num_args,
    proargnames as arg_names
FROM pg_proc 
WHERE proname LIKE '%admin_list_profiles%'
ORDER BY proname;
