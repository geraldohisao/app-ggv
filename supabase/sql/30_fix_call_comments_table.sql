-- 30_fix_call_comments_table.sql
-- Script para criar a tabela call_comments que está faltando
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- TABELA DE COMENTÁRIOS DE CHAMADAS
-- =========================================

-- Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS public.call_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    at_seconds INTEGER DEFAULT 0,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_call_comments_call_id ON public.call_comments(call_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_created_at ON public.call_comments(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.call_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Users can view call comments" ON public.call_comments;
CREATE POLICY "Users can view call comments" ON public.call_comments 
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert call comments" ON public.call_comments;
CREATE POLICY "Users can insert call comments" ON public.call_comments 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own call comments" ON public.call_comments;
CREATE POLICY "Users can update own call comments" ON public.call_comments 
    FOR UPDATE USING (auth.uid() = author_id);

-- Conceder permissões
GRANT SELECT, INSERT, UPDATE ON public.call_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_comments TO service_role;

-- Verificar se a tabela foi criada
SELECT 
    'call_comments table created successfully' as status,
    COUNT(*) as total_comments
FROM public.call_comments;
