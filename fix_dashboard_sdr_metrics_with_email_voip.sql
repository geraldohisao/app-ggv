-- =========================================
-- ATUALIZAR get_sdr_metrics PARA USAR email_voip
-- =========================================

-- 1. Verificar função atual
SELECT 
    '=== VERIFICANDO FUNÇÃO get_sdr_metrics ATUAL ===' as info;

SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_sdr_metrics' 
  AND routine_schema = 'public';

-- 2. Dropar e recriar função com suporte a email_voip
DROP FUNCTION IF EXISTS public.get_sdr_metrics CASCADE;

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
            -- SDR ID: usar email_voip do profile se disponível, senão agent_id normalizado
            COALESCE(
                p.email_voip,
                CASE 
                    WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                        REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                    ELSE
                        LOWER(TRIM(c.agent_id))
                END
            ) AS normalized_sdr_id,
            
            -- Nome do SDR: usar full_name do profile se disponível
            COALESCE(
                p.full_name,
                -- Fallback: extrair do email e normalizar
                REGEXP_REPLACE(
                    INITCAP(REPLACE(SPLIT_PART(
                        COALESCE(
                            p.email_voip,
                            CASE 
                                WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                                    REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                                ELSE
                                    LOWER(TRIM(c.agent_id))
                            END
                        ), '@', 1), '.', ' ')),
                    '^\d+-', '', 'g'  -- Remover prefixos numéricos
                )
            ) AS sdr_name_clean,
            
            c.id,
            c.status_voip,
            c.duration,
            c.created_at,
            
            -- Score da análise se disponível
            CASE 
                WHEN ca.final_grade IS NOT NULL THEN ca.final_grade
                WHEN c.scorecard IS NOT NULL AND c.scorecard != 'null'::jsonb THEN
                    COALESCE(
                        (c.scorecard->>'final_score')::NUMERIC,
                        (c.scorecard->>'total_score')::NUMERIC,
                        (c.scorecard->>'score')::NUMERIC
                    )
                ELSE NULL
            END as call_score
            
        FROM calls c
        -- JOIN com profiles usando agent_id = email
        LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
        -- JOIN com call_analysis para pegar scores
        LEFT JOIN call_analysis ca ON c.id = ca.call_id
        
        WHERE 
            c.created_at >= NOW() - INTERVAL '1 day' * p_days
            AND c.agent_id IS NOT NULL 
            AND TRIM(c.agent_id) != ''
    )
    SELECT 
        sd.normalized_sdr_id as sdr_id,
        sd.sdr_name_clean as sdr_name,
        COUNT(sd.id) as total_calls,
        COUNT(CASE WHEN sd.status_voip = 'normal_clearing' THEN sd.id END) as answered_calls,
        
        -- Duração média apenas das chamadas atendidas
        COALESCE(
            ROUND(
                AVG(CASE WHEN sd.status_voip = 'normal_clearing' AND sd.duration > 0 THEN sd.duration END), 
                0
            ), 
            0
        ) as avg_duration,
        
        -- Score médio apenas das chamadas com score
        COALESCE(
            ROUND(AVG(sd.call_score), 1), 
            0
        ) as avg_score
        
    FROM sdr_data sd
    GROUP BY sd.normalized_sdr_id, sd.sdr_name_clean
    HAVING COUNT(sd.id) > 0  -- Apenas SDRs com pelo menos 1 chamada
    ORDER BY total_calls DESC, avg_score DESC;
END;
$$;

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO service_role;

-- 4. Testar nova função
SELECT 
    '=== TESTANDO NOVA FUNÇÃO get_sdr_metrics ===' as teste;

SELECT 
    sdr_id,
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration,
    avg_score
FROM public.get_sdr_metrics(30)
ORDER BY total_calls DESC
LIMIT 10;

-- 5. Comparar com dados antigos vs novos
SELECT 
    '=== VERIFICANDO SE NOMES MELHORARAM ===' as comparacao;

SELECT 
    sdr_id,
    sdr_name,
    total_calls
FROM public.get_sdr_metrics(30)
WHERE sdr_name NOT LIKE '%@%'  -- Nomes que não são emails
ORDER BY total_calls DESC;

-- 6. Atualizar também get_sdr_metrics_with_analysis se existir
DROP FUNCTION IF EXISTS public.get_sdr_metrics_with_analysis CASCADE;

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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH sdr_data AS (
        SELECT 
            -- SDR ID: usar email_voip do profile se disponível, senão agent_id normalizado
            COALESCE(
                p.email_voip,
                CASE 
                    WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                        REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                    ELSE
                        LOWER(TRIM(c.agent_id))
                END
            ) AS normalized_sdr_id,
            
            -- Nome do SDR: usar full_name do profile se disponível
            COALESCE(
                p.full_name,
                INITCAP(REPLACE(SPLIT_PART(
                    COALESCE(p.email_voip, c.agent_id), '@', 1), '.', ' '))
            ) AS sdr_name_clean,
            
            c.id,
            c.status_voip,
            c.duration,
            ca.final_grade
            
        FROM calls c
        -- INNER JOIN para pegar apenas chamadas com análise
        INNER JOIN call_analysis ca ON c.id = ca.call_id
        -- LEFT JOIN com profiles usando agent_id = email
        LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
        
        WHERE 
            c.created_at >= NOW() - INTERVAL '1 day' * p_days
            AND c.agent_id IS NOT NULL 
            AND ca.final_grade IS NOT NULL
    )
    SELECT 
        sd.normalized_sdr_id as sdr_id,
        sd.sdr_name_clean as sdr_name,
        COUNT(sd.id) as total_calls,
        COUNT(CASE WHEN sd.status_voip = 'normal_clearing' THEN sd.id END) as answered_calls,
        
        -- Duração média apenas das chamadas atendidas
        COALESCE(
            ROUND(
                AVG(CASE WHEN sd.status_voip = 'normal_clearing' AND sd.duration > 0 THEN sd.duration END), 
                0
            ), 
            0
        ) as avg_duration,
        
        -- Score médio das análises
        COALESCE(ROUND(AVG(sd.final_grade), 1), 0) as avg_score
        
    FROM sdr_data sd
    GROUP BY sd.normalized_sdr_id, sd.sdr_name_clean
    HAVING COUNT(sd.id) > 0
    ORDER BY avg_score DESC, total_calls DESC;
END;
$$;

-- 7. Conceder permissões para função with_analysis
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics_with_analysis(INTEGER) TO service_role;

SELECT 'Funções get_sdr_metrics e get_sdr_metrics_with_analysis atualizadas para usar email_voip!' as status;
