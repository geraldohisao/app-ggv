-- ===================================================================
-- CRIAR FUNÇÃO get_sdr_metrics QUE ESTÁ FALTANDO
-- ===================================================================
-- O frontend está chamando get_sdr_metrics para totais, mas ela não existe
-- Vou criar a função que o frontend precisa

-- 1. VERIFICAR SE A FUNÇÃO EXISTE
SELECT 
  'VERIFICAR FUNÇÃO get_sdr_metrics' as info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_sdr_metrics'
AND routine_schema = 'public';

-- 2. CRIAR FUNÇÃO get_sdr_metrics (TOTAIS)
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
        FROM calls_totals
        LEFT JOIN profiles p ON p.id = calls_totals.profile_sdr_id
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
        ROUND(COALESCE(at.avg_duration, 0), 2) as avg_duration
    FROM normalized_names nn
    LEFT JOIN aggregated_totals at ON at.sdr_id = nn.sdr_id
    WHERE at.total_calls > 0
    ORDER BY at.total_calls DESC;
$$;

-- 3. CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO service_role;

-- 4. TESTAR FUNÇÃO get_sdr_metrics
SELECT 
  'TESTE get_sdr_metrics' as status,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics(99999)
ORDER BY total_calls DESC
LIMIT 10;

-- 5. VERIFICAR ANDRESSA ESPECIFICAMENTE
SELECT 
  'VERIFICAÇÃO ANDRESSA - get_sdr_metrics' as status,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY total_calls DESC;

-- 6. TESTAR AMBAS AS FUNÇÕES JUNTAS (COMO O FRONTEND FAZ)
SELECT 
  'TESTE CONJUNTO - get_sdr_metrics' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%'

UNION ALL

SELECT 
  'TESTE CONJUNTO - get_sdr_metrics_with_analysis' as funcao,
  sdr_id,
  sdr_name,
  total_calls,
  answered_calls
FROM get_sdr_metrics_with_analysis(99999)
WHERE LOWER(sdr_name) LIKE '%andressa%';

-- 7. VERIFICAR SE HÁ DUPLICATAS NAS FUNÇÕES
SELECT 
  'VERIFICAÇÃO DUPLICATAS - get_sdr_metrics' as funcao,
  COUNT(*) as total_entradas,
  COUNT(DISTINCT sdr_id) as sdr_ids_unicos,
  COUNT(DISTINCT sdr_name) as nomes_unicos
FROM get_sdr_metrics(99999);

SELECT 
  'VERIFICAÇÃO DUPLICATAS - get_sdr_metrics_with_analysis' as funcao,
  COUNT(*) as total_entradas,
  COUNT(DISTINCT sdr_id) as sdr_ids_unicos,
  COUNT(DISTINCT sdr_name) as nomes_unicos
FROM get_sdr_metrics_with_analysis(99999);

SELECT 'Função get_sdr_metrics criada! Frontend deve funcionar corretamente agora.' as resultado;
