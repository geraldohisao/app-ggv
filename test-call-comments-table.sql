-- test-call-comments-table.sql
-- Script para testar e criar a tabela call_comments

-- 1. Verificar se a tabela existe
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN 'EXISTS'
        ELSE 'NOT EXISTS'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'call_comments';

-- 2. Se não existir, criar a tabela
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'call_comments'
    ) THEN
        -- Criar a tabela
        CREATE TABLE public.call_comments (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            at_seconds INTEGER DEFAULT 0,
            author_id UUID REFERENCES auth.users(id),
            author_name TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX idx_call_comments_call_id ON public.call_comments(call_id);
        CREATE INDEX idx_call_comments_created_at ON public.call_comments(created_at DESC);
        
        -- Habilitar RLS
        ALTER TABLE public.call_comments ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas
        CREATE POLICY "Users can view call comments" ON public.call_comments 
            FOR SELECT USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Users can insert call comments" ON public.call_comments 
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Users can update own call comments" ON public.call_comments 
            FOR UPDATE USING (auth.uid() = author_id);
        
        -- Conceder permissões
        GRANT SELECT, INSERT, UPDATE ON public.call_comments TO authenticated;
        GRANT SELECT, INSERT, UPDATE ON public.call_comments TO service_role;
        
        RAISE NOTICE 'Tabela call_comments criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela call_comments já existe!';
    END IF;
END $$;

-- 3. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'call_comments'
ORDER BY ordinal_position;

-- 4. Verificar políticas RLS
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'call_comments';

-- 5. Testar inserção de comentário de exemplo
INSERT INTO public.call_comments (call_id, text, at_seconds, author_name)
SELECT 
    c.id,
    'Comentário de teste - tabela funcionando!',
    30,
    'Sistema'
FROM public.calls c 
LIMIT 1
ON CONFLICT DO NOTHING;

-- 6. Verificar comentários inseridos
SELECT 
    id,
    call_id,
    text,
    at_seconds,
    author_name,
    created_at
FROM public.call_comments
ORDER BY created_at DESC
LIMIT 5;
