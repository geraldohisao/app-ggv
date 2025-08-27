-- Fix RLS policies for calls system
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- CORRIGIR POLICIES DA TABELA CALLS
-- =========================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view calls" ON calls;
DROP POLICY IF EXISTS "Service role can manage calls" ON calls;

-- Create more permissive policies for development/testing
CREATE POLICY "Public read access to calls" ON calls 
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage calls" ON calls 
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- =========================================
-- CRIAR TABELA CALL_COMMENTS SE NÃO EXISTIR
-- =========================================

CREATE TABLE IF NOT EXISTS public.call_comments (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls(id) on delete cascade,
  author_id uuid,
  author_name text,
  text text not null,
  at_seconds int default 0,
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.call_comments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Public read call_comments" ON public.call_comments 
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert call_comments" ON public.call_comments 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authors can update own call_comments" ON public.call_comments 
    FOR UPDATE USING (auth.uid()::text = author_id OR author_id IS NULL);

-- Index
CREATE INDEX IF NOT EXISTS idx_call_comments_call ON public.call_comments(call_id);

-- =========================================
-- AJUSTAR CALL_SCORES SE EXISTIR
-- =========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_scores') THEN
        -- Drop restrictive policies
        DROP POLICY IF EXISTS "call_scores_read" ON public.call_scores;
        DROP POLICY IF EXISTS "call_scores_write" ON public.call_scores;
        
        -- Create permissive policies
        CREATE POLICY "Public read call_scores" ON public.call_scores 
            FOR SELECT USING (true);
        
        CREATE POLICY "Anyone can manage call_scores" ON public.call_scores 
            FOR ALL USING (true);
    END IF;
END $$;

-- =========================================
-- GRANT PERMISSIONS ON TABLES
-- =========================================

GRANT SELECT ON public.calls TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_comments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_scores TO anon, authenticated;

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Este script:
-- 1. Libera acesso de leitura público às calls (temporário para desenvolvimento)
-- 2. Cria a tabela call_comments que estava faltando
-- 3. Ajusta policies para serem mais permissivas
-- 4. Garante que as funções RPC continuem funcionando

