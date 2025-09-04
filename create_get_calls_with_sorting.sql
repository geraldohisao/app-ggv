-- ===================================================================
-- CREATE GET_CALLS_WITH_SORTING - Função com ordenação dinâmica
-- ===================================================================

-- Criar função que aceita parâmetro de ordenação
CREATE OR REPLACE FUNCTION public.get_calls_with_sorting(
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_start_date TEXT DEFAULT NULL,
    p_end_date TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'created_at' -- Novo parâmetro
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
    order_clause TEXT;
BEGIN
    -- Converter datas se fornecidas
    IF p_start_date IS NOT NULL AND p_start_date != '' THEN
        query_start_date := p_start_date::TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF p_end_date IS NOT NULL AND p_end_date != '' THEN
        query_end_date := p_end_date::TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Definir ordenação baseada no parâmetro
    CASE p_sort_by
        WHEN 'duration' THEN order_clause := 'c.duration DESC NULLS LAST';
        WHEN 'score' THEN order_clause := 'COALESCE((c.scorecard->>' || quote_literal('overall_score') || ')::INTEGER, (c.scorecard->>' || quote_literal('score') || ')::INTEGER, 0) DESC';
        WHEN 'company' THEN order_clause := 'COALESCE(c.enterprise, c.insights->>''companyName'', c.insights->>''company'') ASC';
        ELSE order_clause := 'c.created_at DESC';
    END CASE;

    RETURN QUERY EXECUTE format('
        WITH filtered_calls AS (
            SELECT 
                c.*,
                COUNT(*) OVER() as total_count
            FROM calls c
            WHERE 
                ($1 IS NULL OR $1 = '''' OR 
                 (c.agent_id IS NOT NULL AND TRIM(c.agent_id) != '''' AND
                  LOWER(
                    CASE 
                        WHEN LOWER(TRIM(c.agent_id)) LIKE ''%%@ggvinteligencia.com.br'' THEN
                            REPLACE(LOWER(TRIM(c.agent_id)), ''@ggvinteligencia.com.br'', ''@grupoggv.com'')
                        ELSE
                            LOWER(TRIM(c.agent_id))
                    END
                 ) LIKE ''%%'' || LOWER($1) || ''%%''))
                AND ($2 IS NULL OR $2 = '''' OR c.status = $2)
                AND ($3 IS NULL OR $3 = '''' OR c.call_type = $3)
                AND ($4 IS NULL OR c.created_at >= $4)
                AND ($5 IS NULL OR c.created_at <= $5)
            ORDER BY %s
            LIMIT $6 OFFSET $7
        )
        SELECT 
            fc.id,
            fc.provider_call_id,
            fc.deal_id,
            
            COALESCE(
                CASE 
                    WHEN fc.enterprise IS NOT NULL 
                        AND TRIM(fc.enterprise) != '''' 
                        AND TRIM(fc.enterprise) != ''null''
                        AND LENGTH(TRIM(fc.enterprise)) > 1
                    THEN TRIM(fc.enterprise)
                    ELSE NULL
                END,
                CASE 
                    WHEN fc.insights->>''companyName'' IS NOT NULL 
                        AND TRIM(fc.insights->>''companyName'') != '''' 
                        AND LENGTH(TRIM(fc.insights->>''companyName'')) > 1
                    THEN TRIM(fc.insights->>''companyName'')
                    ELSE NULL
                END,
                CASE 
                    WHEN fc.insights->>''company'' IS NOT NULL 
                        AND TRIM(fc.insights->>''company'') != '''' 
                        AND LENGTH(TRIM(fc.insights->>''company'')) > 1
                    THEN TRIM(fc.insights->>''company'')
                    ELSE NULL
                END,
                ''Empresa '' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
            ) AS company_name,
            
            COALESCE(
                CASE 
                    WHEN fc.person IS NOT NULL 
                        AND TRIM(fc.person) != '''' 
                        AND TRIM(fc.person) != ''null''
                        AND LENGTH(TRIM(fc.person)) > 1
                    THEN TRIM(fc.person)
                    ELSE NULL
                END,
                CASE 
                    WHEN fc.insights->>''personName'' IS NOT NULL 
                        AND TRIM(fc.insights->>''personName'') != '''' 
                        AND LENGTH(TRIM(fc.insights->>''personName'')) > 1
                    THEN TRIM(fc.insights->>''personName'')
                    ELSE NULL
                END,
                ''Contato '' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
            ) AS person_name,
            
            COALESCE(
                NULLIF(TRIM(fc.insights->>''personEmail''), ''''),
                NULL
            ) AS person_email,
            
            CASE 
                WHEN fc.agent_id IS NOT NULL AND TRIM(fc.agent_id) != '''' THEN
                    CASE 
                        WHEN LOWER(TRIM(fc.agent_id)) LIKE ''%%@ggvinteligencia.com.br'' THEN
                            REPLACE(LOWER(TRIM(fc.agent_id)), ''@ggvinteligencia.com.br'', ''@grupoggv.com'')
                        ELSE
                            LOWER(TRIM(fc.agent_id))
                    END
                ELSE NULL
            END AS sdr_id,
            
            CASE
                WHEN fc.agent_id IS NULL OR TRIM(fc.agent_id) = '''' THEN
                    ''Sistema/Automático''
                WHEN p.full_name IS NOT NULL AND TRIM(p.full_name) != '''' THEN
                    TRIM(p.full_name)
                ELSE
                    REGEXP_REPLACE(
                        INITCAP(REPLACE(SPLIT_PART(
                            CASE 
                                WHEN LOWER(TRIM(fc.agent_id)) LIKE ''%%@ggvinteligencia.com.br'' THEN
                                    REPLACE(LOWER(TRIM(fc.agent_id)), ''@ggvinteligencia.com.br'', ''@grupoggv.com'')
                                ELSE
                                    LOWER(TRIM(fc.agent_id))
                            END, ''@'', 1), ''.'', '' '')),
                        ''^[0-9]+-'', ''''
                    )
            END AS sdr_name,
            
            CASE 
                WHEN fc.agent_id IS NOT NULL AND TRIM(fc.agent_id) != '''' THEN
                    CASE 
                        WHEN LOWER(TRIM(fc.agent_id)) LIKE ''%%@ggvinteligencia.com.br'' THEN
                            REPLACE(LOWER(TRIM(fc.agent_id)), ''@ggvinteligencia.com.br'', ''@grupoggv.com'')
                        ELSE
                            LOWER(TRIM(fc.agent_id))
                    END
                ELSE NULL
            END AS sdr_email,
            
            CASE 
                WHEN fc.agent_id IS NULL OR TRIM(fc.agent_id) = '''' THEN
                    ''https://i.pravatar.cc/64?u=sistema''
                ELSE
                    COALESCE(
                        p.avatar_url,
                        ''https://i.pravatar.cc/64?u='' || 
                        CASE 
                            WHEN LOWER(TRIM(fc.agent_id)) LIKE ''%%@ggvinteligencia.com.br'' THEN
                                REPLACE(LOWER(TRIM(fc.agent_id)), ''@ggvinteligencia.com.br'', ''@grupoggv.com'')
                            ELSE
                                LOWER(TRIM(fc.agent_id))
                        END
                    )
            END AS sdr_avatar_url,
            
            fc.status,
            fc.status_voip,
            public.map_status_voip(fc.status_voip) AS status_voip_friendly,
            fc.duration,
            fc.call_type,
            COALESCE(fc.direction, ''outbound'') AS direction,
            fc.recording_url,
            fc.audio_bucket,
            fc.audio_path,
            
            CASE 
                WHEN fc.recording_url IS NOT NULL THEN fc.recording_url
                WHEN fc.audio_bucket IS NOT NULL AND fc.audio_path IS NOT NULL THEN
                    ''https://'' || fc.audio_bucket || ''.supabase.co/storage/v1/object/public/'' || fc.audio_path
                ELSE NULL
            END AS audio_url,
            
            fc.transcription,
            COALESCE(fc.transcript_status, ''pending'') AS transcript_status,
            COALESCE(fc.ai_status, ''pending'') AS ai_status,
            fc.insights,
            fc.scorecard,
            
            CASE 
                WHEN fc.scorecard IS NOT NULL AND fc.scorecard != ''null''::jsonb THEN
                    COALESCE((fc.scorecard->>''overall_score'')::INTEGER, 
                            (fc.scorecard->>''score'')::INTEGER,
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
        LEFT JOIN profiles p ON (
            fc.agent_id IS NOT NULL 
            AND TRIM(fc.agent_id) != ''''
            AND (
                CASE 
                    WHEN LOWER(TRIM(fc.agent_id)) LIKE ''%%@ggvinteligencia.com.br'' THEN
                        REPLACE(LOWER(TRIM(fc.agent_id)), ''@ggvinteligencia.com.br'', ''@grupoggv.com'')
                    ELSE
                        LOWER(TRIM(fc.agent_id))
                END
            ) = LOWER(TRIM(p.email))
        )', order_clause)
    USING p_sdr, p_status, p_type, query_start_date, query_end_date, p_limit, p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_calls_with_sorting TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_sorting TO anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_sorting TO service_role;
