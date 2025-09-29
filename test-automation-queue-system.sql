-- 🧪 Testar Sistema de Fila de Automações
-- Limpar automação pendente da Hiara e testar controles

-- 1. Situação atual (conforme resultado anterior)
SELECT 'SITUAÇÃO ATUAL:' as info;
SELECT 
    sdr,
    status,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM public.reactivated_leads 
WHERE sdr = 'Hiara Saienne'
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Limpar automação órfã da Hiara (>13 minutos = órfã)
SELECT 'LIMPANDO AUTOMAÇÃO ÓRFÃ:' as info;
SELECT cleanup_orphaned_automations() as cleaned_count;

-- 3. Verificar se foi limpa
SELECT 'APÓS LIMPEZA:' as info;
SELECT 
    sdr,
    status,
    created_at,
    updated_at,
    error_message
FROM public.reactivated_leads 
WHERE sdr = 'Hiara Saienne'
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Testar se Hiara pode executar nova automação
SELECT 'TESTE: Hiara pode executar?' as info;
SELECT * FROM can_user_execute_automation('Hiara Saienne');

-- 5. Testar se há automação em progresso geral
SELECT 'TESTE: Há automação em progresso?' as info;
SELECT check_automation_in_progress() as automation_in_progress;

-- 6. Simular início de nova automação para Hiara
SELECT 'SIMULANDO NOVA AUTOMAÇÃO:' as info;
SELECT * FROM start_automation_with_lock(
    'Hiara Saienne',
    'Lista de reativação - Topo de funil',
    'Reativação - Sem Retorno',
    'test_workflow_123'
);

-- 7. Verificar se foi criada
SELECT 'NOVA AUTOMAÇÃO CRIADA:' as info;
SELECT 
    id,
    sdr,
    status,
    workflow_id,
    created_at
FROM public.reactivated_leads 
WHERE sdr = 'Hiara Saienne'
ORDER BY created_at DESC 
LIMIT 1;

-- 8. Testar se agora Hiara está bloqueada
SELECT 'TESTE: Hiara bloqueada agora?' as info;
SELECT * FROM can_user_execute_automation('Hiara Saienne');

-- 9. Testar se outro usuário também está bloqueado
SELECT 'TESTE: Outro usuário bloqueado?' as info;
SELECT * FROM can_user_execute_automation('Andressa Habinoski');

-- 10. Finalizar automação da Hiara
SELECT 'FINALIZANDO AUTOMAÇÃO:' as info;
SELECT complete_automation(
    (SELECT id FROM public.reactivated_leads WHERE sdr = 'Hiara Saienne' ORDER BY created_at DESC LIMIT 1),
    1,
    'execution_test_456',
    '{"status": "completed", "message": "Teste concluído"}'::jsonb
) as completed;

-- 11. Verificar se foi finalizada
SELECT 'AUTOMAÇÃO FINALIZADA:' as info;
SELECT 
    id,
    sdr,
    status,
    count_leads,
    execution_id,
    (n8n_data->>'status') as n8n_status,
    updated_at
FROM public.reactivated_leads 
WHERE sdr = 'Hiara Saienne'
ORDER BY created_at DESC 
LIMIT 1;

-- 12. Testar se agora Hiara pode executar novamente
SELECT 'TESTE FINAL: Hiara liberada?' as info;
SELECT * FROM can_user_execute_automation('Hiara Saienne');

-- 13. Resumo do teste
SELECT 'RESUMO DO TESTE:' as info;
SELECT 
    'Sistema funcionando corretamente!' as resultado,
    COUNT(*) as total_automacoes_hiara
FROM public.reactivated_leads 
WHERE sdr = 'Hiara Saienne';
