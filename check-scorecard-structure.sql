-- check-scorecard-structure.sql
-- Script para verificar a estrutura real das tabelas de scorecard
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- VERIFICAR ESTRUTURA DA TABELA SCORECARDS
-- =========================================

SELECT 
    'scorecards' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'scorecards'
ORDER BY ordinal_position;

-- =========================================
-- VERIFICAR ESTRUTURA DA TABELA SCORECARD_CRITERIA
-- =========================================

SELECT 
    'scorecard_criteria' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'scorecard_criteria'
ORDER BY ordinal_position;

-- =========================================
-- VERIFICAR SE AS TABELAS EXISTEM
-- =========================================

SELECT 
    table_name,
    CASE 
        WHEN table_name = 'scorecards' THEN 'EXISTS'
        WHEN table_name = 'scorecard_criteria' THEN 'EXISTS'
        ELSE 'NOT FOUND'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('scorecards', 'scorecard_criteria');

-- =========================================
-- VERIFICAR DADOS EXISTENTES
-- =========================================

-- Verificar scorecards existentes
SELECT COUNT(*) as total_scorecards FROM scorecards;

-- Verificar critérios existentes
SELECT COUNT(*) as total_criteria FROM scorecard_criteria;
