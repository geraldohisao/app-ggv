-- ===================================================================
-- CORREÇÃO DEFINITIVA - Duração média das chamadas atendidas
-- ===================================================================

-- 1. Primeiro, vamos verificar os dados reais
SELECT 
    '=== VERIFICAÇÃO INICIAL DOS DADOS ===' as step;

-- Verificar campos de duração disponíveis
SELECT 
    agent_id,
    status_voip,
    duration,
    duration_formated,
    created_at::date
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verificar duração por status
SELECT 
    '=== DURAÇÃO POR STATUS ===' as step;

SELECT 
    status_voip,
    COUNT(*) as total,
    AVG(duration) as avg_duration_seconds,
    AVG(CASE WHEN duration > 0 THEN duration END) as avg_duration_positive,
    COUNT(CASE WHEN duration > 0 THEN 1 END) as calls_with_duration
FROM calls 
WHERE created_at >= NOW() - INTERVAL '30 days'
AND agent_id IS NOT NULL
GROUP BY status_voip
ORDER BY total DESC;

-- 3. Recriar função com lógica mais robusta
DROP FUNCTION IF EXISTS public.get_sdr_metrics CASCADE;

CREATE OR REPLACE FUNCTION public.get_sdr_metrics(p_days INTEGER DEFAULT 30)
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
    WITH raw_data AS (
        SELECT 
            c.agent_id,
            c.status_voip,
            -- Tentar extrair duração de múltiplas fontes
            CASE 
                WHEN c.duration IS NOT NULL AND c.duration > 0 THEN c.duration
                WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN
                    -- Converter HH:MM:SS para segundos
                    EXTRACT(EPOCH FROM c.duration_formated::interval)::INTEGER
                ELSE 0
            END as duration_seconds,
            -- Score do scorecard
            CASE 
                WHEN c.scorecard IS NOT NULL AND c.scorecard != 'null'::jsonb THEN
                    COALESCE(
                        (c.scorecard->>'final_score')::NUMERIC,
                        (c.scorecard->>'overall_score')::NUMERIC, 
                        (c.scorecard->>'score')::NUMERIC,
                        NULL
                    )
                ELSE NULL
            END AS call_score
        FROM calls c
        WHERE c.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND c.agent_id IS NOT NULL 
        AND TRIM(c.agent_id) != ''
    ),
    sdr_mapped AS (
        SELECT 
            agent_id,
            -- Normalizar nomes de SDRs
            CASE
                WHEN LOWER(agent_id) LIKE '%mariana%' THEN 'Mariana Costa'
                WHEN LOWER(agent_id) LIKE '%camila%' THEN 'Camila Ataliba'
                WHEN LOWER(agent_id) LIKE '%andressa%' THEN 'Andressa Habinoski'
                WHEN LOWER(agent_id) LIKE '%ruama%' OR LOWER(agent_id) LIKE '%lô%ruama%' THEN 'Lô-Ruama Oliveira'
                WHEN LOWER(agent_id) LIKE '%isabel%' THEN 'Isabel Pestilho'
                WHEN LOWER(agent_id) LIKE '%barbara%' THEN 'Barbara Rabech'
                WHEN LOWER(agent_id) LIKE '%rafael%' THEN 'Rafael Garcia'
                WHEN LOWER(agent_id) LIKE '%geraldo%' THEN 'Geraldo Hisao'
                ELSE COALESCE(
                    INITCAP(REPLACE(SPLIT_PART(agent_id, '@', 1), '.', ' ')),
                    'SDR Desconhecido'
                )
            END as sdr_name,
            status_voip,
            duration_seconds,
            call_score
        FROM raw_data
    )
    SELECT 
        MIN(sm.agent_id) as sdr_id,
        sm.sdr_name,
        COUNT(*) as total_calls,
        -- Chamadas atendidas (normal_clearing)
        COUNT(CASE WHEN sm.status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
        -- DURAÇÃO MÉDIA APENAS DAS ATENDIDAS COM DURAÇÃO > 0
        AVG(CASE 
            WHEN sm.status_voip = 'normal_clearing' AND sm.duration_seconds > 0 
            THEN sm.duration_seconds::NUMERIC 
            ELSE NULL 
        END) as avg_duration,
        -- Score médio
        AVG(CASE WHEN sm.call_score > 0 THEN sm.call_score END) as avg_score
    FROM sdr_mapped sm
    GROUP BY sm.sdr_name
    HAVING COUNT(*) > 0
    ORDER BY total_calls DESC;
END;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO anon;
GRANT EXECUTE ON FUNCTION public.get_sdr_metrics TO service_role;

-- 5. Testar função corrigida
SELECT 
    '=== TESTANDO FUNÇÃO CORRIGIDA ===' as step;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    ROUND((answered_calls::NUMERIC / total_calls) * 100, 1) as taxa_atendimento,
    avg_duration,
    CASE 
        WHEN avg_duration > 0 THEN ROUND(avg_duration / 60, 1) || 'm'
        ELSE '0m (sem duração)'
    END as duracao_formatada,
    ROUND(avg_score, 1) as nota_media
FROM public.get_sdr_metrics(30)
WHERE total_calls >= 5
ORDER BY total_calls DESC
LIMIT 10;

-- 6. Verificar dados específicos da Mariana
SELECT 
    '=== VERIFICAÇÃO ESPECÍFICA MARIANA ===' as step;

SELECT 
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN 1 END) as atendidas_com_duracao,
    AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration END) as duracao_media_segundos,
    ROUND(AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration END) / 60, 1) as duracao_media_minutos
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND created_at >= NOW() - INTERVAL '30 days';

SELECT 'FUNÇÃO CORRIGIDA - DURAÇÃO DAS ATENDIDAS!' as status;
