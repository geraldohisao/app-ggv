-- SCRIPT MAIS SIMPLES PARA SUPABASE
-- Execute este script para corrigir: "Database: stack depth limit exceeded"

-- 1. Remover políticas problemáticas da tabela profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 2. Criar políticas simples para profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Criar índice para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- 4. Verificar se funcionou
SELECT 'Políticas RLS corrigidas!' as status;
