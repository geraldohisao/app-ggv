-- ===================================================================
-- FIX MIN SCORE FILTER - Adicionar filtro de score mínimo com paginação
-- ===================================================================

-- 1. Verificar estrutura atual das tabelas relevantes
SELECT 
    'ESTRUTURA CALL_ANALYSIS' as info,
    COUNT(*) as total_analysis,
    AVG(final_grade) as avg_score,
    MIN(final_grade) as min_score,
    MAX(final_grade) as max_score
FROM call_analysis 
WHERE final_grade IS NOT NULL;

SELECT 
    'ESTRUTURA SCORECARD' as info,
    COUNT(*) as total_scorecards,
    COUNT(CASE WHEN scorecard IS NOT NULL AND scorecard != 'null'::jsonb THEN 1 END) as with_scorecard
FROM calls 
WHERE scorecard IS NOT NULL;

-- 2. Atualizar função para incluir parâmetro min_score
DROP FUNCTION IF EXISTS public.get_calls_with_filters CASCADE;

CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_start_date TEXT DEFAULT NULL,
    p_end_date TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'created_at',
    p_min_duration INTEGER DEFAULT NULL,
    p_max_duration INTEGER DEFAULT NULL,
    p_min_score NUMERIC DEFAULT NULL
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
    score NUMERIC,
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
    sort_field TEXT;
    sort_order TEXT;
BEGIN
    -- Converter datas se fornecidas
    IF p_start_date IS NOT NULL AND p_start_date != '' THEN
        query_start_date := p_start_date::TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF p_end_date IS NOT NULL AND p_end_date != '' THEN
        query_end_date := p_end_date::TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Configurar ordenação
    CASE p_sort_by
        WHEN 'duration' THEN 
            sort_field := 'c.duration';
            sort_order := 'DESC';
        WHEN 'score' THEN 
            sort_field := 'calculated_score';
            sort_order := 'DESC NULLS LAST';
        WHEN 'score_asc' THEN 
            sort_field := 'calculated_score';
            sort_order := 'ASC NULLS LAST';
        WHEN 'company' THEN 
            sort_field := 'company_name';
            sort_order := 'ASC';
        ELSE 
            sort_field := 'c.created_at';
            sort_order := 'DESC';
    END CASE;

    RETURN QUERY
    WITH base_calls AS (
        SELECT 
            c.*,
            -- Calcular score de múltiplas fontes
            COALESCE(
                -- Primeiro: call_analysis (escala 0-10)
                ca.final_grade,
                -- Segundo: scorecard overall_score (escala 0-10)
                CASE 
                    WHEN c.scorecard IS NOT NULL AND c.scorecard != 'null'::jsonb THEN
                        COALESCE(
                            (c.scorecard->>'overall_score')::NUMERIC,
                            (c.scorecard->>'final_score')::NUMERIC,
                            (c.scorecard->>'total_score')::NUMERIC,
                            (c.scorecard->>'score')::NUMERIC
                        )
                    ELSE NULL
                END
            ) AS calculated_score
        FROM calls c
        LEFT JOIN call_analysis ca ON c.id = ca.call_id
        WHERE 
            -- Filtro por SDR
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
            AND (p_status IS NULL OR p_status = '' OR c.status_voip = p_status)
            -- Filtro por tipo
            AND (p_type IS NULL OR p_type = '' OR c.call_type = p_type)
            -- Filtro por data de início
            AND (query_start_date IS NULL OR c.created_at >= query_start_date)
            -- Filtro por data de fim
            AND (query_end_date IS NULL OR c.created_at <= query_end_date)
            -- Filtro por duração mínima
            AND (p_min_duration IS NULL OR c.duration >= p_min_duration)
            -- Filtro por duração máxima
            AND (p_max_duration IS NULL OR c.duration <= p_max_duration)
    ),
    filtered_calls AS (
        SELECT 
            bc.*,
            COUNT(*) OVER() as total_count
        FROM base_calls bc
        WHERE 
            -- FILTRO DE SCORE MÍNIMO (aplicado após cálculo do score)
            (p_min_score IS NULL OR 
             (bc.calculated_score IS NOT NULL AND bc.calculated_score >= p_min_score))
    ),
    ordered_calls AS (
        SELECT *
        FROM filtered_calls
        ORDER BY 
            CASE WHEN sort_field = 'c.duration' AND sort_order = 'DESC' THEN duration END DESC,
            CASE WHEN sort_field = 'calculated_score' AND sort_order = 'DESC NULLS LAST' THEN calculated_score END DESC,
            CASE WHEN sort_field = 'calculated_score' AND sort_order = 'ASC NULLS LAST' THEN calculated_score END ASC,
            CASE WHEN sort_field = 'c.created_at' AND sort_order = 'DESC' THEN created_at END DESC,
            company_name ASC -- fallback para ordenação estável
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
        
        -- SDR ID
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
        
        -- NOME DO SDR
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
        
        -- Email do SDR
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
        
        -- Score calculado (escala 0-10)
        fc.calculated_score AS score,
        
        fc.from_number,
        fc.to_number,
        fc.agent_id,
        fc.created_at,
        fc.updated_at,
        fc.processed_at,
        fc.total_count
        
    FROM ordered_calls fc
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

-- 4. Teste da função com filtro de score mínimo
SELECT 
    'TESTE FILTRO SCORE >= 7' as teste,
    COUNT(*) as total_calls,
    AVG(score) as avg_score,
    MIN(score) as min_score,
    MAX(score) as max_score
FROM public.get_calls_with_filters(
    p_sdr := NULL,
    p_status := NULL,
    p_type := NULL,
    p_start_date := NULL,
    p_end_date := NULL,
    p_limit := 1000,
    p_offset := 0,
    p_sort_by := 'score',
    p_min_duration := NULL,
    p_max_duration := NULL,
    p_min_score := 7.0
);

-- 5. Teste específico: buscar chamadas com score >= 7
SELECT 
    id,
    company_name,
    sdr_name,
    duration,
    score,
    created_at
FROM public.get_calls_with_filters(
    p_sdr := NULL,
    p_status := NULL,
    p_type := NULL,
    p_start_date := NULL,
    p_end_date := NULL,
    p_limit := 10,
    p_offset := 0,
    p_sort_by := 'score',
    p_min_duration := NULL,
    p_max_duration := NULL,
    p_min_score := 7.0
)
ORDER BY score DESC;

SELECT 'FUNÇÃO ATUALIZADA COM FILTRO MIN_SCORE!' as status;


