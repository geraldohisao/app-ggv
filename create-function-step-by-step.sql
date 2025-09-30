-- 🔧 CRIAR FUNÇÃO get_sdr_metrics_with_analysis PASSO A PASSO
-- Execute cada comando separadamente no SQL Editor

-- Comando 1: Criar a função
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
