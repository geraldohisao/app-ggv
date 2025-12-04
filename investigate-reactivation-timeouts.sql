-- 🔍 INVESTIGAÇÃO: Timeouts de Reativação de Leads
-- SDRs: Mariana Costa, Samuel Bueno, Andressa Habinoski, Hiara Saienne

-- ===================================================================
-- PARTE 1: HISTÓRICO RECENTE DOS 4 SDRs
-- ===================================================================
SELECT 
    '📊 PARTE 1: Execuções Recentes dos 4 SDRs' as info;

SELECT 
    id,
    sdr,
    filter,
    cadence,
    status,
    count_leads,
    created_at,
    updated_at,
    error_message,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago,
    -- Calcular idade da execução
    CASE 
        WHEN status = 'pending' AND created_at < NOW() - INTERVAL '30 minutes' THEN '⚠️ ÓRFÃ (>30min)'
        WHEN status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes' THEN '⏰ TIMEOUT (>10min)'
        WHEN status = 'pending' THEN '🕐 PENDENTE'
        WHEN status = 'completed' THEN '✅ CONCLUÍDA'
        WHEN status = 'failed' THEN '❌ FALHOU'
        ELSE '❓ ' || status
    END as status_icon
FROM public.reactivated_leads 
WHERE sdr IN ('Mariana Costa', 'Samuel Bueno', 'Andressa Habinoski', 'Hiara Saienne')
ORDER BY created_at DESC
LIMIT 20;

-- ===================================================================
-- PARTE 2: VERIFICAR SE HIARA PODE EXECUTAR
-- ===================================================================
SELECT 
    '🔍 PARTE 2: Verificação de Permissão - Hiara Saienne' as info;

SELECT * FROM can_user_execute_automation('Hiara Saienne');

-- ===================================================================
-- PARTE 3: VERIFICAR SE OUTROS PODEM EXECUTAR
-- ===================================================================
SELECT 
    '🔍 PARTE 3: Verificação de Permissão - Outros SDRs' as info;

SELECT * FROM can_user_execute_automation('Mariana Costa')
UNION ALL
SELECT * FROM can_user_execute_automation('Samuel Bueno')
UNION ALL
SELECT * FROM can_user_execute_automation('Andressa Habinoski');

-- ===================================================================
-- PARTE 4: VERIFICAR AUTOMAÇÃO GERAL EM PROGRESSO
-- ===================================================================
SELECT 
    '⚙️ PARTE 4: Verificação Geral de Automações' as info;

SELECT check_automation_in_progress() as automation_in_progress;

-- ===================================================================
-- PARTE 5: AUTOMAÇÕES ÓRFÃS (>30 minutos pendentes)
-- ===================================================================
SELECT 
    '🚨 PARTE 5: Automações Órfãs (>30 minutos)' as info;

SELECT 
    id,
    sdr,
    filter,
    status,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_pending,
    error_message
FROM public.reactivated_leads 
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes'
ORDER BY created_at ASC;

-- ===================================================================
-- PARTE 6: HISTÓRICO DO AUTOMATION_HISTORY (N8N)
-- ===================================================================
SELECT 
    '📡 PARTE 6: Histórico N8N (automation_history)' as info;

SELECT 
    id,
    proprietario as sdr,
    filtro as filter,
    status,
    created_at,
    updated_at,
    error_message,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago,
    (n8n_response->>'workflowId') as workflow_id,
    (n8n_response->>'message') as n8n_message,
    (n8n_response->>'timeout')::boolean as had_timeout
FROM public.automation_history 
WHERE proprietario IN ('Mariana Costa', 'Samuel Bueno', 'Andressa Habinoski', 'Hiara Saienne')
  AND created_at > NOW() - INTERVAL '2 days'
ORDER BY created_at DESC
LIMIT 20;

-- ===================================================================
-- PARTE 7: CORRELAÇÃO ENTRE REACTIVATED_LEADS E AUTOMATION_HISTORY
-- ===================================================================
SELECT 
    '🔗 PARTE 7: Correlação entre Tabelas' as info;

SELECT 
    rl.id as reactivated_id,
    rl.sdr,
    rl.status as reactivated_status,
    rl.created_at as reactivated_created,
    ah.id as automation_id,
    ah.status as automation_status,
    ah.created_at as automation_created,
    ah.error_message as automation_error,
    (ah.n8n_response->>'timeout')::boolean as had_timeout
FROM public.reactivated_leads rl
LEFT JOIN public.automation_history ah 
    ON rl.sdr = ah.proprietario 
    AND rl.filter = ah.filtro
    AND ABS(EXTRACT(EPOCH FROM (rl.created_at - ah.created_at))) < 10 -- Criados com diferença de até 10 segundos
WHERE rl.sdr IN ('Mariana Costa', 'Samuel Bueno', 'Andressa Habinoski', 'Hiara Saienne')
  AND rl.created_at > NOW() - INTERVAL '2 days'
ORDER BY rl.created_at DESC;

-- ===================================================================
-- PARTE 8: RESUMO EXECUTIVO
-- ===================================================================
SELECT 
    '📋 PARTE 8: Resumo Executivo' as info;

WITH recent_executions AS (
    SELECT 
        sdr,
        status,
        COUNT(*) as count,
        MAX(created_at) as last_execution,
        MIN(created_at) as first_execution
    FROM public.reactivated_leads 
    WHERE sdr IN ('Mariana Costa', 'Samuel Bueno', 'Andressa Habinoski', 'Hiara Saienne')
      AND created_at > NOW() - INTERVAL '2 days'
    GROUP BY sdr, status
)
SELECT 
    sdr,
    status,
    count,
    last_execution,
    EXTRACT(EPOCH FROM (NOW() - last_execution))/60 as minutes_since_last,
    CASE 
        WHEN status = 'pending' AND last_execution < NOW() - INTERVAL '30 minutes' THEN '🚨 PRECISA LIMPEZA'
        WHEN status = 'pending' THEN '⏳ AGUARDANDO'
        WHEN status = 'completed' THEN '✅ OK'
        WHEN status = 'failed' THEN '❌ ERRO'
        ELSE status
    END as action_needed
FROM recent_executions
ORDER BY sdr, last_execution DESC;

-- ===================================================================
-- 💡 SOLUÇÃO SUGERIDA
-- ===================================================================
SELECT 
    '💡 PARTE 9: Solução Sugerida' as info;

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 
            '🔧 EXECUTAR: SELECT cleanup_orphaned_automations(); -- Vai limpar ' || COUNT(*) || ' automações órfãs'
        ELSE 
            '✅ TUDO OK: Não há automações órfãs para limpar'
    END as recommendation
FROM public.reactivated_leads 
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes';


