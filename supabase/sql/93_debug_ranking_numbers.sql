-- ===================================================================
-- DEBUG RANKING NUMBERS - Verificar se números batem
-- ===================================================================

-- 1. Verificar dados brutos da Andressa
SELECT 
    '=== DADOS BRUTOS ANDRESSA ===' as info;

SELECT 
    agent_id,
    CASE 
        WHEN LOWER(TRIM(agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
            REPLACE(LOWER(TRIM(agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
        ELSE
            LOWER(TRIM(agent_id))
    END as normalized_agent_id,
    COUNT(*) as quantidade
FROM calls 
WHERE LOWER(agent_id) LIKE '%andressa%'
GROUP BY agent_id
ORDER BY quantidade DESC;

-- 2. Verificar mapeamento com profiles para Andressa
SELECT 
    '=== MAPEAMENTO ANDRESSA COM PROFILES ===' as info;

SELECT 
    c.agent_id,
    CASE 
        WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
            REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
        ELSE
            LOWER(TRIM(c.agent_id))
    END as normalized_id,
    p.email as profile_email,
    p.full_name as profile_name,
    COUNT(*) as quantidade_calls
FROM calls c
LEFT JOIN profiles p ON (
    CASE 
        WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
        REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
    ELSE
        LOWER(TRIM(c.agent_id))
    END
) = LOWER(TRIM(p.email))
WHERE LOWER(c.agent_id) LIKE '%andressa%'
GROUP BY c.agent_id, p.email, p.full_name
ORDER BY quantidade_calls DESC;

-- 3. Testar função get_sdr_metrics para Andressa
SELECT 
    '=== RESULTADO GET_SDR_METRICS ANDRESSA ===' as info;

SELECT 
    sdr_id,
    sdr_name,
    total_calls
FROM public.get_sdr_metrics(30)
WHERE LOWER(sdr_name) LIKE '%andressa%'
ORDER BY total_calls DESC;

-- 4. Comparar com get_calls_with_filters
SELECT 
    '=== RESULTADO GET_CALLS_WITH_FILTERS ANDRESSA ===' as info;

SELECT 
    sdr_name,
    sdr_email,
    agent_id,
    COUNT(*) as quantidade
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0)
WHERE LOWER(sdr_name) LIKE '%andressa%'
GROUP BY sdr_name, sdr_email, agent_id
ORDER BY quantidade DESC;

-- 5. Verificar se há problema na agregação da função
SELECT 
    '=== DEBUG AGREGAÇÃO FUNÇÃO ===' as info;

-- Simular o que a função faz internamente
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
        c.agent_id as original_agent_id
        
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
    
    WHERE c.created_at >= NOW() - INTERVAL '30 days'
    AND c.agent_id IS NOT NULL 
    AND TRIM(c.agent_id) != ''
    AND LOWER(c.agent_id) LIKE '%andressa%'
)
SELECT 
    normalized_sdr_id,
    sdr_display_name,
    original_agent_id,
    COUNT(*) as total_calls
FROM sdr_data
GROUP BY normalized_sdr_id, sdr_display_name, original_agent_id
ORDER BY total_calls DESC;

SELECT 'Debug dos números do ranking concluído!' as status;
