-- ===================================================================
-- CORREÇÃO: Eliminar "Andressa" duplicado no ranking
-- ===================================================================
-- Problema: A função get_sdr_metrics_with_analysis está criando duplicatas
-- porque usa COALESCE que pode retornar nomes parciais vs completos

-- 1. VERIFICAR O PROBLEMA ATUAL
SELECT 
  'PROBLEMA ATUAL - Duplicatas no ranking' as status,
  sdr_id,
  sdr_name,
  COUNT(*) as total_calls,
  AVG(avg_score) as avg_score
FROM (
  SELECT 
    COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
    COALESCE(p.name, 'Usuário ' || COALESCE(c.agent_id, SUBSTRING(c.sdr_id::TEXT, 1, 8))) as sdr_name,
    ca.final_grade as avg_score
  FROM calls c
  INNER JOIN call_analysis ca ON c.id = ca.call_id
  LEFT JOIN profiles p ON p.id = c.sdr_id
  WHERE ca.final_grade IS NOT NULL
) sub
GROUP BY sdr_id, sdr_name
HAVING COUNT(*) > 0
ORDER BY avg_score DESC;

-- 2. VERIFICAR DADOS BRUTOS PARA ANDRESSA
SELECT 
  'DADOS BRUTOS - Andressa' as info,
  c.id as call_id,
  c.agent_id,
  c.sdr_id,
  p.name as profile_name,
  p.email as profile_email,
  c.insights->>'sdr_name' as insights_sdr_name,
  ca.final_grade
FROM calls c
INNER JOIN call_analysis ca ON c.id = ca.call_id
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE ca.final_grade IS NOT NULL
  AND (
    LOWER(COALESCE(p.name, '')) LIKE '%andressa%' OR
    LOWER(COALESCE(c.agent_id, '')) LIKE '%andressa%' OR
    LOWER(COALESCE(c.insights->>'sdr_name', '')) LIKE '%andressa%'
  )
ORDER BY ca.final_grade DESC;

-- 3. CORRIGIR FUNÇÃO PARA NORMALIZAR NOMES CORRETAMENTE
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
    WITH normalized_sdrs AS (
        SELECT 
            COALESCE(c.agent_id, c.sdr_id::TEXT) as sdr_id,
            -- Lógica melhorada de normalização de nomes
            CASE 
                -- Se tem profile.name completo, usar ele
                WHEN p.name IS NOT NULL AND LENGTH(TRIM(p.name)) > 3 THEN p.name
                -- Se agent_id parece ser um nome (contém espaços ou caracteres não numéricos)
                WHEN c.agent_id IS NOT NULL AND c.agent_id ~ '[A-Za-z]' AND LENGTH(TRIM(c.agent_id)) > 3 THEN c.agent_id
                -- Se tem insights.sdr_name, usar ele
                WHEN c.insights->>'sdr_name' IS NOT NULL AND LENGTH(TRIM(c.insights->>'sdr_name')) > 3 THEN c.insights->>'sdr_name'
                -- Fallback para sdr_id formatado
                ELSE 'Usuário ' || COALESCE(c.agent_id, SUBSTRING(c.sdr_id::TEXT, 1, 8))
            END as sdr_name,
            c.status_voip,
            c.duration,
            ca.final_grade
        FROM calls c
        INNER JOIN call_analysis ca ON c.id = ca.call_id
        LEFT JOIN profiles p ON p.id = c.sdr_id
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND ca.final_grade IS NOT NULL
    ),
    deduplicated_sdrs AS (
        SELECT 
            sdr_id,
            -- Pegar o nome mais completo para cada sdr_id
            (array_agg(sdr_name ORDER BY LENGTH(sdr_name) DESC))[1] as sdr_name,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE status_voip = 'normal_clearing') as answered_calls,
            AVG(duration) FILTER (WHERE duration > 0) as avg_duration,
            AVG(final_grade) as avg_score
        FROM normalized_sdrs
        GROUP BY sdr_id
        HAVING COUNT(*) > 0
    )
    SELECT 
        sdr_id,
        TRIM(sdr_name) as sdr_name,
        total_calls,
        answered_calls,
        ROUND(avg_duration, 2) as avg_duration,
        ROUND(avg_score, 1) as avg_score
    FROM deduplicated_sdrs
    ORDER BY avg_score DESC;
$$;

-- 4. CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO service_role;

-- 5. TESTAR A CORREÇÃO
SELECT 
  'TESTE APÓS CORREÇÃO' as status,
  sdr_id,
  sdr_name,
  total_calls,
  avg_score
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

SELECT 'Função corrigida! Andressa não deve mais aparecer duplicado.' as resultado;
