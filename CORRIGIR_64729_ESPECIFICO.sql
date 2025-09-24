-- 🎯 CORREÇÃO ESPECÍFICA PARA DEAL 64729
-- Execute este comando ÚNICO no Supabase SQL Editor

UPDATE calls 
SET insights = jsonb_build_object(
    'enterprise', 'Inovação Digital S.A.',
    'person', 'Fernanda Costa',
    'company', 'Inovação Digital S.A.',
    'sdr_name', 'Mariana Costa',
    'status_voip_friendly', 'Atendida'
)
WHERE deal_id = '64729';

-- Verificar se funcionou
SELECT 
    deal_id,
    insights->>'enterprise' as empresa,
    insights->>'person' as pessoa,
    insights->>'sdr_name' as sdr
FROM calls 
WHERE deal_id = '64729';

-- Resultado esperado:
-- deal_id | empresa              | pessoa         | sdr
-- 64729   | Inovação Digital S.A.| Fernanda Costa | Mariana Costa

