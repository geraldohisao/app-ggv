-- 33_fix_calls_system_no_call_type.sql
-- Sistema completo de calls SEM a coluna call_type (que não existe)
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- ETAPA 1: TABELAS DE SUPORTE PARA CALLS
-- =========================================

-- 1. Tabela de comentários de calls
CREATE TABLE IF NOT EXISTS call_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    at_seconds INTEGER DEFAULT 0,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de scorecards
CREATE TABLE IF NOT EXISTS scorecards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    call_type TEXT,
    is_active BOOLEAN DEFAULT true,
    version TEXT DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de critérios dos scorecards
CREATE TABLE IF NOT EXISTS scorecard_criteria (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scorecard_id UUID REFERENCES scorecards(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    text TEXT NOT NULL,
    weight INTEGER DEFAULT 1 CHECK (weight BETWEEN 1 AND 5),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de scores detalhados por call
CREATE TABLE IF NOT EXISTS call_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    criterion_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
    justification TEXT,
    analysis_version TEXT DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de empresas/deals (para relacionar deal_id com nome da empresa)
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deal_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    industry TEXT,
    size TEXT,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- ETAPA 2: ÍNDICES PARA PERFORMANCE
-- =========================================

-- Índices para call_comments
CREATE INDEX IF NOT EXISTS idx_call_comments_call_id ON call_comments(call_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_author_id ON call_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_created_at ON call_comments(created_at);

-- Índices para scorecards
CREATE INDEX IF NOT EXISTS idx_scorecards_call_type ON scorecards(call_type);
CREATE INDEX IF NOT EXISTS idx_scorecards_is_active ON scorecards(is_active);

-- Índices para scorecard_criteria
CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_scorecard_id ON scorecard_criteria(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_order ON scorecard_criteria(scorecard_id, order_index);

-- Índices para call_scores
CREATE INDEX IF NOT EXISTS idx_call_scores_call_id ON call_scores(call_id);
CREATE INDEX IF NOT EXISTS idx_call_scores_criterion_id ON call_scores(criterion_id);

-- Índices para companies
CREATE INDEX IF NOT EXISTS idx_companies_deal_id ON companies(deal_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- =========================================
-- ETAPA 3: CONFIGURAR SEGURANÇA (RLS)
-- =========================================

-- RLS para call_comments
ALTER TABLE call_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view call comments" ON call_comments 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert call comments" ON call_comments 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own comments" ON call_comments 
    FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON call_comments 
    FOR DELETE USING (auth.uid() = author_id);

-- RLS para scorecards
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view scorecards" ON scorecards 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage scorecards" ON scorecards 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- RLS para scorecard_criteria
ALTER TABLE scorecard_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view scorecard criteria" ON scorecard_criteria 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage scorecard criteria" ON scorecard_criteria 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- RLS para call_scores
ALTER TABLE call_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view call scores" ON call_scores 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can manage call scores" ON call_scores 
    FOR ALL USING (auth.role() = 'service_role');

-- RLS para companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view companies" ON companies 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can manage companies" ON companies 
    FOR ALL USING (auth.role() = 'service_role');

-- =========================================
-- ETAPA 4: FUNÇÕES RPC PARA ANÁLISE IA
-- =========================================

-- Função para buscar scorecard por tipo de call
CREATE OR REPLACE FUNCTION public.get_scorecard_by_call_type(
    p_call_type TEXT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    criteria JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        s.id,
        s.name,
        s.description,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', sc.id,
                    'category', sc.category,
                    'text', sc.text,
                    'weight', sc.weight,
                    'order_index', sc.order_index
                ) ORDER BY sc.order_index
            ) FILTER (WHERE sc.id IS NOT NULL),
            '[]'::jsonb
        ) as criteria
    FROM scorecards s
    LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
    WHERE s.call_type = p_call_type 
    AND s.is_active = true
    GROUP BY s.id, s.name, s.description;
$$;

-- Função para salvar análise IA completa
CREATE OR REPLACE FUNCTION public.save_call_analysis(
    p_call_id UUID,
    p_final_score INTEGER,
    p_analysis JSONB,
    p_criteria_scores JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    criterion_record RECORD;
BEGIN
    -- Atualizar a call com o scorecard
    UPDATE calls 
    SET 
        scorecard = jsonb_build_object(
            'finalScore', p_final_score,
            'analysis', p_analysis,
            'analysisDate', NOW(),
            'version', '2.0'
        ),
        ai_status = 'analyzed',
        processed_at = NOW()
    WHERE id = p_call_id;
    
    -- Deletar scores antigos
    DELETE FROM call_scores WHERE call_id = p_call_id;
    
    -- Inserir novos scores por critério
    FOR criterion_record IN 
        SELECT * FROM jsonb_array_elements(p_criteria_scores)
    LOOP
        INSERT INTO call_scores (
            call_id,
            criterion_id,
            score,
            justification,
            analysis_version
        ) VALUES (
            p_call_id,
            (criterion_record.value->>'id')::TEXT,
            (criterion_record.value->>'score')::INTEGER,
            criterion_record.value->>'justification',
            '2.0'
        );
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Erro ao salvar análise da call %: %', p_call_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Função para buscar análise completa de uma call (SEM call_type)
CREATE OR REPLACE FUNCTION public.get_call_analysis(
    p_call_id UUID
)
RETURNS TABLE (
    call_data JSONB,
    comments JSONB,
    scores JSONB,
    scorecard_data JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        -- Dados da call
        jsonb_build_object(
            'id', c.id,
            'company', c.insights->>'company',
            'deal_id', c.deal_id,
            'duration', c.duration,
            'recording_url', c.recording_url,
            'transcription', c.transcription,
            'status', c.status,
            'created_at', c.created_at,
            'scorecard', c.scorecard
        ) as call_data,
        
        -- Comentários
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', cc.id,
                    'text', cc.text,
                    'at_seconds', cc.at_seconds,
                    'author_name', cc.author_name,
                    'created_at', cc.created_at
                ) ORDER BY cc.created_at
            ) FILTER (WHERE cc.id IS NOT NULL),
            '[]'::jsonb
        ) as comments,
        
        -- Scores detalhados
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'criterion_id', cs.criterion_id,
                    'score', cs.score,
                    'justification', cs.justification
                )
            ) FILTER (WHERE cs.id IS NOT NULL),
            '[]'::jsonb
        ) as scores,
        
        -- Dados do scorecard (usando scorecard padrão)
        COALESCE(
            (SELECT jsonb_build_object(
                'name', s.name,
                'description', s.description,
                'criteria', jsonb_agg(
                    jsonb_build_object(
                        'id', sc.id,
                        'category', sc.category,
                        'text', sc.text,
                        'weight', sc.weight
                    ) ORDER BY sc.order_index
                ) FILTER (WHERE sc.id IS NOT NULL)
            ) FROM scorecards s
            LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
            WHERE s.call_type = 'consultoria_vendas' AND s.is_active = true
            GROUP BY s.id, s.name, s.description),
            '{}'::jsonb
        ) as scorecard_data
        
    FROM calls c
    LEFT JOIN call_comments cc ON c.id = cc.call_id
    LEFT JOIN call_scores cs ON c.id = cs.call_id
    WHERE c.id = p_call_id
    GROUP BY c.id, c.insights, c.deal_id, c.duration, c.recording_url, 
             c.transcription, c.status, c.created_at, c.scorecard;
