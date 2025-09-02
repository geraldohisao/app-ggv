-- SCRIPT SEGURO PARA SUPABASE
-- Corrige o erro: "Database: stack depth limit exceeded"
-- Este script usa apenas comandos permitidos no Supabase

-- 1. Remover políticas que podem estar causando recursão
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 2. Criar políticas simples e não-recursivas para profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Políticas para knowledge_documents (se a tabela existir)
DROP POLICY IF EXISTS "Users can view own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON knowledge_documents;

-- Criar políticas simples para knowledge_documents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
        CREATE POLICY "Users can view own documents" ON knowledge_documents
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can insert own documents" ON knowledge_documents
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Users can delete own documents" ON knowledge_documents
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Criar índices para otimizar (apenas se não existirem)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- 5. Índice para knowledge_documents (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
        CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);
    END IF;
END $$;

-- 6. Verificar se funcionou
SELECT 'Políticas RLS corrigidas com sucesso!' as status;

-- 7. Mostrar políticas criadas
SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'knowledge_documents')
ORDER BY tablename, policyname;
