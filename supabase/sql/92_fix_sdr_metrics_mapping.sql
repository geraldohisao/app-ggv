-- ===================================================================
-- FIX SDR METRICS MAPPING - Corrigir função do dashboard
-- ===================================================================

-- 1. Verificar função atual
SELECT 
    '=== VERIFICANDO FUNÇÃO ATUAL ===' as info;

SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_sdr_metrics' 
AND routine_schema = 'public';

-- 2. Dropar função existente
DROP FUNCTION IF EXISTS public.get_sdr_metrics CASCADE;

-- 3. Recriar função com mesmo mapeamento da lista de chamadas
CREATE OR REPLACE FUNCTION public.get_sdr_metrics(
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH sdr_data AS (
        SELECT 
            -- SDR ID (normalizado igual na lista)
            CASE 
                WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                    REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                ELSE
                    LOWER(TRIM(c.agent_id))
            END AS normalized_sdr_id,
            
            -- Nome do SDR (buscar na tabela profiles igual na lista)
            COALESCE(
                p.full_name,
                -- Fallback: extrair do email
                INITCAP(REPLACE(SPLIT_PART(
                    CASE 
                        WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                            REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                        ELSE
                            LOWER(TRIM(c.agent_id))
                    END, '@', 1), '.', ' '))
            ) AS sdr_display_name,
            
            c.status,
            c.duration,
            
            -- Score do scorecard
            CASE 
                WHEN c.scorecard IS NOT NULL AND c.scorecard != 'null'::jsonb THEN
                    COALESCE((c.scorecard->>'overall_score')::INTEGER, 
                            (c.scorecard->>'score')::INTEGER,
                            NULL)
                ELSE NULL
            END AS call_score
            
        FROM calls c
        -- JOIN com profiles usando email normalizado (IGUAL NA LISTA)
        LEFT JOIN profiles p ON (
            CASE 
                WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                    REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                ELSE
                    LOWER(TRIM(c.agent_id))
            END
        ) = LOWER(TRIM(p.email))
        
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND c.agent_id IS NOT NULL 
        AND TRIM(c.agent_id) != ''
    ),
    aggregated AS (
        SELECT 
            normalized_sdr_id,
            sdr_display_name,
            COUNT(*) as total_calls,
            COUNT(CASE WHEN status = 'answered' THEN 1 END) as answered_calls,
            AVG(CASE WHEN duration > 0 THEN duration END) as avg_duration,
            AVG(CASE WHEN call_score > 0 THEN call_score END) as avg_score
        FROM sdr_data
        GROUP BY normalized_sdr_id, sdr_display_name
    )
    SELECT 
        a.normalized_sdr_id as sdr_id,
        a.sdr_display_name as sdr_name,
        a.total_calls,
        a.answered_calls,
        COALESCE(a.avg_duration, 0) as avg_duration,
        COALESCE(a.avg_score, 0) as avg_score
    FROM aggregated a
    WHERE a.total_calls > 0
    ORDER BY a.total_calls DESC;
END;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO anon;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO service_role;

-- 5. Testar função corrigida
SELECT 
    '=== TESTANDO FUNÇÃO CORRIGIDA ===' as teste;

SELECT 
    sdr_id,
    sdr_name,
    total_calls,
    answered_calls,
    ROUND(avg_duration/60, 1) as avg_duration_minutes,
    ROUND(avg_score, 1) as avg_score
FROM public.get_sdr_metrics(30)
ORDER BY total_calls DESC
LIMIT 10;

-- 6. Verificar se não há mais duplicação
SELECT 
    '=== VERIFICANDO DUPLICAÇÃO ===' as verificacao;

SELECT 
    sdr_name,
    COUNT(*) as quantidade_entradas,
    SUM(total_calls) as total_chamadas
FROM public.get_sdr_metrics(30)
GROUP BY sdr_name
HAVING COUNT(*) > 1
ORDER BY quantidade_entradas DESC;

SELECT 'Função get_sdr_metrics corrigida com mapeamento consistente!' as status;
