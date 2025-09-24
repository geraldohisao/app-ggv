-- Script para resolver problema de autenticação
-- Execute no SQL Editor do Supabase

-- 1. CRIAR função simples que lista perfis sem verificação de admin
-- (Temporária para resolver o problema imediato)
CREATE OR REPLACE FUNCTION public.list_all_profiles()
RETURNS TABLE (id uuid, email text, name text, role text, user_function text, created_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  -- Retornar todos os perfis sem verificação de admin
  -- (Esta função será usada temporariamente até resolver o problema de auth)
  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.user_function, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 2. CRIAR função que verifica admin via email (alternativa ao auth.uid())
CREATE OR REPLACE FUNCTION public.list_profiles_by_email(p_user_email text)
RETURNS TABLE (id uuid, email text, name text, role text, user_function text, created_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
  user_role text;
BEGIN
  -- Verificar se email é de admin
  SELECT p.role INTO user_role
  FROM public.profiles p
  WHERE p.email = p_user_email;
  
  -- Se não for admin, retornar erro
  IF user_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
    RAISE EXCEPTION 'Permissão negada - email % tem role % mas não é admin', p_user_email, COALESCE(user_role, 'NULL');
  END IF;
  
  -- Retornar todos os perfis
  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.user_function, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 3. CRIAR função que usa service role (bypass completo de RLS)
CREATE OR REPLACE FUNCTION public.list_profiles_service_role()
RETURNS TABLE (id uuid, email text, name text, role text, user_function text, created_at timestamptz)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  -- Esta função usa service role e bypassa RLS completamente
  -- Retornar todos os perfis
  RETURN QUERY
  SELECT p.id, p.email, p.name, p.role, p.user_function, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 4. CONCEDER permissões
GRANT EXECUTE ON FUNCTION public.list_all_profiles() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_profiles_by_email(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_profiles_service_role() TO authenticated, service_role;

-- 5. TESTAR as funções
SELECT '=== TESTE list_all_profiles ===' as info;
SELECT COUNT(*) as total_profiles FROM public.list_all_profiles();

SELECT '=== TESTE list_profiles_service_role ===' as info;
SELECT COUNT(*) as total_profiles FROM public.list_profiles_service_role();

-- 6. VERIFICAR status de autenticação atual
SELECT 
    '=== STATUS DE AUTENTICAÇÃO ===' as info,
    auth.uid() as current_user_id,
    current_user as database_user,
    session_user as session_user;

-- 7. LISTAR todos os perfis para verificar dados
SELECT 
    '=== TODOS OS PERFIS ===' as info,
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC;
