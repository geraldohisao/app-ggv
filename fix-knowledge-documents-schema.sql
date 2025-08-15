-- Script para corrigir a tabela knowledge_documents
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. REMOVER a tabela existente (cuidado: isso apagará todos os documentos existentes)
DROP TABLE IF EXISTS knowledge_documents CASCADE;

-- 2. CRIAR a tabela correta para embeddings do Google (768 dimensões)
CREATE TABLE knowledge_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768), -- Para embeddings do Google Embedding API
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HABILITAR RLS
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS DE SEGURANÇA
-- Usuários podem ver apenas seus próprios documentos
CREATE POLICY "Users can view own documents" ON knowledge_documents 
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios documentos
CREATE POLICY "Users can insert own documents" ON knowledge_documents 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus próprios documentos
CREATE POLICY "Users can delete own documents" ON knowledge_documents 
    FOR DELETE USING (auth.uid() = user_id);

-- 5. CRIAR ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_at ON knowledge_documents(created_at);

-- 6. VERIFICAR se tudo está OK
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'knowledge_documents'
ORDER BY ordinal_position;

-- Deve retornar:
-- knowledge_documents | id         | uuid                     | NO
-- knowledge_documents | user_id    | uuid                     | YES
-- knowledge_documents | name       | text                     | NO
-- knowledge_documents | content    | text                     | NO
-- knowledge_documents | embedding  | vector                   | YES
-- knowledge_documents | created_at | timestamp with time zone | YES
