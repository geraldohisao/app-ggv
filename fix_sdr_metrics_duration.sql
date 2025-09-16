-- =========================================
-- CORRIGIR DURAÇÃO NO RANKING DE SDRs
-- =========================================

-- 1. Verificar dados atuais do ranking
SELECT 
    '=== VERIFICANDO get_sdr_metrics ATUAL ===' as info;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration
FROM public.get_sdr_metrics(30)
ORDER BY total_calls DESC
LIMIT 5;

-- 2. Corrigir função get_sdr_metrics para calcular duração corretamente
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
                    '^\d+-', '', 'g'
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
        -- LEFT JOIN com profiles usando agent_id = email
        LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
        -- LEFT JOIN com call_analysis para pegar scores
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
        
        -- CORRIGIDO: Duração média apenas das chamadas atendidas com duração > 30s
        COALESCE(
            ROUND(
                AVG(CASE 
                    WHEN sd.status_voip = 'normal_clearing' AND sd.duration > 30 
                    THEN sd.duration 
                END), 
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
    HAVING COUNT(sd.id) > 0
    ORDER BY total_calls DESC, avg_score DESC;
END;
$$;

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO authenticated, anon, service_role;

-- 4. Testar função corrigida
SELECT 
    '=== TESTANDO FUNÇÃO CORRIGIDA ===' as teste;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration as duracao_media_corrigida,
    avg_score
FROM public.get_sdr_metrics(30)
ORDER BY total_calls DESC
LIMIT 5;

SELECT 'Função get_sdr_metrics corrigida - duração média das atendidas >30s!' as status;
