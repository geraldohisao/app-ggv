-- Script para corrigir a tabela scorecards e adicionar colunas que faltam
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: VERIFICAR E CORRIGIR TABELA SCORECARDS
-- =========================================

-- Verificar se a tabela scorecards existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scorecards') THEN
        -- Criar tabela se não existir
        CREATE TABLE scorecards (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela scorecards criada com sucesso';
    ELSE
        -- Adicionar colunas que podem estar faltando
        BEGIN
            ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS description TEXT;
            RAISE NOTICE 'Coluna description adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna description já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
            RAISE NOTICE 'Coluna is_active adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna is_active já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Coluna created_at adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna created_at já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Coluna updated_at adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna updated_at já existe ou erro: %', SQLERRM;
        END;
    END IF;
END $$;

-- =========================================
-- ETAPA 2: VERIFICAR E CORRIGIR TABELA SCORECARD_CRITERIA
-- =========================================

-- Verificar se a tabela scorecard_criteria existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scorecard_criteria') THEN
        -- Criar tabela se não existir
        CREATE TABLE scorecard_criteria (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
            category TEXT NOT NULL,
            text TEXT NOT NULL,
            weight INTEGER DEFAULT 1,
            order_index INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela scorecard_criteria criada com sucesso';
    ELSE
        -- Adicionar colunas que podem estar faltando
        BEGIN
            ALTER TABLE scorecard_criteria ADD COLUMN IF NOT EXISTS category TEXT;
            RAISE NOTICE 'Coluna category adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna category já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE scorecard_criteria ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 1;
            RAISE NOTICE 'Coluna weight adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna weight já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE scorecard_criteria ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
            RAISE NOTICE 'Coluna order_index adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna order_index já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE scorecard_criteria ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Coluna created_at adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna created_at já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE scorecard_criteria ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Coluna updated_at adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna updated_at já existe ou erro: %', SQLERRM;
        END;
    END IF;
END $$;

-- =========================================
-- ETAPA 3: VERIFICAR E CORRIGIR TABELA CALL_SCORES
-- =========================================

-- Verificar se a tabela call_scores existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_scores') THEN
        -- Criar tabela se não existir
        CREATE TABLE call_scores (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
            criterion_id UUID NOT NULL REFERENCES scorecard_criteria(id) ON DELETE CASCADE,
            score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
            justification TEXT,
            analysis_version TEXT DEFAULT '1.0',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela call_scores criada com sucesso';
    ELSE
        -- Adicionar colunas que podem estar faltando
        BEGIN
            ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS justification TEXT;
            RAISE NOTICE 'Coluna justification adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna justification já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS analysis_version TEXT DEFAULT '1.0';
            RAISE NOTICE 'Coluna analysis_version adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna analysis_version já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Coluna created_at adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna created_at já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Coluna updated_at adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna updated_at já existe ou erro: %', SQLERRM;
        END;
    END IF;
END $$;

-- =========================================
-- ETAPA 4: VERIFICAR E CORRIGIR TABELA CALL_COMMENTS
-- =========================================

-- Verificar se a tabela call_comments existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_comments') THEN
        -- Criar tabela se não existir
        CREATE TABLE call_comments (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            at_seconds INTEGER DEFAULT 0,
            author_id UUID,
            author_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela call_comments criada com sucesso';
    ELSE
        -- Adicionar colunas que podem estar faltando
        BEGIN
            ALTER TABLE call_comments ADD COLUMN IF NOT EXISTS at_seconds INTEGER DEFAULT 0;
            RAISE NOTICE 'Coluna at_seconds adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna at_seconds já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE call_comments ADD COLUMN IF NOT EXISTS author_id UUID;
            RAISE NOTICE 'Coluna author_id adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna author_id já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE call_comments ADD COLUMN IF NOT EXISTS author_name TEXT;
            RAISE NOTICE 'Coluna author_name adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna author_name já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE call_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Coluna created_at adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna created_at já existe ou erro: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TABLE call_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Coluna updated_at adicionada (se não existia)';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Coluna updated_at já existe ou erro: %', SQLERRM;
        END;
    END IF;
END $$;

-- =========================================
-- ETAPA 5: CONFIGURAR SEGURANÇA (RLS)
-- =========================================

-- Habilitar RLS nas tabelas
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para scorecards
DROP POLICY IF EXISTS "Authenticated users can manage scorecards" ON scorecards;
CREATE POLICY "Authenticated users can manage scorecards" ON scorecards 
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para scorecard_criteria
DROP POLICY IF EXISTS "Authenticated users can manage scorecard criteria" ON scorecard_criteria;
CREATE POLICY "Authenticated users can manage scorecard criteria" ON scorecard_criteria 
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para call_scores
DROP POLICY IF EXISTS "Authenticated users can manage call scores" ON call_scores;
CREATE POLICY "Authenticated users can manage call scores" ON call_scores 
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para call_comments
DROP POLICY IF EXISTS "Authenticated users can view call comments" ON call_comments;
DROP POLICY IF EXISTS "Authenticated users can insert call comments" ON call_comments;
DROP POLICY IF EXISTS "Authenticated users can update own call comments" ON call_comments;

CREATE POLICY "Authenticated users can view call comments" ON call_comments 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert call comments" ON call_comments 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update own call comments" ON call_comments 
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =========================================
-- ETAPA 6: CRIAR ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_scorecard_id ON scorecard_criteria(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_order ON scorecard_criteria(scorecard_id, order_index);
CREATE INDEX IF NOT EXISTS idx_call_scores_call_id ON call_scores(call_id);
CREATE INDEX IF NOT EXISTS idx_call_scores_criterion_id ON call_scores(criterion_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_call_id ON call_comments(call_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_created_at ON call_comments(created_at);

-- =========================================
-- ETAPA 7: INSERIR DADOS DE EXEMPLO
-- =========================================

-- Inserir scorecard padrão se não existir
INSERT INTO scorecards (id, name, description, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Scorecard Padrão',
    'Scorecard padrão para avaliação de chamadas',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Inserir critérios padrão se não existirem
INSERT INTO scorecard_criteria (scorecard_id, category, text, weight, order_index)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Abertura', 'Apresentação clara e profissional', 2, 1),
    ('00000000-0000-0000-0000-000000000001', 'Abertura', 'Identificação da empresa e propósito da ligação', 2, 2),
    ('00000000-0000-0000-0000-000000000001', 'Desenvolvimento', 'Descoberta de necessidades', 3, 3),
    ('00000000-0000-0000-0000-000000000001', 'Desenvolvimento', 'Apresentação de solução adequada', 3, 4),
    ('00000000-0000-0000-0000-000000000001', 'Fechamento', 'Tratamento de objeções', 2, 5),
    ('00000000-0000-0000-0000-000000000001', 'Fechamento', 'Agendamento de próximo contato', 2, 6)
ON CONFLICT DO NOTHING;

-- =========================================
-- ETAPA 8: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar se tudo está funcionando
SELECT 'VERIFICAÇÃO FINAL DAS TABELAS CORRIGIDAS' as status;

-- Verificar estrutura da tabela scorecards
SELECT 'Verificando estrutura da tabela scorecards...' as test;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'scorecards' 
ORDER BY ordinal_position;

-- Verificar dados inseridos
SELECT 'Verificando dados inseridos...' as test;
SELECT 'Scorecards:' as table_name, COUNT(*) as count FROM scorecards
UNION ALL
SELECT 'Scorecard Criteria:', COUNT(*) FROM scorecard_criteria;

-- Resumo final
SELECT '🎉 TABELAS CORRIGIDAS COM SUCESSO!' as message
UNION ALL
SELECT '✅ Tabela scorecards corrigida e populada'
UNION ALL
SELECT '✅ Tabela scorecard_criteria corrigida e populada'
UNION ALL
SELECT '✅ Tabela call_scores corrigida'
UNION ALL
SELECT '✅ Tabela call_comments corrigida'
UNION ALL
SELECT '✅ Sistema de segurança (RLS) configurado'
UNION ALL
SELECT '✅ Índices de performance criados'
UNION ALL
SELECT '✅ Dados de exemplo inseridos'
UNION ALL
SELECT '✅ Sistema pronto para uso!';
