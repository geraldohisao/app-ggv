-- 🚨 CORREÇÃO EMERGENCIAL DEFINITIVA - Profiles RLS
-- SOLUÇÃO AGRESSIVA PARA ELIMINAR COMPLETAMENTE A RECURSÃO INFINITA

-- 1. 🛑 DESABILITAR COMPLETAMENTE RLS TEMPORARIAMENTE
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. 🗑️ REMOVER TODAS AS POLÍTICAS EXISTENTES (SEM EXCEÇÃO)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
        RAISE NOTICE 'Removida política: %', pol.policyname;
    END LOOP;
END $$;

-- 3. 🧹 LIMPAR FUNÇÕES PROBLEMÁTICAS
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 4. 🔧 CRIAR FUNÇÃO ADMIN SIMPLES E SEGURA (SEM RECURSÃO)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  -- Verificação direta via JWT sem referenciar a tabela profiles
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN (
      'geraldo@grupoggv.com', 
      'geraldo@ggvinteligencia.com.br',
      'admin@grupoggv.com'
    ),
    false
  );
$$;

-- 5. 🛡️ RECRIAR POLÍTICAS ULTRA-SIMPLIFICADAS (SEM RECURSÃO)
-- Política 1: SELECT - Usuários veem apenas seu próprio perfil
CREATE POLICY "profiles_select_own_only" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Política 2: UPDATE - Usuários atualizam apenas seu próprio perfil  
CREATE POLICY "profiles_update_own_only" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Política 3: INSERT - Apenas sistema pode inserir (via trigger)
CREATE POLICY "profiles_insert_system_only" ON public.profiles
  FOR INSERT 
  WITH CHECK (false); -- Bloqueia inserts diretos, apenas via trigger

-- Política 4: ADMIN SELECT - Admins podem ver todos (baseado em email direto)
CREATE POLICY "profiles_admin_select_all" ON public.profiles
  FOR SELECT 
  USING (
    COALESCE(
      (auth.jwt() ->> 'email') IN (
        'geraldo@grupoggv.com', 
        'geraldo@ggvinteligencia.com.br',
        'admin@grupoggv.com'
      ), 
      false
    )
  );

-- Política 5: ADMIN UPDATE - Admins podem atualizar todos (baseado em email direto)
CREATE POLICY "profiles_admin_update_all" ON public.profiles
  FOR UPDATE 
  USING (
    COALESCE(
      (auth.jwt() ->> 'email') IN (
        'geraldo@grupoggv.com', 
        'geraldo@ggvinteligencia.com.br',
        'admin@grupoggv.com'
      ), 
      false
    )
  ) 
  WITH CHECK (
    COALESCE(
      (auth.jwt() ->> 'email') IN (
        'geraldo@grupoggv.com', 
        'geraldo@ggvinteligencia.com.br',
        'admin@grupoggv.com'
      ), 
      false
    )
  );

-- 6. 🔄 RECRIAR TRIGGER PARA NOVOS USUÁRIOS (ULTRA-SIMPLES)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Insert simples sem verificações complexas
  INSERT INTO public.profiles (id, role, email, name)
  VALUES (
    new.id,
    'USER',
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'user_name', 
      split_part(new.email, '@', 1)
    )
  ) ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha o processo
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. 🔒 HABILITAR RLS NOVAMENTE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. 🧪 TESTE IMEDIATO - Verificar se não há recursão
DO $$
BEGIN
  -- Tentar uma consulta simples para detectar recursão
  PERFORM COUNT(*) FROM public.profiles WHERE id = auth.uid();
  RAISE NOTICE '✅ TESTE PASSOU: Consulta simples funcionou sem recursão';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ TESTE FALHOU: %', SQLERRM;
END $$;

-- 9. 📊 VERIFICAÇÃO COMPLETA DAS POLÍTICAS
SELECT 
  '=== POLÍTICAS ATIVAS ===' as info,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN 'OWN_DATA'
    WHEN qual LIKE '%geraldo%' THEN 'ADMIN_ACCESS'
    ELSE 'OTHER'
  END as policy_type
FROM pg_policies 
WHERE tablename = 'profiles' 
AND schemaname = 'public'
ORDER BY policyname;

-- 10. 🎯 VERIFICAÇÃO FINAL DE FUNCIONAMENTO
SELECT 
  '=== VERIFICAÇÃO FINAL ===' as info,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'USER' THEN 1 END) as user_profiles,
  COUNT(CASE WHEN role IN ('ADMIN', 'SUPER_ADMIN') THEN 1 END) as admin_profiles,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as profiles_with_email
FROM public.profiles;

-- 11. 🔍 TESTE DE FUNÇÃO is_admin()
SELECT 
  '=== TESTE FUNÇÃO is_admin() ===' as info,
  public.is_admin() as is_admin_result,
  auth.jwt() ->> 'email' as current_email;

-- 🎉 CORREÇÃO EMERGENCIAL CONCLUÍDA!
-- Agora teste o acesso à tabela profiles na aplicação
-- Se ainda houver problemas, pode ser necessário reiniciar a conexão com o Supabase
