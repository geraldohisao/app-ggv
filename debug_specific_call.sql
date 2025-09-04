-- Debug da chamada específica que está com problema
-- ID: 99e0cf47-ed7a-4c3f-ae9a-439c73d7e179

-- 1. Dados diretos da tabela
SELECT 'DADOS DIRETOS DA TABELA:' as info;
SELECT 
  id,
  duration as duration_original,
  duration_formated,
  EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER as duration_convertida,
  enterprise,
  person,
  agent_id,
  sdr_name
FROM calls 
WHERE id = '99e0cf47-ed7a-4c3f-ae9a-439c73d7e179';

-- 2. Dados via função RPC
SELECT 'DADOS VIA FUNÇÃO RPC:' as info;
SELECT 
  id,
  duration,
  duration_formated,
  enterprise,
  person,
  agent_id
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0)
WHERE id = '99e0cf47-ed7a-4c3f-ae9a-439c73d7e179';

-- 3. Testar conversão manual
SELECT 'TESTE DE CONVERSÃO MANUAL:' as info;
SELECT 
  '00:03:20' as input,
  EXTRACT(EPOCH FROM '00:03:20'::TIME)::INTEGER as output_segundos,
  '3 minutos e 20 segundos' as esperado;

-- 4. Verificar se a função está retornando duration correto
SELECT 'VERIFICANDO SE FUNÇÃO RETORNA DURATION CORRETO:' as info;
SELECT 
  duration_formated,
  duration,
  CASE 
    WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
      EXTRACT(EPOCH FROM duration_formated::TIME)::INTEGER
    ELSE duration 
  END as duration_deveria_ser
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0)
WHERE duration_formated IS NOT NULL
ORDER BY duration_formated DESC;
