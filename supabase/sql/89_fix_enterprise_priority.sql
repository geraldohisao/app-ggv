-- ===================================================================
-- FIX ENTERPRISE PRIORITY - Corrigir prioridade do campo enterprise
-- ===================================================================

-- 1. Verificar dados reais da coluna enterprise
SELECT 
    'Verificando dados enterprise:' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN enterprise IS NOT NULL AND enterprise != '' THEN 1 END) as com_enterprise_preenchido,
    COUNT(CASE WHEN enterprise IS NULL OR enterprise = '' THEN 1 END) as sem_enterprise
FROM calls;

-- 2. Mostrar exemplos de dados enterprise
SELECT 
    'Exemplos de enterprise:' as info;

SELECT 
    id,
    enterprise,
    deal_id,
    CASE 
        WHEN enterprise IS NOT NULL AND enterprise != '' THEN 'TEM ENTERPRISE: ' || enterprise
        ELSE 'SEM ENTERPRISE (deal_id: ' || deal_id || ')'
    END as status_enterprise
FROM calls 
ORDER BY created_at DESC
LIMIT 5;

-- 3. Recriar função com prioridade ABSOLUTA para enterprise
CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_start_date TEXT DEFAULT NULL,
    p_end_date TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company_name TEXT,
    person_name TEXT,
    person_email TEXT,
    sdr_id TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
    status TEXT,
    duration INTEGER,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
    audio_url TEXT,
    transcription TEXT,
    transcript_status TEXT,
    ai_status TEXT,
    insights JSONB,
    scorecard JSONB,
    score INTEGER,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    query_start_date TIMESTAMP WITH TIME ZONE;
    query_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Converter datas se fornecidas
    IF p_start_date IS NOT NULL AND p_start_date != '' THEN
        query_start_date := p_start_date::TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF p_end_date IS NOT NULL AND p_end_date != '' THEN
        query_end_date := p_end_date::TIMESTAMP WITH TIME ZONE;
    END IF;

    RETURN QUERY
    WITH filtered_calls AS (
        SELECT 
            c.*,
            COUNT(*) OVER() as total_count
        FROM calls c
        WHERE 
            -- Filtro por SDR
            (p_sdr IS NULL OR p_sdr = '' OR LOWER(c.agent_id) LIKE '%' || LOWER(p_sdr) || '%')
            -- Filtro por status
            AND (p_status IS NULL OR p_status = '' OR c.status = p_status)
            -- Filtro por tipo
            AND (p_type IS NULL OR p_type = '' OR c.call_type = p_type)
            -- Filtro por data de início
            AND (query_start_date IS NULL OR c.created_at >= query_start_date)
            -- Filtro por data de fim
            AND (query_end_date IS NULL OR c.created_at <= query_end_date)
        ORDER BY c.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        fc.id,
        fc.provider_call_id,
        fc.deal_id,
        -- PRIORIDADE ABSOLUTA PARA ENTERPRISE
        CASE 
            WHEN fc.enterprise IS NOT NULL AND TRIM(fc.enterprise) != '' THEN TRIM(fc.enterprise)
            WHEN fc.insights->>'companyName' IS NOT NULL AND TRIM(fc.insights->>'companyName') != '' THEN TRIM(fc.insights->>'companyName')
            WHEN fc.insights->>'company' IS NOT NULL AND TRIM(fc.insights->>'company') != '' THEN TRIM(fc.insights->>'company')
            ELSE 'Empresa ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
        END AS company_name,
        -- PRIORIDADE ABSOLUTA PARA PERSON
        CASE 
            WHEN fc.person IS NOT NULL AND TRIM(fc.person) != '' THEN TRIM(fc.person)
            WHEN fc.insights->>'personName' IS NOT NULL AND TRIM(fc.insights->>'personName') != '' THEN TRIM(fc.insights->>'personName')
            WHEN fc.insights->>'person' IS NOT NULL AND TRIM(fc.insights->>'person') != '' THEN TRIM(fc.insights->>'person')
            ELSE 'Pessoa Desconhecida'
        END AS person_name,
        -- Email da pessoa
        COALESCE(
            NULLIF(TRIM(fc.insights->>'personEmail'), ''),
            NULLIF(TRIM(fc.insights->>'email'), ''),
            NULL
        ) AS person_email,
        -- SDR ID
        LOWER(TRIM(fc.agent_id)) AS sdr_id,
        -- Nome do SDR
        CASE 
            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@grupoggv.com' THEN
                INITCAP(REPLACE(SPLIT_PART(fc.agent_id, '@', 1), '.', ' '))
            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                INITCAP(REPLACE(SPLIT_PART(fc.agent_id, '@', 1), '.', ' '))
            ELSE
                INITCAP(REPLACE(SPLIT_PART(fc.agent_id, '@', 1), '.', ' '))
        END AS sdr_name,
        -- Email do SDR (normalizado)
        CASE 
            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
            ELSE
                LOWER(TRIM(fc.agent_id))
        END AS sdr_email,
        -- Avatar URL
        'https://i.pravatar.cc/64?u=' || LOWER(TRIM(fc.agent_id)) AS sdr_avatar_url,
        -- Outros campos
        fc.status,
        fc.duration,
        fc.call_type,
        COALESCE(fc.direction, 'outbound') AS direction,
        fc.recording_url,
        fc.audio_bucket,
        fc.audio_path,
        -- Audio URL
        CASE 
            WHEN fc.recording_url IS NOT NULL THEN fc.recording_url
            WHEN fc.audio_bucket IS NOT NULL AND fc.audio_path IS NOT NULL THEN
                'https://' || fc.audio_bucket || '.supabase.co/storage/v1/object/public/' || fc.audio_path
            ELSE NULL
        END AS audio_url,
        fc.transcription,
        COALESCE(fc.transcript_status, 'pending') AS transcript_status,
        COALESCE(fc.ai_status, 'pending') AS ai_status,
        fc.insights,
        fc.scorecard,
        -- Score calculado do scorecard
        CASE 
            WHEN fc.scorecard IS NOT NULL AND fc.scorecard != 'null'::jsonb THEN
                COALESCE((fc.scorecard->>'overall_score')::INTEGER, 
                        (fc.scorecard->>'score')::INTEGER,
                        NULL)
            ELSE NULL
        END AS score,
        fc.from_number,
        fc.to_number,
        fc.agent_id,
        fc.created_at,
        fc.updated_at,
        fc.processed_at,
        fc.total_count
    FROM filtered_calls fc;
END;
$$;

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO service_role;

-- 5. Testar a função corrigida
SELECT 
    'Testando função com prioridade enterprise:' as teste;

SELECT 
    id,
    company_name,
    person_name,
    sdr_name,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0)
ORDER BY created_at DESC;

-- 6. Verificar se enterprise está sendo usado
SELECT 
    'Verificando se enterprise está sendo usado:' as info,
    company_name,
    COUNT(*) as quantidade
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 0)
GROUP BY company_name
ORDER BY quantidade DESC;

SELECT 'Função corrigida com prioridade ABSOLUTA para enterprise!' as status;
