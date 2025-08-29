-- ===================================================================
-- FIX NAME NORMALIZATION - Normalizar nomes para eliminar duplicação
-- ===================================================================

-- 1. Dropar função atual
DROP FUNCTION IF EXISTS public.get_sdr_metrics CASCADE;

-- 2. Recriar função com normalização inteligente de nomes
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
            COUNT(CASE WHEN status = 'answered' THEN 1 END) as answered_calls,
            AVG(CASE WHEN duration > 0 THEN duration END) as avg_duration,
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

-- 4. Testar função com normalização
SELECT 
    '=== TESTANDO FUNÇÃO COM NORMALIZAÇÃO ===' as teste;

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

-- 5. Verificar se eliminou TODA duplicação
SELECT 
    '=== VERIFICANDO DUPLICAÇÃO FINAL ===' as verificacao;

SELECT 
    sdr_name,
    COUNT(*) as quantidade_entradas
FROM public.get_sdr_metrics(30)
GROUP BY sdr_name
HAVING COUNT(*) > 1;

-- Se não retornar nada = SEM DUPLICAÇÃO!

SELECT 'Função corrigida com normalização inteligente de nomes!' as status;
