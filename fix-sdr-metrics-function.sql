-- 🔧 CORRIGIR FUNÇÃO get_sdr_metrics_with_analysis
-- Execute este script no SQL Editor do Supabase

-- 1. Remover função existente
SELECT 'Removendo função get_sdr_metrics_with_analysis existente...' as info;
DROP FUNCTION IF EXISTS get_sdr_metrics_with_analysis(integer);

-- 2. Criar função correta
SELECT 'Criando função get_sdr_metrics_with_analysis correta...' as info;
CREATE OR REPLACE FUNCTION get_sdr_metrics_with_analysis(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    sdr_id TEXT,
    sdr_name TEXT,
    total_calls BIGINT,
    avg_score NUMERIC
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        c.agent_id as sdr_id,
        c.agent_id as sdr_name,
        COUNT(ca.id) as total_calls,
        ROUND(AVG(ca.final_grade), 2) as avg_score
    FROM calls c
    INNER JOIN call_analysis ca ON ca.call_id = c.id
    WHERE 
        c.agent_id IS NOT NULL
        AND ca.final_grade IS NOT NULL
        AND c.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY c.agent_id
    HAVING COUNT(ca.id) > 0
    ORDER BY avg_score DESC;
$$;

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sdr_metrics_with_analysis(INTEGER) TO service_role;

-- 4. Testar a função
SELECT 'Testando função corrigida:' as info;
SELECT * FROM get_sdr_metrics_with_analysis(99999) LIMIT 5;

-- 5. Comparar com dados reais
SELECT 'Dados reais para comparação:' as info;
SELECT 
    c.agent_id as sdr_name,
    COUNT(ca.id) as calls_with_analysis,
    ROUND(AVG(ca.final_grade), 2) as avg_score
FROM calls c
INNER JOIN call_analysis ca ON ca.call_id = c.id
WHERE 
    c.agent_id IS NOT NULL
    AND ca.final_grade IS NOT NULL
GROUP BY c.agent_id
HAVING COUNT(ca.id) > 0
ORDER BY avg_score DESC
LIMIT 5;
