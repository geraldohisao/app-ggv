-- INVESTIGAÇÃO SIMPLES DAS ETAPAS

-- 1. Executar a função para ver as etapas disponíveis
SELECT * FROM get_all_etapas_with_indefinida();

-- 2. Ver todos os call_types distintos
SELECT DISTINCT call_type 
FROM calls 
WHERE call_type IS NOT NULL
ORDER BY call_type;

-- 3. Verificar chamadas com call_type = '115'
SELECT 
    id,
    call_type,
    deal_id,
    agent_id,
    created_at
FROM calls 
WHERE call_type = '115'
LIMIT 5;

-- 4. Ver call_types numéricos
SELECT 
    call_type,
    COUNT(*) as quantidade
FROM calls 
WHERE call_type ~ '^[0-9]+$'
GROUP BY call_type
ORDER BY call_type;

-- 5. Verificar se há tabelas de etapas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%etapa%' 
   OR table_name ILIKE '%stage%'
ORDER BY table_name;

