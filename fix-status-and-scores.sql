-- 🔧 CORRIGIR: Status amigável e notas
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se status_voip_friendly tem dados
SELECT 
    'Verificando status_voip_friendly:' as info,
    id,
    status_voip,
    status_voip_friendly,
    call_type
FROM calls 
WHERE status_voip_friendly IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verificar se há análises com notas
SELECT 
    'Verificando análises com notas:' as info,
    ca.id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at
FROM call_analysis ca
WHERE ca.final_grade IS NOT NULL
ORDER BY ca.created_at DESC
LIMIT 5;

-- 3. Atualizar status_voip_friendly para ligações sem tradução
UPDATE calls 
SET status_voip_friendly = CASE 
    WHEN status_voip = 'no_answer' THEN 'Não Atendida'
    WHEN status_voip = 'normal_clearing' THEN 'Atendida'
    WHEN status_voip = 'originator_cancel' THEN 'Cancelada pela SDR'
    WHEN status_voip = 'number_changed' THEN 'Número Mudou'
    WHEN status_voip = 'busy' THEN 'Ocupado'
    WHEN status_voip = 'failed' THEN 'Falhou'
    WHEN status_voip = 'congestion' THEN 'Congestionamento'
    WHEN status_voip = 'timeout' THEN 'Timeout'
    WHEN status_voip = 'rejected' THEN 'Rejeitada'
    WHEN status_voip = 'unavailable' THEN 'Indisponível'
    ELSE status_voip
END
WHERE status_voip_friendly IS NULL OR status_voip_friendly = '';

-- 4. Verificar se as notas estão sendo exibidas corretamente
SELECT 
    'Verificando notas na tabela calls:' as info,
    c.id,
    c.agent_id,
    c.call_type,
    c.scorecard->>'final_score' as scorecard_final_score,
    ca.final_grade as analysis_final_grade
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.scorecard IS NOT NULL OR ca.final_grade IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 5;

-- 5. Atualizar scorecard na tabela calls com notas das análises
UPDATE calls 
SET scorecard = jsonb_set(
    COALESCE(scorecard, '{}'::jsonb),
    '{final_score}',
    to_jsonb(ca.final_grade)
)
FROM call_analysis ca
WHERE calls.id = ca.call_id
AND ca.final_grade IS NOT NULL
AND (calls.scorecard->>'final_score' IS NULL OR calls.scorecard->>'final_score' = 'null');

-- 6. Verificar resultado das correções
SELECT 
    'Resultado das correções:' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN status_voip_friendly IS NOT NULL AND status_voip_friendly != '' THEN 1 END) as calls_with_friendly_status,
    COUNT(CASE WHEN scorecard->>'final_score' IS NOT NULL AND scorecard->>'final_score' != 'null' THEN 1 END) as calls_with_scores
FROM calls;
