-- ================================================================
-- 🔧 ADICIONAR COLUNA DE STATUS PARA USUÁRIOS
-- ================================================================
-- PROBLEMA: Usuários excluídos do Google ainda aparecem no sistema
-- SOLUÇÃO: Adicionar coluna is_active para marcar usuários como ativos/inativos
-- ================================================================

-- 1️⃣ Adicionar coluna is_active na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- 2️⃣ Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 3️⃣ Comentário para documentação
COMMENT ON COLUMN public.profiles.is_active IS 'Indica se o usuário está ativo. False para usuários excluídos do Google ou desativados manualmente.';

-- 4️⃣ Atualizar função list_all_profiles para incluir is_active
DROP FUNCTION IF EXISTS public.list_all_profiles();
CREATE OR REPLACE FUNCTION public.list_all_profiles()
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
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_all_profiles() TO authenticated, service_role;

-- 5️⃣ Criar função para ativar/desativar usuário
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
  p_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  -- Atualizar status do usuário
  UPDATE public.profiles
  SET is_active = p_is_active
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(UUID, BOOLEAN) TO authenticated, service_role;

-- 6️⃣ Atualizar função admin_list_profiles para incluir is_active
DROP FUNCTION IF EXISTS public.admin_list_profiles();
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
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
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.is_active
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated, service_role;

-- 7️⃣ Ver usuários inativos (para conferência)
SELECT 
  '🔍 USUÁRIOS INATIVOS' as info,
  COUNT(*) FILTER (WHERE is_active = false) as inativos,
  COUNT(*) FILTER (WHERE is_active = true) as ativos,
  COUNT(*) as total
FROM public.profiles;

-- ================================================================
-- ✅ MIGRAÇÃO COMPLETA
-- ================================================================
-- Execute este script no SQL Editor do Supabase
-- Depois, atualize o frontend para suportar o novo campo
-- ================================================================

