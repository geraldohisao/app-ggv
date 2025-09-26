-- ===================================================================
-- CORREÇÃO DEFINITIVA: Mapear agent_id para sdr_id correto
-- ===================================================================
-- Problema: 2507 calls com sdr_id NULL
-- Solução: Mapear agent_id para sdr_id correto das profiles

-- 1. VERIFICAR AGENT_IDS QUE PRECISAM DE MAPEAMENTO
SELECT 
  'AGENT_IDS QUE PRECISAM DE MAPEAMENTO' as info,
  c.agent_id,
  COUNT(*) as total_calls,
  COUNT(ca.call_id) as calls_com_analise
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.sdr_id IS NULL
  AND c.agent_id IS NOT NULL
  AND c.agent_id != ''
GROUP BY c.agent_id
ORDER BY total_calls DESC
LIMIT 10;

-- 2. VERIFICAR PROFILES DISPONÍVEIS
SELECT 
  'PROFILES DISPONÍVEIS' as info,
  id,
  full_name,
  email,
  created_at
FROM profiles 
ORDER BY created_at;

-- 3. MAPEAR AGENT_ID PARA SDR_ID CORRETO
-- Mapear Andressa
UPDATE calls 
SET sdr_id = (SELECT id FROM profiles WHERE LOWER(full_name) LIKE '%andressa%' ORDER BY created_at LIMIT 1)
WHERE agent_id = 'Andressa' AND sdr_id IS NULL;

-- Mapear Camila
UPDATE calls 
SET sdr_id = (SELECT id FROM profiles WHERE LOWER(full_name) LIKE '%camila%' ORDER BY created_at LIMIT 1)
WHERE agent_id = 'Camila' AND sdr_id IS NULL;

-- Mapear Mariana
UPDATE calls 
SET sdr_id = (SELECT id FROM profiles WHERE LOWER(full_name) LIKE '%mariana%' ORDER BY created_at LIMIT 1)
WHERE agent_id = 'Mariana' AND sdr_id IS NULL;

-- Mapear Lô-Ruama
UPDATE calls 
SET sdr_id = (SELECT id FROM profiles WHERE LOWER(full_name) LIKE '%lô-ruama%' OR LOWER(full_name) LIKE '%loruama%' ORDER BY created_at LIMIT 1)
WHERE agent_id = 'Lô-Ruama' AND sdr_id IS NULL;

-- Mapear William
UPDATE calls 
SET sdr_id = (SELECT id FROM profiles WHERE LOWER(full_name) LIKE '%william%' ORDER BY created_at LIMIT 1)
WHERE agent_id = 'William' AND sdr_id IS NULL;

-- 4. VERIFICAR MAPEAMENTO APÓS ATUALIZAÇÃO
SELECT 
  'APÓS MAPEAMENTO - Calls por SDR' as info,
  c.agent_id,
  c.sdr_id,
  p.full_name as profile_name,
  COUNT(*) as total_calls,
  COUNT(ca.call_id) as calls_com_analise,
  AVG(ca.final_grade) as nota_media
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE c.agent_id IS NOT NULL
  AND c.agent_id != ''
GROUP BY c.agent_id, c.sdr_id, p.full_name
ORDER BY total_calls DESC;

-- 5. RECRIAR FUNÇÃO COM LÓGICA SIMPLIFICADA
DROP FUNCTION IF EXISTS public.get_sdr_metrics_with_analysis(INTEGER);

CREATE OR REPLACE FUNCTION public.get_sdr_metrics_with_analysis(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    sdr_id TEXT,
    sdr_name TEXT,
    total_calls BIGINT,
    answered_calls BIGINT,
    avg_duration NUMERIC,
    avg_score NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH calls_with_scores AS (
        -- Buscar calls COM análise para scores
        SELECT 
            COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
            c.sdr_id as profile_sdr_id,
            c.status_voip,
            c.duration,
            ca.final_grade
        FROM calls c
        INNER JOIN call_analysis ca ON c.id = ca.call_id
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND ca.final_grade IS NOT NULL
    ),
    calls_totals AS (
        -- Buscar TODAS as calls para totais
        SELECT 
            COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
            c.sdr_id as profile_sdr_id,
            c.status_voip,
            c.duration
        FROM calls c
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
    ),
    normalized_names AS (
        -- Normalizar nomes
        SELECT DISTINCT
            sdr_id,
            profile_sdr_id,
            CASE 
                WHEN p.full_name IS NOT NULL AND LENGTH(TRIM(p.full_name)) > 3 THEN p.full_name
                WHEN sdr_id ~ '[A-Za-z]' AND LENGTH(TRIM(sdr_id)) > 3 THEN sdr_id
                ELSE 'Usuário ' || sdr_id
            END as sdr_name
        FROM (
            SELECT sdr_id, profile_sdr_id FROM calls_with_scores
            UNION
            SELECT sdr_id, profile_sdr_id FROM calls_totals
        ) all_sdrs
        LEFT JOIN profiles p ON p.id = all_sdrs.profile_sdr_id
    ),
    aggregated_scores AS (
        -- Scores das calls COM análise
        SELECT 
            sdr_id,
            AVG(final_grade) as avg_score
        FROM calls_with_scores
        GROUP BY sdr_id
    ),
    aggregated_totals AS (
        -- Totais de TODAS as calls
        SELECT 
            sdr_id,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE status_voip = 'normal_clearing') as answered_calls,
            AVG(duration) FILTER (WHERE duration > 0) as avg_duration
        FROM calls_totals
        GROUP BY sdr_id
    )
    SELECT 
        nn.sdr_id,
        nn.sdr_name,
        COALESCE(at.total_calls, 0) as total_calls,
        COALESCE(at.answered_calls, 0) as answered_calls,
        ROUND(COALESCE(at.avg_duration, 0), 2) as avg_duration,
        ROUND(COALESCE(ags.avg_score, 0), 1) as avg_score
    FROM normalized_names nn
    LEFT JOIN aggregated_totals at ON at.sdr_id = nn.sdr_id
    LEFT JOIN aggregated_scores ags ON ags.sdr_id = nn.sdr_id
    -- Apenas SDRs que têm pelo menos uma call com análise
    WHERE ags.avg_score IS NOT NULL AND ags.avg_score > 0
    ORDER BY ags.avg_score DESC;
$$;

-- 6. CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO service_role;

-- 7. TESTAR FUNÇÃO CORRIGIDA
SELECT 
  'TESTE FUNÇÃO CORRIGIDA' as status,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls,
  ROUND(avg_score, 1) as avg_score
FROM get_sdr_metrics_with_analysis(99999)
ORDER BY avg_score DESC
LIMIT 10;

-- 8. VERIFICAR ANDRESSA ESPECIFICAMENTE
SELECT 
  'VERIFICAÇÃO ANDRESSA' as status,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls,
  ROUND(avg_score, 1) as avg_score
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY avg_score DESC;

SELECT 'Mapeamento de sdr_id aplicado! Função recriada com lógica simplificada.' as resultado;
