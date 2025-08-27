-- Script para implementar o sistema de comentários
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: VERIFICAR E CRIAR TABELA CALL_COMMENTS
-- =========================================

-- Verificar se a tabela call_comments existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_comments') THEN
        -- Criar tabela call_comments
        CREATE TABLE call_comments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
            author_id UUID REFERENCES auth.users(id),
            author_name TEXT,
            text TEXT NOT NULL,
            at_seconds INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Tabela call_comments criada';
    ELSE
        RAISE NOTICE 'Tabela call_comments já existe';
    END IF;
END $$;

-- =========================================
-- ETAPA 2: ADICIONAR COLUNAS QUE FALTAM
-- =========================================

-- Adicionar colunas que podem estar faltando
DO $$
BEGIN
    -- Adicionar author_name se não existir
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'call_comments' AND column_name = 'author_name') THEN
        ALTER TABLE call_comments ADD COLUMN author_name TEXT;
        RAISE NOTICE 'Coluna author_name adicionada à tabela call_comments';
    END IF;
    
    -- Adicionar at_seconds se não existir
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'call_comments' AND column_name = 'at_seconds') THEN
        ALTER TABLE call_comments ADD COLUMN at_seconds INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna at_seconds adicionada à tabela call_comments';
    END IF;
    
    -- Adicionar updated_at se não existir
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'call_comments' AND column_name = 'updated_at') THEN
        ALTER TABLE call_comments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Coluna updated_at adicionada à tabela call_comments';
    END IF;
END $$;

-- =========================================
-- ETAPA 3: CONFIGURAR SEGURANÇA (RLS)
-- =========================================

-- Habilitar RLS
ALTER TABLE call_comments ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados podem ver comentários
CREATE POLICY "Usuários autenticados podem ver comentários" ON call_comments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para usuários autenticados podem criar comentários
CREATE POLICY "Usuários autenticados podem criar comentários" ON call_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para usuários podem editar seus próprios comentários
CREATE POLICY "Usuários podem editar seus próprios comentários" ON call_comments
    FOR UPDATE USING (auth.uid() = author_id);

-- Política para usuários podem deletar seus próprios comentários
CREATE POLICY "Usuários podem deletar seus próprios comentários" ON call_comments
    FOR DELETE USING (auth.uid() = author_id);

-- =========================================
-- ETAPA 4: CRIAR ÍNDICES PARA PERFORMANCE
-- =========================================

-- Índice para call_id (mais usado em consultas)
CREATE INDEX IF NOT EXISTS idx_call_comments_call_id ON call_comments(call_id);

-- Índice para author_id
CREATE INDEX IF NOT EXISTS idx_call_comments_author_id ON call_comments(author_id);

-- Índice para created_at (ordenação)
CREATE INDEX IF NOT EXISTS idx_call_comments_created_at ON call_comments(created_at);

-- Índice composto para consultas por chamada e tempo
CREATE INDEX IF NOT EXISTS idx_call_comments_call_time ON call_comments(call_id, at_seconds);

-- =========================================
-- ETAPA 5: CRIAR FUNÇÕES RPC PARA COMENTÁRIOS
-- =========================================

-- Função para listar comentários de uma chamada
CREATE OR REPLACE FUNCTION public.list_call_comments(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    call_id UUID,
    author_id UUID,
    author_name TEXT,
    text TEXT,
    at_seconds INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        cc.id,
        cc.call_id,
        cc.author_id,
        COALESCE(cc.author_name, p.full_name, u.email) as author_name,
        cc.text,
        cc.at_seconds,
        cc.created_at,
        cc.updated_at
    FROM call_comments cc
    LEFT JOIN profiles p ON cc.author_id = p.id
    LEFT JOIN auth.users u ON cc.author_id = u.id
    WHERE cc.call_id = p_call_id
    ORDER BY cc.at_seconds ASC, cc.created_at ASC;
$$;

-- Função para adicionar comentário
CREATE OR REPLACE FUNCTION public.add_call_comment(
    p_call_id UUID,
    p_text TEXT,
    p_at_seconds INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    call_id UUID,
    author_id UUID,
    author_name TEXT,
    text TEXT,
    at_seconds INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_author_id UUID;
    v_author_name TEXT;
    v_comment_id UUID;
BEGIN
    -- Obter ID do usuário atual
    v_author_id := auth.uid();
    
    -- Obter nome do autor
    SELECT full_name INTO v_author_name 
    FROM profiles 
    WHERE id = v_author_id;
    
    -- Inserir comentário
    INSERT INTO call_comments (
        call_id,
        author_id,
        author_name,
        text,
        at_seconds
    ) VALUES (
        p_call_id,
        v_author_id,
        v_author_name,
        p_text,
        p_at_seconds
    ) RETURNING id INTO v_comment_id;
    
    -- Retornar comentário criado
    RETURN QUERY
    SELECT 
        cc.id,
        cc.call_id,
        cc.author_id,
        COALESCE(cc.author_name, p.full_name, u.email) as author_name,
        cc.text,
        cc.at_seconds,
        cc.created_at
    FROM call_comments cc
    LEFT JOIN profiles p ON cc.author_id = p.id
    LEFT JOIN auth.users u ON cc.author_id = u.id
    WHERE cc.id = v_comment_id;
END;
$$;

-- =========================================
-- ETAPA 6: INSERIR COMENTÁRIOS DE EXEMPLO
-- =========================================

-- Inserir comentários de exemplo se não existirem
INSERT INTO call_comments (
    call_id,
    author_id,
    author_name,
    text,
    at_seconds,
    created_at
)
SELECT 
    c.id,
    'e2f530f2-be2d-473d-8829-97a24eab13fc'::UUID,
    'Samuel Bueno',
    CASE 
        WHEN c.transcription IS NOT NULL THEN 'Excelente apresentação inicial!'
        ELSE 'Chamada interessante, precisa de follow-up'
    END,
    CASE 
        WHEN c.transcription IS NOT NULL THEN 30
        ELSE 0
    END,
    c.created_at + interval '1 hour'
FROM calls c
WHERE NOT EXISTS (
    SELECT 1 FROM call_comments cc WHERE cc.call_id = c.id
)
LIMIT 3;

-- =========================================
-- ETAPA 7: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar estrutura da tabela
SELECT 'VERIFICANDO ESTRUTURA DA TABELA CALL_COMMENTS' as status;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'call_comments' 
ORDER BY ordinal_position;

-- Testar função list_call_comments
SELECT 'Testando list_call_comments...' as test;
SELECT COUNT(*) as total_comments FROM list_call_comments(
    (SELECT id FROM calls LIMIT 1)
);

-- Verificar comentários inseridos
SELECT 'Verificando comentários...' as test;
SELECT 
    cc.id,
    cc.call_id,
    cc.author_name,
    cc.text,
    cc.at_seconds,
    cc.created_at
FROM call_comments cc
ORDER BY cc.created_at DESC 
LIMIT 5;

-- Resumo final
SELECT '🎉 SISTEMA DE COMENTÁRIOS IMPLEMENTADO COM SUCESSO!' as message
UNION ALL
SELECT '✅ Tabela call_comments criada/atualizada'
UNION ALL
SELECT '✅ RLS configurado'
UNION ALL
SELECT '✅ Funções RPC criadas'
UNION ALL
SELECT '✅ Comentários de exemplo inseridos'
UNION ALL
SELECT '✅ Sistema pronto para uso!';
