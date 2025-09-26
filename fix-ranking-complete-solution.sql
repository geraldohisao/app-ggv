-- ===================================================================
-- CORREÇÃO COMPLETA: Ranking com totais corretos e sem duplicatas
-- ===================================================================
-- Problemas:
-- 1. Andressa ainda duplicada (#4 e #6)
-- 2. Ligações zeradas (0 totais)

-- 1. PRIMEIRO: Corrigir o mapeamento de Andressa
-- Encontrar o profile correto de Andressa
WITH andressa_profile AS (
  SELECT id, full_name, email
  FROM profiles 
  WHERE LOWER(full_name) LIKE '%andressa%'
  ORDER BY created_at
  LIMIT 1
)
UPDATE calls 
SET sdr_id = (SELECT id FROM andressa_profile)
WHERE agent_id = 'Andressa'
  AND (sdr_id IS NULL OR sdr_id NOT IN (
    SELECT id FROM profiles WHERE LOWER(full_name) LIKE '%andressa%'
  ));

-- 2. RECRIAR A FUNÇÃO COM LÓGICA CORRETA
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
    WITH base_calls AS (
        -- Buscar TODAS as calls (não apenas com análise)
        SELECT 
            COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
            c.sdr_id as profile_sdr_id,
            c.status_voip,
            c.duration,
            c.created_at
        FROM calls c
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
    ),
    calls_with_analysis AS (
        -- Buscar calls COM análise
        SELECT 
            COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
            c.sdr_id as profile_sdr_id,
            ca.final_grade
        FROM calls c
        INNER JOIN call_analysis ca ON c.id = ca.call_id
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND ca.final_grade IS NOT NULL
    ),
    normalized_names AS (
        -- Normalizar nomes usando a mesma lógica para ambos
        SELECT DISTINCT
            sdr_id,
            profile_sdr_id,
            CASE 
                -- Se tem profile.name completo, usar ele
                WHEN p.name IS NOT NULL AND LENGTH(TRIM(p.name)) > 3 THEN p.name
                -- Se agent_id parece ser um nome, usar ele
                WHEN sdr_id ~ '[A-Za-z]' AND LENGTH(TRIM(sdr_id)) > 3 THEN sdr_id
                -- Fallback
                ELSE 'Usuário ' || sdr_id
            END as sdr_name
        FROM (
            SELECT sdr_id, profile_sdr_id FROM base_calls
            UNION
            SELECT sdr_id, profile_sdr_id FROM calls_with_analysis
        ) all_sdrs
        LEFT JOIN profiles p ON p.id = all_sdrs.profile_sdr_id
    ),
    aggregated_totals AS (
        -- Totais de TODAS as calls
        SELECT 
            bc.sdr_id,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE bc.status_voip = 'normal_clearing') as answered_calls,
            AVG(bc.duration) FILTER (WHERE bc.duration > 0) as avg_duration
        FROM base_calls bc
        GROUP BY bc.sdr_id
    ),
    aggregated_scores AS (
        -- Scores apenas das calls COM análise
        SELECT 
            cwa.sdr_id,
            AVG(cwa.final_grade) as avg_score
        FROM calls_with_analysis cwa
        GROUP BY cwa.sdr_id
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

-- 3. CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO service_role;

-- 4. VERIFICAR SE ANDRESSA ESTÁ MAPEADA CORRETAMENTE
SELECT 
  'VERIFICAÇÃO - Andressa mapeada' as status,
  c.agent_id,
  c.sdr_id,
  p.full_name as profile_name,
  COUNT(*) as total_calls
FROM calls c
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE c.agent_id = 'Andressa'
GROUP BY c.agent_id, c.sdr_id, p.full_name;

-- 5. TESTAR A FUNÇÃO CORRIGIDA
SELECT 
  'TESTE FUNÇÃO CORRIGIDA' as status,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls,
  ROUND(avg_score, 1) as avg_score
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY avg_score DESC;

-- 6. VERIFICAR RANKING COMPLETO
SELECT 
  'RANKING FINAL CORRIGIDO' as status,
  ROW_NUMBER() OVER (ORDER BY avg_score DESC) as posicao,
  sdr_name,
  ROUND(avg_score, 1) as nota_media,
  total_calls as total_ligacoes,
  answered_calls as atendidas,
  ROUND((answered_calls::NUMERIC / NULLIF(total_calls, 0)) * 100, 0) as taxa_atendimento
FROM get_sdr_metrics_with_analysis(99999)
ORDER BY avg_score DESC
LIMIT 10;

-- 7. VERIFICAR SE HÁ OUTROS CASOS SIMILARES
SELECT 
  'OUTROS CASOS SIMILARES' as status,
  c.agent_id,
  p.full_name,
  COUNT(*) as total_calls
FROM calls c
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE c.agent_id IS NOT NULL 
  AND c.agent_id != ''
  AND p.full_name IS NOT NULL
  AND LOWER(c.agent_id) != LOWER(p.full_name)
  AND LOWER(c.agent_id) = LOWER(SPLIT_PART(p.full_name, ' ', 1))
GROUP BY c.agent_id, p.full_name
ORDER BY total_calls DESC;

SELECT 'Correção completa aplicada! Andressa não deve mais duplicar e totais devem aparecer corretamente.' as resultado;
