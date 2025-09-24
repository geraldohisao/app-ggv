-- Script para configurar integração dos setores com banco vetorial
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- ETAPA 0: VERIFICAR E CONFIGURAR EXTENSÕES
-- =========================================

-- Habilitar extensão de vetores (OBRIGATÓRIO)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verificar se a tabela knowledge_documents existe e tem a coluna embedding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'knowledge_documents'
    ) THEN
        RAISE EXCEPTION 'Tabela knowledge_documents não existe. Execute primeiro o script setup-vector-database.sql';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'knowledge_documents' AND column_name = 'embedding'
    ) THEN
        RAISE EXCEPTION 'Coluna embedding não existe na tabela knowledge_documents. Execute primeiro o script setup-vector-database.sql';
    END IF;
END
$$;

-- =========================================
-- ETAPA 1: CRIAR FUNÇÕES RAG COM SETORES
-- =========================================

-- Função de match que inclui documentos do usuário + setores públicos
CREATE OR REPLACE FUNCTION public.kd_match_with_sectors(
  query_embedding vector(768),
  top_k int default 5
)
RETURNS TABLE (
  id uuid,
  name text,
  content text,
  score float4,
  created_at timestamptz,
  is_sector boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- Combinar documentos do usuário + setores públicos
  SELECT
    k.id,
    k.name,
    k.content,
    (1 - (k.embedding::vector <=> query_embedding::vector))::float4 as score,
    k.created_at,
    (k.name like 'SETOR:%') as is_sector
  FROM public.knowledge_documents k
  WHERE (
    k.user_id = auth.uid()                    -- documentos do usuário
    OR (k.user_id IS NULL AND k.name like 'SETOR:%')  -- setores públicos
  )
  ORDER BY k.embedding::vector <=> query_embedding::vector    -- menor distância = mais próximo
  LIMIT greatest(top_k, 0)
$$;

GRANT EXECUTE ON FUNCTION public.kd_match_with_sectors(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kd_match_with_sectors(vector, int) TO service_role;

-- Função específica para buscar apenas setores (para debug/admin)
CREATE OR REPLACE FUNCTION public.sectors_match(
  query_embedding vector(768),
  top_k int default 3
)
RETURNS TABLE (
  id uuid,
  name text,
  content text,
  score float4,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    k.id,
    k.name,
    k.content,
    (1 - (k.embedding::vector <=> query_embedding::vector))::float4 as score,
    k.created_at
  FROM public.knowledge_documents k
  WHERE k.user_id IS NULL AND k.name like 'SETOR:%'
  ORDER BY k.embedding::vector <=> query_embedding::vector
  LIMIT greatest(top_k, 0)
$$;

GRANT EXECUTE ON FUNCTION public.sectors_match(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sectors_match(vector, int) TO service_role;

-- =========================================
-- ETAPA 2: AJUSTAR POLÍTICAS RLS
-- =========================================

-- Permitir inserção de documentos públicos (setores) por admins
-- Nota: Esta política permite que documentos com user_id NULL sejam inseridos
-- Isso é necessário para os setores de atuação serem documentos públicos

-- Remover políticas existentes se houver (para evitar conflitos)
DROP POLICY IF EXISTS "Allow reading public sector documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Allow service_role to insert public documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Allow service_role to delete public documents" ON knowledge_documents;

-- Política para permitir leitura de documentos públicos (setores)
CREATE POLICY "Allow reading public sector documents" ON knowledge_documents 
    FOR SELECT USING (user_id IS NULL AND name like 'SETOR:%');

-- Política para permitir inserção de documentos públicos por service_role
-- (será usado pelo sistema para sincronizar setores)
CREATE POLICY "Allow service_role to insert public documents" ON knowledge_documents 
    FOR INSERT WITH CHECK (user_id IS NULL AND name like 'SETOR:%');

-- Política para permitir deleção de documentos públicos por service_role
CREATE POLICY "Allow service_role to delete public documents" ON knowledge_documents 
    FOR DELETE USING (user_id IS NULL AND name like 'SETOR:%');

-- =========================================
-- ETAPA 3: CRIAR ÍNDICE PARA PERFORMANCE
-- =========================================

-- Índice para melhorar performance de busca por setores
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_sector_name 
ON knowledge_documents (name) 
WHERE name like 'SETOR:%';

-- =========================================
-- ETAPA 4: VERIFICAÇÃO
-- =========================================

-- Verificar se as funções foram criadas
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('kd_match_with_sectors', 'sectors_match');

-- Verificar políticas RLS
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'knowledge_documents' 
AND policyname LIKE '%public%' OR policyname LIKE '%sector%';

COMMENT ON FUNCTION public.kd_match_with_sectors(vector, int) IS 
'Função RAG que busca documentos do usuário + setores de atuação públicos para melhorar respostas da IA';

COMMENT ON FUNCTION public.sectors_match(vector, int) IS 
'Função para buscar apenas setores de atuação - útil para debug e administração';