$$;

-- =========================================
-- ETAPA 5: DADOS INICIAIS
-- =========================================

-- Inserir scorecard padrão para "Ligação [Consultoria em Vendas]"
INSERT INTO scorecards (name, description, call_type, is_active) 
VALUES (
    'Ligação [Consultoria em Vendas]',
    'Scorecard para avaliação de ligações de consultoria em vendas',
    'consultoria_vendas',
    true
) ON CONFLICT DO NOTHING;

-- Inserir critérios para o scorecard padrão
INSERT INTO scorecard_criteria (scorecard_id, category, text, weight, order_index)
SELECT 
    s.id,
    c.category,
    c.text,
    c.weight,
    c.order_index
FROM scorecards s
CROSS JOIN (VALUES
    ('Abertura', 'Apresentação clara e profissional', 2, 1),
    ('Identificação de Necessidades', 'Exploração adequada dos desafios do cliente', 3, 2),
    ('Proposta de Valor', 'Comunicação clara do valor da solução', 3, 3),
    ('Tratamento de Objeções', 'Resposta efetiva às objeções', 2, 4),
    ('Fechamento', 'Tentativa de fechamento ou próximo passo', 2, 5),
    ('Qualidade da Comunicação', 'Tom, clareza e profissionalismo', 2, 6),
    ('Tempo de Conversa', 'Duração adequada para o tipo de ligação', 1, 7)
) AS c(category, text, weight, order_index)
WHERE s.call_type = 'consultoria_vendas'
ON CONFLICT DO NOTHING;

-- =========================================
-- ETAPA 6: CONCEDER PERMISSÕES
-- =========================================

GRANT EXECUTE ON FUNCTION public.get_scorecard_by_call_type(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_call_analysis(UUID, INTEGER, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_analysis(UUID) TO authenticated;

-- =========================================
-- ETAPA 7: TRIGGERS PARA SINCRONIZAÇÃO
-- =========================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_call_comments_updated_at 
    BEFORE UPDATE ON call_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scorecards_updated_at 
    BEFORE UPDATE ON scorecards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- ETAPA 8: FUNÇÃO PARA SINCRONIZAR DEALS
-- =========================================

-- Função para sincronizar deal_id com empresa
CREATE OR REPLACE FUNCTION public.sync_deal_company(
    p_deal_id TEXT,
    p_company_name TEXT,
    p_company_email TEXT DEFAULT NULL,
    p_company_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO companies (deal_id, name, email, phone)
    VALUES (p_deal_id, p_company_name, p_company_email, p_company_phone)
    ON CONFLICT (deal_id) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        email = COALESCE(EXCLUDED.email, companies.email),
        phone = COALESCE(EXCLUDED.phone, companies.phone),
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Erro ao sincronizar deal %: %', p_deal_id, SQLERRM;
        RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_deal_company(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_deal_company(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- =========================================
-- VERIFICAÇÃO FINAL
-- =========================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    'Tabelas criadas:' as info,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_comments', 'scorecards', 'scorecard_criteria', 'call_scores', 'companies');

-- Verificar se as funções foram criadas
SELECT 
    'Funções criadas:' as info,
    COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_scorecard_by_call_type', 'save_call_analysis', 'get_call_analysis', 'sync_deal_company');
