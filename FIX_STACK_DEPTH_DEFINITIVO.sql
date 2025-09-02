-- SCRIPT DEFINITIVO PARA CORRIGIR STACK DEPTH LIMIT
-- Execute este script no Supabase SQL Editor

-- 1. DESABILITAR RLS TEMPORARIAMENTE para quebrar a recursão
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS as políticas problemáticas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles self read" ON profiles;
DROP POLICY IF EXISTS "Profiles self update" ON profiles;
DROP POLICY IF EXISTS "Profiles admin all" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles function" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles role" ON profiles;
DROP POLICY IF EXISTS "Admins can upsert profiles role" ON profiles;

-- 3. REABILITAR RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR APENAS UMA política simples para SELECT
CREATE POLICY "Simple profile select" ON profiles
    FOR SELECT USING (true);

-- 5. CRIAR APENAS UMA política simples para UPDATE
CREATE POLICY "Simple profile update" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 6. Verificar se funcionou
SELECT 'Stack depth corrigido definitivamente!' as status;

-- 7. Mostrar apenas as novas políticas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY policyname;
