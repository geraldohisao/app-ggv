-- INVESTIGAÇÃO FINAL - VERIFICAR SE HÁ OUTRAS FONTES DE DADOS

-- 1. Ver TODAS as durações únicas no banco (sem limit)
SELECT DISTINCT duration 
FROM calls 
WHERE duration IS NOT NULL 
ORDER BY duration DESC;

-- 2. Verificar se há dados em outras tabelas relacionadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name ILIKE '%call%' 
   OR table_name ILIKE '%duration%'
   OR table_name ILIKE '%phone%'
   OR table_name ILIKE '%voice%'
ORDER BY table_name;

-- 3. Verificar se há views que podem estar mostrando dados diferentes
SELECT 
    table_name,
    view_definition
FROM information_schema.views 
WHERE table_name ILIKE '%call%';

-- 4. Verificar se há funções que retornam dados de calls
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name ILIKE '%call%';

-- 5. Ver amostra de dados RAW da tabela calls
SELECT 
    id,
    duration,
    status_voip,
    created_at,
    agent_id,
    -- Ver se há outros campos de duração
    transcript_status,
    ai_status
FROM calls 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Verificar se há triggers na tabela calls
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'calls';

-- 7. Verificar estrutura completa da tabela calls
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;

