-- fix-scorecard-tables.sql
-- Script para corrigir/criar as tabelas de scorecard
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- VERIFICAR E CRIAR TABELA SCORECARDS
-- =========================================

-- Verificar se a tabela scorecards existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scorecards'
    ) THEN
        -- Criar tabela scorecards
        CREATE TABLE scorecards (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Tabela scorecards criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela scorecards já existe.';
    END IF;
END $$;

-- =========================================
-- VERIFICAR E CRIAR TABELA SCORECARD_CRITERIA
-- =========================================

-- Verificar se a tabela scorecard_criteria existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scorecard_criteria'
    ) THEN
        -- Criar tabela scorecard_criteria
        CREATE TABLE scorecard_criteria (
            id SERIAL PRIMARY KEY,
            scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            category TEXT NOT NULL,
            weight INTEGER DEFAULT 20,
            order_index INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_scorecard_id ON scorecard_criteria(scorecard_id);
        CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_order ON scorecard_criteria(order_index);
        
        RAISE NOTICE 'Tabela scorecard_criteria criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela scorecard_criteria já existe.';
    END IF;
END $$;

-- =========================================
-- VERIFICAR ESTRUTURA ATUAL
-- =========================================

-- Mostrar estrutura da tabela scorecards
SELECT 
    'scorecards' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'scorecards'
ORDER BY ordinal_position;

-- Mostrar estrutura da tabela scorecard_criteria
SELECT 
    'scorecard_criteria' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'scorecard_criteria'
ORDER BY ordinal_position;
