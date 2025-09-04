-- ===================================================================
-- FIX CALLS WITHOUT AGENT_ID - Incluir chamadas sem agent_id
-- ===================================================================

-- 1. Verificar quantas chamadas longas têm agent_id NULL
SELECT 
    'CHAMADAS LONGAS SEM AGENT_ID' as info,
    COUNT(*) as total_longas,
    COUNT(CASE WHEN agent_id IS NULL OR TRIM(agent_id) = '' THEN 1 END) as sem_agent_id,
    COUNT(CASE WHEN agent_id IS NOT NULL AND TRIM(agent_id) != '' THEN 1 END) as com_agent_id
FROM calls 
WHERE duration > 600;

-- 2. Atualizar função para incluir chamadas sem agent_id
DROP FUNCTION IF EXISTS public.get_calls_with_filters CASCADE;

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
    status_voip TEXT,
    status_voip_friendly TEXT,
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
            -- Filtro por SDR (INCLUIR CHAMADAS SEM AGENT_ID quando p_sdr for NULL)
            (p_sdr IS NULL OR p_sdr = '' OR 
             (c.agent_id IS NOT NULL AND TRIM(c.agent_id) != '' AND
              LOWER(
                CASE 
                    WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                        REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                    ELSE
                        LOWER(TRIM(c.agent_id))
                END
             ) LIKE '%' || LOWER(p_sdr) || '%'))
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
        
        -- EMPRESA
        COALESCE(
            CASE 
                WHEN fc.enterprise IS NOT NULL 
                    AND TRIM(fc.enterprise) != '' 
                    AND TRIM(fc.enterprise) != 'null'
                    AND LENGTH(TRIM(fc.enterprise)) > 1
                THEN TRIM(fc.enterprise)
                ELSE NULL
            END,
            CASE 
                WHEN fc.insights->>'companyName' IS NOT NULL 
                    AND TRIM(fc.insights->>'companyName') != '' 
                    AND LENGTH(TRIM(fc.insights->>'companyName')) > 1
                THEN TRIM(fc.insights->>'companyName')
                ELSE NULL
            END,
            CASE 
                WHEN fc.insights->>'company' IS NOT NULL 
                    AND TRIM(fc.insights->>'company') != '' 
                    AND LENGTH(TRIM(fc.insights->>'company')) > 1
                THEN TRIM(fc.insights->>'company')
                ELSE NULL
            END,
            'Empresa ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
        ) AS company_name,
        
        -- PESSOA
        COALESCE(
            CASE 
                WHEN fc.person IS NOT NULL 
                    AND TRIM(fc.person) != '' 
                    AND TRIM(fc.person) != 'null'
                    AND LENGTH(TRIM(fc.person)) > 1
                THEN TRIM(fc.person)
                ELSE NULL
            END,
            CASE 
                WHEN fc.insights->>'personName' IS NOT NULL 
                    AND TRIM(fc.insights->>'personName') != '' 
                    AND LENGTH(TRIM(fc.insights->>'personName')) > 1
                THEN TRIM(fc.insights->>'personName')
                ELSE NULL
            END,
            CASE 
                WHEN fc.insights->>'person' IS NOT NULL 
                    AND TRIM(fc.insights->>'person') != '' 
                    AND LENGTH(TRIM(fc.insights->>'person')) > 1
                THEN TRIM(fc.insights->>'person')
                ELSE NULL
            END,
            CASE 
                WHEN fc.insights->'contact'->>'name' IS NOT NULL 
                    AND TRIM(fc.insights->'contact'->>'name') != '' 
                    AND LENGTH(TRIM(fc.insights->'contact'->>'name')) > 1
                THEN TRIM(fc.insights->'contact'->>'name')
                ELSE NULL
            END,
            'Contato ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
        ) AS person_name,
        
        -- Email da pessoa
        COALESCE(
            NULLIF(TRIM(fc.insights->>'personEmail'), ''),
            NULLIF(TRIM(fc.insights->>'email'), ''),
            NULLIF(TRIM(fc.insights->'contact'->>'email'), ''),
            NULL
        ) AS person_email,
        
        -- SDR ID (pode ser NULL para chamadas sem agent_id)
        CASE 
            WHEN fc.agent_id IS NOT NULL AND TRIM(fc.agent_id) != '' THEN
                CASE 
                    WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                        REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                    ELSE
                        LOWER(TRIM(fc.agent_id))
                END
            ELSE NULL
        END AS sdr_id,
        
        -- NOME DO SDR (ou 'Sistema' para chamadas sem agent_id)
        CASE
            WHEN fc.agent_id IS NULL OR TRIM(fc.agent_id) = '' THEN
                'Sistema/Automático'
            WHEN p.full_name IS NOT NULL AND TRIM(p.full_name) != '' THEN
                TRIM(p.full_name)
            ELSE
                REGEXP_REPLACE(
                    INITCAP(REPLACE(SPLIT_PART(
                        CASE 
                            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                                REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                            ELSE
                                LOWER(TRIM(fc.agent_id))
                        END, '@', 1), '.', ' ')),
                    '^[0-9]+-', ''
                )
        END AS sdr_name,
        
        -- Email do SDR (pode ser NULL)
        CASE 
            WHEN fc.agent_id IS NOT NULL AND TRIM(fc.agent_id) != '' THEN
                CASE 
                    WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                        REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                    ELSE
                        LOWER(TRIM(fc.agent_id))
                END
            ELSE NULL
        END AS sdr_email,
        
        -- Avatar URL
        CASE 
            WHEN fc.agent_id IS NULL OR TRIM(fc.agent_id) = '' THEN
                'https://i.pravatar.cc/64?u=sistema'
            ELSE
                COALESCE(
                    p.avatar_url,
                    'https://i.pravatar.cc/64?u=' || 
                    CASE 
                        WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                            REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                        ELSE
                            LOWER(TRIM(fc.agent_id))
                    END
                )
        END AS sdr_avatar_url,
        
        -- Outros campos
        fc.status,
        fc.status_voip,
        public.map_status_voip(fc.status_voip) AS status_voip_friendly,
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
        
    FROM filtered_calls fc
    -- LEFT JOIN para não excluir chamadas sem agent_id
    LEFT JOIN profiles p ON (
        fc.agent_id IS NOT NULL 
        AND TRIM(fc.agent_id) != ''
        AND (
            CASE 
                WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                    REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                ELSE
                    LOWER(TRIM(fc.agent_id))
            END
        ) = LOWER(TRIM(p.email))
    );
END;
$$;

-- 3. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO service_role;

-- 4. Testar função corrigida com chamadas longas
SELECT 
    'TESTANDO CHAMADAS LONGAS' as teste,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration > 600 THEN 1 END) as calls_over_10min,
    MAX(duration) as max_duration
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 2000, 0);

SELECT 'FUNÇÃO CORRIGIDA - Agora inclui chamadas sem agent_id!' as status;
