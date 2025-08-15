-- Script para debugar políticas RLS e verificar problemas de persistência
-- Execute este script no SQL Editor do Supabase para diagnosticar problemas

-- =========================================
-- VERIFICAR ESTADO ATUAL DA TABELA
-- =========================================

-- 1. Verificar se a tabela existe
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'knowledge_documents';

-- 2. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'knowledge_documents'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'knowledge_documents';

-- 4. Verificar políticas RLS ativas
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
WHERE tablename = 'knowledge_documents';

-- =========================================
-- VERIFICAR EXTENSÕES
-- =========================================

-- 5. Verificar se a extensão vector está habilitada
SELECT 
    extname,
    extversion
FROM pg_extension 
WHERE extname = 'vector';

-- =========================================
-- VERIFICAR DADOS EXISTENTES
-- =========================================

-- 6. Contar documentos total (como admin)
SELECT COUNT(*) as total_documents FROM knowledge_documents;

-- 7. Verificar documentos por usuário
SELECT 
    user_id,
    COUNT(*) as document_count,
    MAX(created_at) as last_document
FROM knowledge_documents 
GROUP BY user_id;

-- 8. Verificar estrutura dos embeddings
SELECT 
    id,
    name,
    LENGTH(content) as content_length,
    array_length(embedding, 1) as embedding_dimensions,
    created_at
FROM knowledge_documents 
LIMIT 5;

-- =========================================
-- TESTE DE INSERÇÃO (COMO USUÁRIO ATUAL)
-- =========================================

-- 9. Verificar usuário atual
SELECT auth.uid() as current_user_id;

-- 10. Tentar inserir um documento de teste
INSERT INTO knowledge_documents (user_id, name, content, embedding) 
VALUES (
    auth.uid(),
    'TESTE_DEBUG',
    'Este é um documento de teste para verificar se a inserção funciona',
    ARRAY[0.1, 0.2, 0.3]::real[]::vector(3)
) 
RETURNING id, name, user_id, created_at;

-- 11. Verificar se o documento de teste foi inserido
SELECT 
    id,
    name,
    user_id,
    created_at
FROM knowledge_documents 
WHERE name = 'TESTE_DEBUG' AND user_id = auth.uid();

-- 12. Limpar documento de teste
DELETE FROM knowledge_documents 
WHERE name = 'TESTE_DEBUG' AND user_id = auth.uid();

-- =========================================
-- VERIFICAR PERMISSÕES
-- =========================================

-- 13. Verificar permissões da tabela
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'knowledge_documents';

-- =========================================
-- RESULTADOS ESPERADOS
-- =========================================

-- Se tudo estiver funcionando, você deve ver:
-- ✅ Tabela knowledge_documents existe
-- ✅ Colunas: id, user_id, name, content, embedding, created_at
-- ✅ RLS habilitado (rowsecurity = true)
-- ✅ 3 políticas ativas (SELECT, INSERT, DELETE)
-- ✅ Extensão vector instalada
-- ✅ Inserção e busca de teste funcionando

SELECT '🔍 Diagnóstico completo executado!' as status;
