-- ===================================================================
-- FIX SDR METRICS DURATION - Calcular duração média apenas das atendidas
-- ===================================================================

-- 1. Dropar função atual
DROP FUNCTION IF EXISTS public.get_sdr_metrics CASCADE;

-- 2. Recriar função com duração média APENAS das chamadas atendidas
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
            -- SDR ID (normalizado)
            CASE 
                WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                    REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                ELSE
                    LOWER(TRIM(c.agent_id))
            END AS normalized_sdr_id,
            
            -- Nome do SDR com normalização inteligente
            CASE
                -- Se tem mapeamento no profiles, usar o full_name
                WHEN p.full_name IS NOT NULL AND TRIM(p.full_name) != '' THEN
                    TRIM(p.full_name)
                -- Se não tem mapeamento, extrair nome do email e normalizar
                ELSE
                    -- Remover prefixos numéricos (1001-, 1017-, 1018-, etc.)
                    REGEXP_REPLACE(
                        INITCAP(REPLACE(SPLIT_PART(
                            CASE 
                                WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                                    REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                                ELSE
                                    LOWER(TRIM(c.agent_id))
                            END, '@', 1), '.', ' ')),
                        '^[0-9]+-', ''  -- Remove números no início (1001-, 1017-, etc.)
                    )
            END AS sdr_display_name,
            
            c.status_voip,  -- USAR STATUS_VOIP AO INVÉS DE STATUS
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
    -- Normalizar nomes similares para o mesmo grupo
    normalized_names AS (
        SELECT 
            *,
            -- Criar chave de agrupamento normalizada
            CASE
                -- Casos específicos conhecidos
                WHEN LOWER(sdr_display_name) LIKE '%andressa%' THEN 'Andressa Habinoski'
                WHEN LOWER(sdr_display_name) LIKE '%camila%ataliba%' OR LOWER(sdr_display_name) LIKE '%ataliba%' THEN 'Camila Ataliba'
                WHEN LOWER(sdr_display_name) LIKE '%ruama%' OR LOWER(sdr_display_name) LIKE '%lô%ruama%' THEN 'Lô-Ruama Oliveira'
                WHEN LOWER(sdr_display_name) LIKE '%mariana%' THEN 'Mariana Costa'
                WHEN LOWER(sdr_display_name) LIKE '%isabel%' THEN 'Isabel Pestilho'
                WHEN LOWER(sdr_display_name) LIKE '%barbara%' THEN 'Barbara Rabech'
                WHEN LOWER(sdr_display_name) LIKE '%rafael%' THEN 'Rafael Garcia'
                WHEN LOWER(sdr_display_name) LIKE '%geraldo%' THEN 'Geraldo Hisao'
                WHEN LOWER(sdr_display_name) LIKE '%cesar%' THEN 'César Intrieri'
                WHEN LOWER(sdr_display_name) LIKE '%danilo%' THEN 'Tarcis Danilo'
                WHEN LOWER(sdr_display_name) LIKE '%samuel%' THEN 'Samuel Bueno'
                WHEN LOWER(sdr_display_name) LIKE '%victor%' THEN 'Victor Hernandes'
                -- Caso padrão: usar o nome como está
                ELSE sdr_display_name
            END AS normalized_group_name
        FROM sdr_data
    ),
    -- AGREGAÇÃO POR NOME NORMALIZADO
    aggregated AS (
        SELECT 
            normalized_group_name, -- CHAVE DE AGRUPAMENTO: NOME NORMALIZADO
            COUNT(*) as total_calls,
            -- Apenas normal_clearing conta como atendida
            COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
            -- DURAÇÃO MÉDIA APENAS DAS CHAMADAS ATENDIDAS (normal_clearing)
            AVG(CASE 
                WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration 
                ELSE NULL 
            END) as avg_duration,
            AVG(CASE WHEN call_score > 0 THEN call_score END) as avg_score,
            -- Pegar o primeiro sdr_id para representar o grupo
            MIN(normalized_sdr_id) as representative_sdr_id
        FROM normalized_names
        WHERE normalized_group_name IS NOT NULL 
        AND TRIM(normalized_group_name) != ''
        GROUP BY normalized_group_name -- AGRUPA POR NOME NORMALIZADO
    )
    SELECT 
        a.representative_sdr_id as sdr_id,
        a.normalized_group_name as sdr_name,
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
    '=== TESTANDO FUNÇÃO CORRIGIDA ===' as teste;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    ROUND((answered_calls::NUMERIC / total_calls) * 100, 1) as taxa_atendimento,
    CASE 
        WHEN avg_duration > 0 THEN 
            ROUND(avg_duration / 60, 1) || 'm'
        ELSE '0m'
    END as duracao_media_atendidas,
    CASE 
        WHEN avg_score > 0 THEN ROUND(avg_score, 1)
        ELSE NULL
    END as nota_media
FROM public.get_sdr_metrics(30)
ORDER BY total_calls DESC
LIMIT 10;

SELECT 'FUNÇÃO get_sdr_metrics CORRIGIDA - Duração média apenas das atendidas!' as status;
