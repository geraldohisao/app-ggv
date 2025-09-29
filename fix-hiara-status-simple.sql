-- 🔧 Corrigir status pendente da Hiara - Versão Simples
-- Atualizar de pending para completed

-- 1. Verificar registro atual
SELECT 'ANTES:' as status, id, sdr, status, count_leads, created_at
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
ORDER BY created_at DESC LIMIT 1;

-- 2. Atualizar registro da Hiara
UPDATE public.reactivated_leads 
SET 
    status = 'completed',
    count_leads = 1,
    workflow_id = 'Reativação de Leads',
    execution_id = 'run_1759169903955',
    n8n_data = '{"status": "completed", "message": "1 lead(s) processados", "leadsProcessed": 1, "real": true}'::jsonb,
    updated_at = NOW()
WHERE sdr ILIKE '%hiara%' 
  AND status = 'pending'
  AND id = 48;

-- 3. Verificar resultado
SELECT 'DEPOIS:' as status, id, sdr, status, count_leads, workflow_id, updated_at
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
ORDER BY created_at DESC LIMIT 1;

-- 4. Confirmar sucesso
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Hiara corrigida com sucesso!'
        ELSE '❌ Nenhum registro foi atualizado'
    END as resultado
FROM public.reactivated_leads 
WHERE sdr ILIKE '%hiara%' 
  AND status = 'completed'
  AND id = 48;
