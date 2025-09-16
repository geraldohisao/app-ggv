-- INVESTIGAR DE ONDE VEM A "ETAPA 115"

-- 1. Verificar função get_all_etapas_with_indefinida
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_all_etapas_with_indefinida';

-- 2. Executar a função para ver as etapas disponíveis
SELECT * FROM get_all_etapas_with_indefinida();

-- 3. Verificar se há tabela de etapas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%etapa%' 
   OR table_name ILIKE '%stage%'
   OR table_name ILIKE '%step%'
ORDER BY table_name;

-- 4. Verificar call_type na tabela calls
SELECT DISTINCT call_type 
FROM calls 
WHERE call_type IS NOT NULL
ORDER BY call_type;

-- 5. Verificar se há alguma chamada com call_type = '115'
SELECT 
    id,
    call_type,
    deal_id,
    agent_id,
    created_at
FROM calls 
WHERE call_type = '115'
LIMIT 5;

-- 6. Ver se call_type tem valores numéricos
SELECT DISTINCT call_type 
FROM calls 
WHERE call_type ~ '^[0-9]+$'  -- Regex para números
ORDER BY call_type::integer;

