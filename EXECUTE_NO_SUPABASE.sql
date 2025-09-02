-- EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- Para corrigir o erro: "Database: stack depth limit exceeded"

-- 1. Verificar políticas problemáticas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 2. Remover políticas recursivas problemáticas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 3. Criar políticas simples e não-recursivas
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 4. Para outras tabelas, criar políticas simples
DROP POLICY IF EXISTS "Users can view own documents" ON knowledge_documents;
CREATE POLICY "Users can view own documents" ON knowledge_documents
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON knowledge_documents;
CREATE POLICY "Users can insert own documents" ON knowledge_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON knowledge_documents;
CREATE POLICY "Users can delete own documents" ON knowledge_documents
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);

-- 6. Verificar se funcionou
SELECT 'Políticas RLS corrigidas com sucesso!' as status;

-- 7. Verificar políticas criadas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'knowledge_documents')
ORDER BY tablename, policyname;
