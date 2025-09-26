-- ===================================================================
-- FORÇAR ATUALIZAÇÃO DO FRONTEND - Eliminar cache e duplicatas
-- ===================================================================

-- 1. VERIFICAR SITUAÇÃO ATUAL DAS FUNÇÕES
SELECT 
  'SITUAÇÃO ATUAL - get_sdr_metrics' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY total_calls DESC;

SELECT 
  'SITUAÇÃO ATUAL - get_sdr_metrics_with_analysis' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls,
  avg_score
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY avg_score DESC;

-- 2. RECRIAR FUNÇÃO get_sdr_metrics_with_analysis COM DEDUPLICAÇÃO FORÇADA
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
    -- FORÇAR DEDUPLICAÇÃO POR NOME
    normalized_names AS (
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
    -- DEDUPLICAR POR NOME - MANTER APENAS O PRIMEIRO
    deduplicated_names AS (
        SELECT 
            sdr_id,
            sdr_name,
            ROW_NUMBER() OVER (PARTITION BY LOWER(sdr_name) ORDER BY sdr_id) as rn
        FROM normalized_names
    ),
    final_names AS (
        SELECT sdr_id, sdr_name
        FROM deduplicated_names
        WHERE rn = 1
    ),
    aggregated_scores AS (
        -- Scores das calls COM análise
        SELECT 
            cws.sdr_id,
            AVG(cws.final_grade) as avg_score
        FROM calls_with_scores cws
        INNER JOIN final_names fn ON fn.sdr_id = cws.sdr_id
        GROUP BY cws.sdr_id
    ),
    aggregated_totals AS (
        -- Totais de TODAS as calls
        SELECT 
            ct.sdr_id,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE ct.status_voip = 'normal_clearing') as answered_calls,
            AVG(ct.duration) FILTER (WHERE ct.duration > 0) as avg_duration
        FROM calls_totals ct
        INNER JOIN final_names fn ON fn.sdr_id = ct.sdr_id
        GROUP BY ct.sdr_id
    )
    SELECT 
        fn.sdr_id,
        fn.sdr_name,
        COALESCE(at.total_calls, 0) as total_calls,
        COALESCE(at.answered_calls, 0) as answered_calls,
        ROUND(COALESCE(at.avg_duration, 0), 2) as avg_duration,
        ROUND(COALESCE(ags.avg_score, 0), 1) as avg_score
    FROM final_names fn
    LEFT JOIN aggregated_totals at ON at.sdr_id = fn.sdr_id
    LEFT JOIN aggregated_scores ags ON ags.sdr_id = fn.sdr_id
    -- Apenas SDRs que têm pelo menos uma call com análise
    WHERE ags.avg_score IS NOT NULL AND ags.avg_score > 0
    ORDER BY ags.avg_score DESC;
$$;

-- 3. RECRIAR FUNÇÃO get_sdr_metrics COM DEDUPLICAÇÃO FORÇADA
DROP FUNCTION IF EXISTS public.get_sdr_metrics(INTEGER);

CREATE OR REPLACE FUNCTION public.get_sdr_metrics(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    sdr_id TEXT,
    sdr_name TEXT,
    total_calls BIGINT,
    answered_calls BIGINT,
    avg_duration NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH calls_totals AS (
        -- Buscar TODAS as calls para totais
        SELECT 
            COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
            c.sdr_id as profile_sdr_id,
            c.status_voip,
            c.duration
        FROM calls c
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
    ),
    -- FORÇAR DEDUPLICAÇÃO POR NOME
    normalized_names AS (
        SELECT DISTINCT
            sdr_id,
            profile_sdr_id,
            CASE 
                WHEN p.full_name IS NOT NULL AND LENGTH(TRIM(p.full_name)) > 3 THEN p.full_name
                WHEN sdr_id ~ '[A-Za-z]' AND LENGTH(TRIM(sdr_id)) > 3 THEN sdr_id
                ELSE 'Usuário ' || sdr_id
            END as sdr_name
        FROM calls_totals
        LEFT JOIN profiles p ON p.id = calls_totals.profile_sdr_id
    ),
    -- DEDUPLICAR POR NOME - MANTER APENAS O PRIMEIRO
    deduplicated_names AS (
        SELECT 
            sdr_id,
            sdr_name,
            ROW_NUMBER() OVER (PARTITION BY LOWER(sdr_name) ORDER BY sdr_id) as rn
        FROM normalized_names
    ),
    final_names AS (
        SELECT sdr_id, sdr_name
        FROM deduplicated_names
        WHERE rn = 1
    ),
    aggregated_totals AS (
        -- Totais de TODAS as calls
        SELECT 
            ct.sdr_id,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE ct.status_voip = 'normal_clearing') as answered_calls,
            AVG(ct.duration) FILTER (WHERE ct.duration > 0) as avg_duration
        FROM calls_totals ct
        INNER JOIN final_names fn ON fn.sdr_id = ct.sdr_id
        GROUP BY ct.sdr_id
    )
    SELECT 
        fn.sdr_id,
        fn.sdr_name,
        COALESCE(at.total_calls, 0) as total_calls,
        COALESCE(at.answered_calls, 0) as answered_calls,
        ROUND(COALESCE(at.avg_duration, 0), 2) as avg_duration
    FROM final_names fn
    LEFT JOIN aggregated_totals at ON at.sdr_id = fn.sdr_id
    WHERE at.total_calls > 0
    ORDER BY at.total_calls DESC;
$$;

-- 4. CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO service_role;

-- 5. TESTAR FUNÇÕES RECRIADAS
SELECT 
  'TESTE FINAL - get_sdr_metrics' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%';

SELECT 
  'TESTE FINAL - get_sdr_metrics_with_analysis' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls,
  avg_score
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%';

-- 6. VERIFICAR RANKING COMPLETO
SELECT 
  'RANKING FINAL - SEM DUPLICATAS' as status,
  ROW_NUMBER() OVER (ORDER BY avg_score DESC) as posicao,
  sdr_name,
  ROUND(avg_score, 1) as nota_media,
  total_calls as total_ligacoes,
  answered_calls as atendidas,
  ROUND((answered_calls::NUMERIC / NULLIF(total_calls, 0)) * 100, 0) as taxa_atendimento
FROM get_sdr_metrics_with_analysis(99999)
ORDER BY avg_score DESC
LIMIT 10;

-- 7. VERIFICAR SE HÁ DUPLICATAS
SELECT 
  'VERIFICAÇÃO DUPLICATAS' as status,
  sdr_name,
  COUNT(*) as entradas
FROM get_sdr_metrics_with_analysis(99999)
GROUP BY sdr_name
HAVING COUNT(*) > 1
ORDER BY entradas DESC;

SELECT 'Funções recriadas com deduplicação forçada! Frontend deve atualizar automaticamente.' as resultado;
