-- 🔍 VERIFICAR: Função edit_call_etapa
-- Script para verificar se a função de editar etapa existe e funciona

-- 1. Verificar se a função edit_call_etapa existe
SELECT 'Verificando se função edit_call_etapa existe:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'edit_call_etapa'
AND routine_schema = 'public';

-- 2. Verificar parâmetros da função
SELECT 'Parâmetros da função edit_call_etapa:' as info;
SELECT 
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters 
WHERE specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'edit_call_etapa'
    AND routine_schema = 'public'
);

-- 3. Testar a função com uma ligação real
SELECT 'Testando função edit_call_etapa:' as info;
-- Primeiro, vamos ver uma ligação para testar
SELECT 
    c.id,
    c.call_type,
    c.agent_id,
    c.created_at
FROM calls c
WHERE c.agent_id = 'Hiara Saienne'
ORDER BY c.created_at DESC
LIMIT 1;

-- 4. Verificar se a função está funcionando
-- (Vamos tentar chamar a função para ver se existe)
SELECT 'Testando chamada da função:' as info;
-- SELECT edit_call_etapa('495aca80-b525-41e6-836e-0e9208e6c73b', 'Ligação');
