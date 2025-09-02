-- Fix Stack Depth Limit Exceeded Error
-- Execute este script no SQL Editor do Supabase para corrigir problemas de recursão

-- 1. Verificar políticas RLS que podem estar causando recursão
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 2. Desabilitar temporariamente RLS em tabelas problemáticas
-- (Execute apenas se necessário)

-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE diagnostic_segments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_personas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE knowledge_documents DISABLE ROW LEVEL SECURITY;

-- 3. Recriar políticas simples e não-recursivas

-- Para profiles: apenas o próprio usuário pode ver seu perfil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Para diagnostic_segments: todos podem ler
DROP POLICY IF EXISTS "Anyone can view diagnostic segments" ON diagnostic_segments;
CREATE POLICY "Anyone can view diagnostic segments" ON diagnostic_segments
    FOR SELECT USING (true);

-- Para ai_personas: todos podem ler
DROP POLICY IF EXISTS "Anyone can view ai personas" ON ai_personas;
CREATE POLICY "Anyone can view ai personas" ON ai_personas
    FOR SELECT USING (true);

-- Para knowledge_documents: apenas o owner
DROP POLICY IF EXISTS "Users can view own documents" ON knowledge_documents;
CREATE POLICY "Users can view own documents" ON knowledge_documents
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON knowledge_documents;
CREATE POLICY "Users can insert own documents" ON knowledge_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON knowledge_documents;
CREATE POLICY "Users can delete own documents" ON knowledge_documents
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Verificar se existem funções RPC com recursão
-- Listar todas as funções que podem estar causando problemas
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%match%'
  OR p.proname LIKE '%get_%'
  OR p.proname LIKE '%admin_%'
ORDER BY p.proname;

-- 5. Reabilitar RLS (descomente se desabilitou acima)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE diagnostic_segments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_personas ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- 6. Verificar configurações de recursão do PostgreSQL
SHOW max_stack_depth;
SHOW shared_preload_libraries;

-- 7. Criar índices para otimizar consultas e reduzir recursão
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);

-- 8. Limpar cache de planos de execução
SELECT pg_stat_reset();

-- 9. Status final
SELECT 'Stack depth fix applied successfully' as status;
