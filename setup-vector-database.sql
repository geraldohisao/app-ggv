-- Script completo para configurar o banco vetorial no Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- =========================================
-- ETAPA 1: HABILITAR EXTENSÕES NECESSÁRIAS
-- =========================================

-- Habilitar extensão de UUID (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar extensão de vetores (OBRIGATÓRIO para embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================
-- ETAPA 2: REMOVER TABELA EXISTENTE (se houver)
-- =========================================

-- ATENÇÃO: Isso apagará todos os documentos existentes
DROP TABLE IF EXISTS knowledge_documents CASCADE;

-- =========================================
-- ETAPA 3: CRIAR TABELA DE DOCUMENTOS
-- =========================================

CREATE TABLE knowledge_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768), -- Para embeddings do Google Embedding API (768 dimensões)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- ETAPA 4: CONFIGURAR SEGURANÇA (RLS)
-- =========================================

-- Habilitar Row Level Security
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios documentos
CREATE POLICY "Users can view own documents" ON knowledge_documents 
    FOR SELECT USING (auth.uid() = user_id);

-- Política: Usuários podem inserir seus próprios documentos
CREATE POLICY "Users can insert own documents" ON knowledge_documents 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios documentos
CREATE POLICY "Users can delete own documents" ON knowledge_documents 
    FOR DELETE USING (auth.uid() = user_id);

-- =========================================
-- ETAPA 5: CRIAR ÍNDICES PARA PERFORMANCE
-- =========================================

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id 
    ON knowledge_documents(user_id);

-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at 
    ON knowledge_documents(created_at);

-- Índice para busca vetorial (similaridade)
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding 
    ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);

-- =========================================
-- ETAPA 6: VERIFICAÇÕES FINAIS
-- =========================================

-- Verificar se a extensão vector está habilitada
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verificar estrutura da tabela
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'knowledge_documents'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'knowledge_documents';

-- =========================================
-- RESULTADO ESPERADO:
-- =========================================

-- A query acima deve retornar:
-- knowledge_documents | id         | uuid                     | NO
-- knowledge_documents | user_id    | uuid                     | YES
-- knowledge_documents | name       | text                     | NO
-- knowledge_documents | content    | text                     | NO
-- knowledge_documents | embedding  | vector                   | YES
-- knowledge_documents | created_at | timestamp with time zone | YES

-- E 3 políticas RLS devem estar ativas

-- =========================================
-- TESTE FINAL
-- =========================================

-- Inserir um documento de teste (substitua 'seu-user-id' pelo seu UUID real)
-- INSERT INTO knowledge_documents (user_id, name, content, embedding) 
-- VALUES (
--     auth.uid(),
--     'Teste',
--     'Este é um documento de teste',
--     '[0.1, 0.2, 0.3]'::vector(3)  -- Embedding de teste com 3 dimensões
-- );

-- Se o INSERT acima funcionar, sua tabela está configurada corretamente!
-- Lembre-se de deletar o documento de teste depois:
-- DELETE FROM knowledge_documents WHERE name = 'Teste';

SELECT '✅ Banco vetorial configurado com sucesso!' as status;
