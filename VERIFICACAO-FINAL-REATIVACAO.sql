-- 🔍 VERIFICAÇÃO FINAL: Sistema de Reativação
-- Execute este script para validar que tudo está funcionando

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 1: Função de limpeza existe e funciona
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 1: Função cleanup_orphaned_automations' as test;

SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'cleanup_orphaned_automations' THEN '✅ EXISTE'
        ELSE '⚠️ FALTA'
    END as status
FROM pg_proc 
WHERE proname = 'cleanup_orphaned_automations';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 2: Função can_user_execute_automation existe
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 2: Função can_user_execute_automation' as test;

SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'can_user_execute_automation' THEN '✅ EXISTE'
        ELSE '⚠️ FALTA'
    END as status
FROM pg_proc 
WHERE proname = 'can_user_execute_automation';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 3: Função start_automation_with_lock existe
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 3: Função start_automation_with_lock' as test;

SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'start_automation_with_lock' THEN '✅ EXISTE'
        ELSE '⚠️ FALTA'
    END as status
FROM pg_proc 
WHERE proname = 'start_automation_with_lock';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 4: Tabela reactivated_leads existe
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 4: Tabela reactivated_leads' as test;

SELECT 
    tablename,
    CASE 
        WHEN tablename = 'reactivated_leads' THEN '✅ EXISTE'
        ELSE '⚠️ FALTA'
    END as status
FROM pg_tables 
WHERE tablename = 'reactivated_leads' AND schemaname = 'public';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 5: Cron job está ativo
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 5: Cron job cleanup-orphaned-automations' as test;

SELECT 
    jobname,
    schedule,
    active,
    CASE 
        WHEN active = true THEN '✅ ATIVO'
        WHEN active = false THEN '⚠️ INATIVO'
        ELSE '❌ ERRO'
    END as status
FROM cron.job
WHERE jobname = 'cleanup-orphaned-automations';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 6: Hiara Saienne pode executar
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 6: Permissão da Hiara Saienne' as test;

SELECT 
    can_execute,
    message,
    CASE 
        WHEN can_execute = true THEN '✅ PODE EXECUTAR'
        ELSE '❌ BLOQUEADA'
    END as status
FROM can_user_execute_automation('Hiara Saienne');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 7: Outros SDRs podem executar
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 7: Permissões dos outros SDRs' as test;

SELECT 
    'Mariana Costa' as sdr,
    can_execute,
    CASE 
        WHEN can_execute = true THEN '✅ PODE'
        ELSE '❌ BLOQUEADA'
    END as status
FROM can_user_execute_automation('Mariana Costa')
UNION ALL
SELECT 
    'Samuel Bueno' as sdr,
    can_execute,
    CASE 
        WHEN can_execute = true THEN '✅ PODE'
        ELSE '❌ BLOQUEADA'
    END as status
FROM can_user_execute_automation('Samuel Bueno')
UNION ALL
SELECT 
    'Andressa Habinoski' as sdr,
    can_execute,
    CASE 
        WHEN can_execute = true THEN '✅ PODE'
        ELSE '❌ BLOQUEADA'
    END as status
FROM can_user_execute_automation('Andressa Habinoski');

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 8: Não há automações órfãs pendentes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 8: Automações órfãs (deveria ser 0)' as test;

SELECT 
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NENHUMA ÓRFÃ'
        WHEN COUNT(*) > 0 THEN '⚠️ ' || COUNT(*) || ' órfãs encontradas (serão limpas em até 6h)'
    END as status
FROM public.reactivated_leads 
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 9: Histórico recente está correto
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 9: Últimas 5 execuções' as test;

SELECT 
    id,
    sdr,
    status,
    created_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/60, 1) as minutes_ago,
    CASE 
        WHEN status = 'completed' THEN '✅'
        WHEN status = 'failed' THEN '⚠️'
        WHEN status = 'pending' AND created_at > NOW() - INTERVAL '30 minutes' THEN '🕐'
        ELSE '❌'
    END as icon
FROM public.reactivated_leads 
ORDER BY created_at DESC
LIMIT 5;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TESTE 10: Tabela automation_history (N8N)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '🔧 TESTE 10: Tabela automation_history' as test;

SELECT 
    tablename,
    CASE 
        WHEN tablename = 'automation_history' THEN '✅ EXISTE'
        ELSE '⚠️ FALTA'
    END as status
FROM pg_tables 
WHERE tablename = 'automation_history' AND schemaname = 'public';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RESUMO FINAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT '
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 RESUMO DA VERIFICAÇÃO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Se TODOS os testes acima mostraram ✅, então:

✅ Sistema de Reativação: FUNCIONAL
✅ Funções SQL: TODAS CRIADAS
✅ Cron Job: ATIVO
✅ Hiara Saienne: LIBERADA
✅ Outros SDRs: LIBERADOS
✅ Automações órfãs: LIMPAS
✅ Tabelas: EXISTEM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 PRÓXIMO PASSO: Git commit e push

Se algum teste mostrou ⚠️ ou ❌, NÃO fazer commit ainda!
Avisar o desenvolvedor para corrigir primeiro.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
' as resultado;

