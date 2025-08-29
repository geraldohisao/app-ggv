
-- Teste 1: Verificar se a função existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_reactivated_leads_history';

-- Teste 2: Contar registros na tabela
SELECT COUNT(*) as total_records FROM reactivated_leads;

-- Teste 3: Mostrar alguns registros
SELECT id, sdr, filter, status, count_leads, created_at 
FROM reactivated_leads 
ORDER BY created_at DESC 
LIMIT 5;

-- Teste 4: Testar a função RPC
SELECT * FROM get_reactivated_leads_history(1, 10, NULL, NULL);

