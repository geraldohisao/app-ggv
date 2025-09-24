-- 🚨 CORREÇÃO CRÍTICA: Eliminar recursão infinita nas políticas RLS da tabela profiles
-- Execute este script no SQL Editor do Supabase para resolver o problema

-- 1. 🔧 DESABILITAR TEMPORARIAMENTE RLS para permitir correções
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. 🗑️ REMOVER TODAS AS POLÍTICAS EXISTENTES (que estão causando conflito)
DROP POLICY IF EXISTS "Profiles self read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles admin all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can upsert profiles role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles function" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;

-- 3. 🔧 CORRIGIR FUNÇÃO is_admin() para evitar recursão
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  -- Usar auth.jwt() para verificar admin baseado no email (sem recursão)
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'),
    false
  );
$$;

-- 4. 🛡️ RECRIAR POLÍTICAS SIMPLES E SEGURAS
-- Política 1: Usuários podem ver apenas seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Política 2: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Política 3: Admins podem ver todos os perfis (sem usar is_admin() para evitar recursão)
CREATE POLICY "profiles_admin_select_all" ON public.profiles
  FOR SELECT USING (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  );

-- Política 4: Admins podem atualizar todos os perfis
CREATE POLICY "profiles_admin_update_all" ON public.profiles
  FOR UPDATE USING (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  ) WITH CHECK (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  );

-- Política 5: Admins podem inserir novos perfis
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT WITH CHECK (
    COALESCE((auth.jwt() ->> 'email') IN ('geraldo@grupoggv.com', 'geraldo@ggvinteligencia.com.br'), false)
  );

-- 5. 🔒 HABILITAR RLS NOVAMENTE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. ✅ GARANTIR QUE A ESTRUTURA DA TABELA ESTÁ CORRETA
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('SUPER_ADMIN','ADMIN','USER')),
  user_function text CHECK (user_function IN ('SDR','Closer','Gestor')),
  email text,
  name text,
  created_at timestamptz DEFAULT now()
);

-- 7. 🔄 RECRIAR TRIGGER PARA NOVOS USUÁRIOS (sem recursão)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email, name)
  VALUES (
    new.id,
    'USER',
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'user_name', 
      new.email
    )
  ) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. 🧪 TESTE DE VERIFICAÇÃO
-- Verificar se as políticas estão funcionando
SELECT 
  '=== TESTE DE POLÍTICAS ===' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- 9. 📊 VERIFICAÇÃO FINAL
SELECT 
  '=== VERIFICAÇÃO FINAL ===' as info,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'USER' THEN 1 END) as user_profiles,
  COUNT(CASE WHEN role IN ('ADMIN', 'SUPER_ADMIN') THEN 1 END) as admin_profiles
FROM public.profiles;

-- 🎉 SCRIPT CONCLUÍDO! 
-- As políticas RLS foram corrigidas para eliminar a recursão infinita
-- Teste agora o acesso à tabela profiles na aplicação
