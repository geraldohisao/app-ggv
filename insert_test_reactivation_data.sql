-- Script para inserir dados de teste na tabela reactivated_leads

-- 1. Inserir alguns registros de teste
INSERT INTO public.reactivated_leads (
    sdr,
    filter,
    status,
    count_leads,
    cadence,
    workflow_id,
    execution_id,
    n8n_data,
    error_message,
    created_at,
    updated_at
) VALUES 
(
    'Andressa',
    'Lista de reativação - Topo de funil',
    'completed',
    25,
    'Reativação - Sem Retorno',
    'wf_test_001',
    'exec_test_001',
    '{"status": "completed", "message": "25 leads processados", "leadsProcessed": 25}',
    NULL,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
),
(
    'Lô-Ruama Oliveira',
    'Lista de reativação - Fundo de funil',
    'completed',
    15,
    'Reativação - Sem Retorno',
    'wf_test_002',
    'exec_test_002',
    '{"status": "completed", "message": "15 leads processados", "leadsProcessed": 15}',
    NULL,
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '3 hours'
),
(
    'Isabel Pestilho',
    'Lista de reativação - Topo de funil - NO SHOW',
    'failed',
    0,
    'Reativação - Sem Retorno',
    'wf_test_003',
    'exec_test_003',
    '{"status": "failed", "message": "Erro no processamento", "error": "Timeout"}',
    'Erro no processamento dos leads',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '5 hours'
),
(
    'Camila Ataliba',
    'Lista de reativação - Topo de funil',
    'processing',
    0,
    'Reativação - Sem Retorno',
    'wf_test_004',
    'exec_test_004',
    '{"status": "processing", "message": "Processando leads..."}',
    NULL,
    NOW() - INTERVAL '30 minutes',
    NOW() - INTERVAL '30 minutes'
),
(
    'Andressa',
    'Lista de reativação - Fundo de funil',
    'pending',
    0,
    'Reativação - Sem Retorno',
    'wf_test_005',
    'exec_test_005',
    '{"status": "pending", "message": "Aguardando processamento"}',
    NULL,
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '10 minutes'
);

-- 2. Verificar se os dados foram inseridos
SELECT 
    COUNT(*) as total_inserted,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM public.reactivated_leads;

-- 3. Mostrar os dados inseridos
SELECT 
    id,
    sdr,
    filter,
    status,
    count_leads,
    created_at,
    updated_at
FROM public.reactivated_leads
ORDER BY created_at DESC;

-- 4. Testar a função RPC com os dados inseridos
SELECT * FROM public.get_reactivated_leads_history(1, 10, NULL, NULL);
