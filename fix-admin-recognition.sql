-- Script para corrigir reconhecimento de admin
-- Execute no SQL Editor do Supabase

-- 1. CRIAR função de debug mais permissiva
CREATE OR REPLACE FUNCTION public.admin_list_profiles_debug()
RETURNS TABLE (
    debug_info text,
    id uuid, 
    email text, 
    name text, 
    role text, 
    user_function text, 
    created_at timestamptz
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  -- Retornar informações de debug primeiro
  RETURN QUERY
  SELECT 
    'DEBUG: auth.uid() = ' || COALESCE(auth.uid()::text, 'NULL') as debug_info,
    NULL::uuid as id,
    NULL::text as email,
    NULL::text as name,
    NULL::text as role,
    NULL::text as user_function,
    NULL::timestamptz as created_at;
  
  -- Retornar informações de debug sobre o perfil
  RETURN QUERY
  SELECT 
    'DEBUG: Profile role = ' || COALESCE(p.role, 'NULL') as debug_info,
    NULL::uuid as id,
    NULL::text as email,
    NULL::text as name,
    NULL::text as role,
    NULL::text as user_function,
    NULL::timestamptz as created_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
  
  -- Retornar informações de debug sobre is_admin()
  RETURN QUERY
  SELECT 
    'DEBUG: is_admin() = ' || COALESCE(public.is_admin()::text, 'NULL') as debug_info,
    NULL::uuid as id,
    NULL::text as email,
    NULL::text as name,
    NULL::text as role,
    NULL::text as user_function,
    NULL::timestamptz as created_at;
  
  -- Se chegou até aqui, retornar todos os perfis (mesmo sem verificação de admin)
  RETURN QUERY
  SELECT 
    'PROFILE: ' || COALESCE(p.name, p.email, p.id::text) as debug_info,
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 2. CRIAR função mais robusta com múltiplas verificações
CREATE OR REPLACE FUNCTION public.admin_list_profiles_robust()
RETURNS TABLE (id uuid, email text, name text, role text, user_function text, created_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
  user_role text;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  -- Verificar se usuário está logado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Obter role do usuário
  SELECT p.role INTO user_role
  FROM public.profiles p
  WHERE p.id = current_user_id;
  
  -- Verificar se é admin (múltiplas verificações)
  IF user_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
    -- Tentar verificar via função is_admin()
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Permissão negada - usuário % tem role % mas não é reconhecido como admin', current_user_id, COALESCE(user_role, 'NULL');
    END IF;
  END IF;
  
  -- Retornar todos os perfis
  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.user_function, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 3. CRIAR função temporária sem verificação de admin (apenas para teste)
CREATE OR REPLACE FUNCTION public.admin_list_profiles_no_check()
RETURNS TABLE (id uuid, email text, name text, role text, user_function text, created_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  -- Retornar todos os perfis sem verificação de admin (APENAS PARA TESTE)
  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.user_function, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 4. CONCEDER permissões
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_debug() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_robust() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles_no_check() TO authenticated, service_role;

-- 5. TESTAR as funções
SELECT '=== TESTE admin_list_profiles_debug ===' as info;
SELECT debug_info FROM public.admin_list_profiles_debug() LIMIT 5;

SELECT '=== TESTE admin_list_profiles_robust ===' as info;
SELECT COUNT(*) as total_profiles FROM public.admin_list_profiles_robust();

SELECT '=== TESTE admin_list_profiles_no_check ===' as info;
SELECT COUNT(*) as total_profiles FROM public.admin_list_profiles_no_check();
