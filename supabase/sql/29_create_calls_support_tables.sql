-- 29_create_calls_support_tables.sql
-- Cria tabelas de suporte para o sistema de análise de chamadas
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- TABELA DE COMENTÁRIOS DE CHAMADAS
-- =========================================

CREATE TABLE IF NOT EXISTS call_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    at_seconds INTEGER DEFAULT 0,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_call_comments_call_id ON call_comments(call_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_created_at ON call_comments(created_at DESC);

-- RLS
ALTER TABLE call_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call comments" ON call_comments 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert call comments" ON call_comments 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own call comments" ON call_comments 
    FOR UPDATE USING (auth.uid() = author_id);

-- =========================================
-- TABELA DE SCORECARDS (TEMPLATES)
-- =========================================

CREATE TABLE IF NOT EXISTS scorecards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir scorecard padrão se não existir
INSERT INTO scorecards (id, name, description) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'Scorecard Padrão GGV',
    'Scorecard padrão para análise de chamadas de vendas'
WHERE NOT EXISTS (
    SELECT 1 FROM scorecards WHERE id = '550e8400-e29b-41d4-a716-446655440000'::UUID
);

-- =========================================
-- TABELA DE CRITÉRIOS DE SCORECARD
-- =========================================

CREATE TABLE IF NOT EXISTS scorecard_criteria (
    id SERIAL PRIMARY KEY,
    scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    category TEXT NOT NULL,
    weight INTEGER DEFAULT 20,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir critérios padrão se não existirem
INSERT INTO scorecard_criteria (scorecard_id, text, category, weight, order_index)
SELECT 
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    criteria.text,
    criteria.category,
    criteria.weight,
    criteria.order_index
FROM (VALUES
    ('Abertura clara e profissional', 'Comunicação', 15, 1),
    ('Exploração de necessidades do cliente', 'Vendas', 25, 2),
    ('Apresentação da solução', 'Vendas', 20, 3),
    ('Tratamento de objeções', 'Vendas', 20, 4),
    ('Fechamento e próximos passos', 'Vendas', 20, 5)
) AS criteria(text, category, weight, order_index)
WHERE NOT EXISTS (
    SELECT 1 FROM scorecard_criteria 
    WHERE scorecard_id = '550e8400-e29b-41d4-a716-446655440000'::UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_scorecard_id ON scorecard_criteria(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_order ON scorecard_criteria(order_index);

-- =========================================
-- TABELA DE SCORES POR CRITÉRIO
-- =========================================

CREATE TABLE IF NOT EXISTS call_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    criterion_id INTEGER REFERENCES scorecard_criteria(id),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
    justification TEXT,
    analysis_version TEXT DEFAULT '2.0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_call_scores_call_id ON call_scores(call_id);
CREATE INDEX IF NOT EXISTS idx_call_scores_criterion_id ON call_scores(criterion_id);

-- RLS
ALTER TABLE call_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call scores" ON call_scores 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage call scores" ON call_scores 
    FOR ALL USING (auth.role() = 'service_role');

-- =========================================
-- FUNÇÃO PARA BUSCAR COMENTÁRIOS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_comments(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    text TEXT,
    at_seconds INTEGER,
    author_name TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        cc.id,
        cc.text,
        cc.at_seconds,
        COALESCE(cc.author_name, 'Usuário') as author_name,
        cc.created_at
    FROM call_comments cc
    WHERE cc.call_id = p_call_id
    ORDER BY cc.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_comments(UUID) TO service_role;

-- =========================================
-- FUNÇÃO PARA BUSCAR SCORES
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_scores(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    score INTEGER,
    justification TEXT,
    scorecard_criteria JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        cs.id,
        cs.score,
        cs.justification,
        jsonb_build_object(
            'id', sc.id,
            'text', sc.text,
            'category', sc.category,
            'weight', sc.weight
        ) as scorecard_criteria,
        cs.created_at
    FROM call_scores cs
    LEFT JOIN scorecard_criteria sc ON cs.criterion_id = sc.id
    WHERE cs.call_id = p_call_id
    ORDER BY sc.order_index ASC, cs.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_scores(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_scores(UUID) TO service_role;

-- =========================================
-- PERMISSIONS GERAIS
-- =========================================

-- Scorecards (apenas leitura para usuários autenticados)
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view scorecards" ON scorecards 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Scorecard criteria (apenas leitura para usuários autenticados)  
ALTER TABLE scorecard_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view scorecard criteria" ON scorecard_criteria 
    FOR SELECT USING (auth.role() = 'authenticated');

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Este script cria:
-- 1. Tabela call_comments para comentários nas chamadas
-- 2. Tabela scorecards para templates de avaliação
-- 3. Tabela scorecard_criteria para critérios de avaliação
-- 4. Tabela call_scores para scores por critério
-- 5. Funções get_call_comments e get_call_scores
-- 6. Políticas RLS apropriadas
-- 7. Dados padrão (scorecard e critérios)
