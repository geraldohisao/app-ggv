-- ===================================================================
-- CORREÇÃO DEFINITIVA - USAR DURATION_FORMATED + NORMAL_CLEARING
-- ===================================================================

-- 1. PRIMEIRO: Verificar dados reais
SELECT 
    '=== VERIFICAÇÃO DOS DADOS REAIS ===' as step;

-- Verificar campos disponíveis e valores
SELECT 
    agent_id,
    status_voip,
    duration,
    duration_formated,
    CASE 
        WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
            EXTRACT(EPOCH FROM duration_formated::interval)
        ELSE duration
    END as calculated_seconds,
    created_at::date
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND status_voip = 'normal_clearing'
AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar estatísticas gerais
SELECT 
    '=== ESTATÍSTICAS GERAIS ===' as step;

SELECT 
    status_voip,
    COUNT(*) as total,
    COUNT(CASE WHEN duration > 0 THEN 1 END) as com_duration,
    COUNT(CASE WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN 1 END) as com_duration_formated,
    AVG(duration) as avg_duration,
    AVG(CASE 
        WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
            EXTRACT(EPOCH FROM duration_formated::interval)
        ELSE duration
    END) as avg_calculated
FROM calls 
WHERE created_at >= NOW() - INTERVAL '30 days'
AND agent_id IS NOT NULL
GROUP BY status_voip
ORDER BY total DESC;

-- 3. RECRIAR FUNÇÃO COM LÓGICA CORRETA
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
    WITH call_data AS (
        SELECT 
            c.agent_id,
            c.status_voip,
            -- USAR DURATION_FORMATED COMO PRIORIDADE
            CASE 
                WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN
                    EXTRACT(EPOCH FROM c.duration_formated::interval)
                WHEN c.duration IS NOT NULL AND c.duration > 0 THEN
                    c.duration
                ELSE 0
            END as duration_seconds,
            -- Score
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
    sdr_grouped AS (
        SELECT 
            cd.agent_id,
            -- Normalizar nomes
            CASE
                WHEN LOWER(cd.agent_id) LIKE '%mariana%' THEN 'Mariana Costa'
                WHEN LOWER(cd.agent_id) LIKE '%camila%' THEN 'Camila Ataliba'
                WHEN LOWER(cd.agent_id) LIKE '%andressa%' THEN 'Andressa Habinoski'
                WHEN LOWER(cd.agent_id) LIKE '%ruama%' OR LOWER(cd.agent_id) LIKE '%lô%ruama%' THEN 'Lô-Ruama Oliveira'
                WHEN LOWER(cd.agent_id) LIKE '%isabel%' THEN 'Isabel Pestilho'
                WHEN LOWER(cd.agent_id) LIKE '%barbara%' THEN 'Barbara Rabech'
                WHEN LOWER(cd.agent_id) LIKE '%rafael%' THEN 'Rafael Garcia'
                WHEN LOWER(cd.agent_id) LIKE '%geraldo%' THEN 'Geraldo Hisao'
                ELSE COALESCE(
                    INITCAP(REPLACE(SPLIT_PART(cd.agent_id, '@', 1), '.', ' ')),
                    'SDR Desconhecido'
                )
            END as sdr_name,
            cd.status_voip,
            cd.duration_seconds,
            cd.call_score
        FROM call_data cd
    )
    SELECT 
        MIN(sg.agent_id) as sdr_id,
        sg.sdr_name,
        COUNT(*) as total_calls,
        -- APENAS NORMAL_CLEARING CONTA COMO ATENDIDA
        COUNT(CASE WHEN sg.status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
        -- DURAÇÃO MÉDIA APENAS DAS NORMAL_CLEARING COM DURAÇÃO > 0
        AVG(CASE 
            WHEN sg.status_voip = 'normal_clearing' AND sg.duration_seconds > 0 
            THEN sg.duration_seconds 
            ELSE NULL 
        END) as avg_duration,
        -- Score médio
        AVG(CASE WHEN sg.call_score > 0 THEN sg.call_score END) as avg_score
    FROM sdr_grouped sg
    GROUP BY sg.sdr_name
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
    avg_duration as duracao_segundos,
    CASE 
        WHEN avg_duration > 0 THEN ROUND(avg_duration / 60, 1) || 'm'
        ELSE '0m'
    END as duracao_formatada
FROM public.get_sdr_metrics(30)
WHERE total_calls >= 5
ORDER BY total_calls DESC
LIMIT 10;

-- 6. Teste específico Mariana
SELECT 
    '=== TESTE ESPECÍFICO MARIANA ===' as step;

SELECT 
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    COUNT(CASE 
        WHEN status_voip = 'normal_clearing' AND (
            (duration_formated IS NOT NULL AND duration_formated != '00:00:00') OR
            (duration > 0)
        ) THEN 1 
    END) as atendidas_com_duracao,
    AVG(CASE 
        WHEN status_voip = 'normal_clearing' THEN
            CASE 
                WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
                    EXTRACT(EPOCH FROM duration_formated::interval)
                WHEN duration > 0 THEN duration
                ELSE NULL
            END
        ELSE NULL
    END) as duracao_media_segundos,
    ROUND(AVG(CASE 
        WHEN status_voip = 'normal_clearing' THEN
            CASE 
                WHEN duration_formated IS NOT NULL AND duration_formated != '00:00:00' THEN
                    EXTRACT(EPOCH FROM duration_formated::interval)
                WHEN duration > 0 THEN duration
                ELSE NULL
            END
        ELSE NULL
    END) / 60, 1) as duracao_media_minutos
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND created_at >= NOW() - INTERVAL '30 days';

SELECT 'FUNÇÃO CORRIGIDA - USANDO DURATION_FORMATED + NORMAL_CLEARING!' as status;
