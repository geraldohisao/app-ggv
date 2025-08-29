-- ===================================================================
-- FIX RANKING AGGREGATION - Corrigir agregação por nome final
-- ===================================================================

-- 1. Dropar função atual
DROP FUNCTION IF EXISTS public.get_sdr_metrics CASCADE;

-- 2. Recriar função com agregação por nome final (não por agent_id)
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
            -- SDR ID (normalizado - usar o primeiro encontrado para cada nome)
            CASE 
                WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                    REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                ELSE
                    LOWER(TRIM(c.agent_id))
            END AS normalized_sdr_id,
            
            -- Nome do SDR (buscar na tabela profiles - ESTE É O CAMPO CHAVE)
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
        -- JOIN com profiles usando email normalizado
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
    -- AGREGAÇÃO POR NOME FINAL (não por agent_id)
    aggregated AS (
        SELECT 
            sdr_display_name, -- CHAVE DE AGRUPAMENTO: NOME FINAL
            COUNT(*) as total_calls,
            COUNT(CASE WHEN status = 'answered' THEN 1 END) as answered_calls,
            AVG(CASE WHEN duration > 0 THEN duration END) as avg_duration,
            AVG(CASE WHEN call_score > 0 THEN call_score END) as avg_score,
            -- Pegar o primeiro sdr_id para representar o grupo
            MIN(normalized_sdr_id) as representative_sdr_id
        FROM sdr_data
        WHERE sdr_display_name IS NOT NULL 
        AND TRIM(sdr_display_name) != ''
        GROUP BY sdr_display_name -- AGRUPA POR NOME, NÃO POR EMAIL
    )
    SELECT 
        a.representative_sdr_id as sdr_id,
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

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO anon;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO service_role;

-- 4. Testar função corrigida
SELECT 
    '=== TESTANDO FUNÇÃO SEM DUPLICAÇÃO ===' as teste;

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

-- 5. Verificar se eliminou duplicação
SELECT 
    '=== VERIFICANDO SE ELIMINOU DUPLICAÇÃO ===' as verificacao;

SELECT 
    sdr_name,
    COUNT(*) as quantidade_entradas,
    SUM(total_calls) as total_chamadas
FROM public.get_sdr_metrics(30)
GROUP BY sdr_name
HAVING COUNT(*) > 1;

-- Se não retornar nada, significa que não há mais duplicação!

-- 6. Comparar totais antes e depois
SELECT 
    '=== COMPARAÇÃO DE TOTAIS ===' as comparacao;

SELECT 
    'TOTAL GERAL' as tipo,
    SUM(total_calls) as total_chamadas,
    COUNT(*) as total_sdrs
FROM public.get_sdr_metrics(30);

SELECT 'Função corrigida - agregação por nome final!' as status;
