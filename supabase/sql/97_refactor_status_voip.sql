-- ===================================================================
-- REFACTOR STATUS VOIP - Mapear status_voip para descrições amigáveis
-- ===================================================================

-- 1. Verificar valores atuais de status_voip
SELECT 
    '=== VALORES ATUAIS DE STATUS_VOIP ===' as info;

SELECT 
    status_voip,
    COUNT(*) as quantidade,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentual
FROM calls 
WHERE status_voip IS NOT NULL
GROUP BY status_voip
ORDER BY quantidade DESC;

-- 2. Verificar se há outros valores não mapeados
SELECT 
    '=== VERIFICANDO VALORES NÃO MAPEADOS ===' as info;

SELECT DISTINCT 
    status_voip,
    COUNT(*) as quantidade
FROM calls 
WHERE status_voip IS NOT NULL 
AND status_voip NOT IN ('no_answer', 'originator_cancel', 'normal_clearing', 'number_changed')
GROUP BY status_voip
ORDER BY quantidade DESC;

-- 3. Criar função para mapear status_voip
CREATE OR REPLACE FUNCTION public.map_status_voip(status_code TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN status_code = 'no_answer' THEN 'Não atendida'
        WHEN status_code = 'originator_cancel' THEN 'Cancelada pela SDR'
        WHEN status_code = 'normal_clearing' THEN 'Atendida'
        WHEN status_code = 'number_changed' THEN 'Numero mudou'
        WHEN status_code IS NULL THEN 'Status desconhecido'
        ELSE INITCAP(REPLACE(status_code, '_', ' '))  -- Fallback para outros valores
    END;
$$;

-- 4. Atualizar função get_calls_with_filters para incluir status mapeado
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
    status_voip_friendly TEXT,  -- NOVO CAMPO
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
            -- Filtro por SDR (normalizar domínio para busca)
            (p_sdr IS NULL OR p_sdr = '' OR 
             LOWER(
                CASE 
                    WHEN LOWER(TRIM(c.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                        REPLACE(LOWER(TRIM(c.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                    ELSE
                        LOWER(TRIM(c.agent_id))
                END
             ) LIKE '%' || LOWER(p_sdr) || '%')
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
        -- PRIORIDADE PARA ENTERPRISE
        CASE 
            WHEN fc.enterprise IS NOT NULL AND TRIM(fc.enterprise) != '' AND TRIM(fc.enterprise) != 'null' THEN 
                TRIM(fc.enterprise)
            WHEN fc.insights->>'companyName' IS NOT NULL AND TRIM(fc.insights->>'companyName') != '' THEN 
                TRIM(fc.insights->>'companyName')
            WHEN fc.insights->>'company' IS NOT NULL AND TRIM(fc.insights->>'company') != '' THEN 
                TRIM(fc.insights->>'company')
            ELSE 
                'Empresa ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
        END AS company_name,
        -- PRIORIDADE PARA PERSON
        CASE 
            WHEN fc.person IS NOT NULL AND TRIM(fc.person) != '' AND TRIM(fc.person) != 'null' THEN 
                TRIM(fc.person)
            WHEN fc.insights->>'personName' IS NOT NULL AND TRIM(fc.insights->>'personName') != '' THEN 
                TRIM(fc.insights->>'personName')
            WHEN fc.insights->>'person' IS NOT NULL AND TRIM(fc.insights->>'person') != '' THEN 
                TRIM(fc.insights->>'person')
            ELSE 
                'Pessoa Desconhecida'
        END AS person_name,
        -- Email da pessoa
        COALESCE(
            NULLIF(TRIM(fc.insights->>'personEmail'), ''),
            NULLIF(TRIM(fc.insights->>'email'), ''),
            NULL
        ) AS person_email,
        -- SDR ID (normalizado)
        CASE 
            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
            ELSE
                LOWER(TRIM(fc.agent_id))
        END AS sdr_id,
        -- Nome do SDR (buscar na tabela profiles)
        COALESCE(
            p.full_name,
            -- Fallback: extrair do email
            INITCAP(REPLACE(SPLIT_PART(
                CASE 
                    WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                        REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                    ELSE
                        LOWER(TRIM(fc.agent_id))
                END, '@', 1), '.', ' '))
        ) AS sdr_name,
        -- Email do SDR (normalizado)
        CASE 
            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
            ELSE
                LOWER(TRIM(fc.agent_id))
        END AS sdr_email,
        -- Avatar URL (usar do profiles ou fallback)
        COALESCE(
            p.avatar_url,
            'https://i.pravatar.cc/64?u=' || 
            CASE 
                WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                    REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                ELSE
                    LOWER(TRIM(fc.agent_id))
            END
        ) AS sdr_avatar_url,
        -- Status original
        fc.status,
        -- Status VOIP original
        fc.status_voip,
        -- Status VOIP mapeado (NOVO!)
        public.map_status_voip(fc.status_voip) AS status_voip_friendly,
        -- Outros campos
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
    -- JOIN com profiles usando email normalizado
    LEFT JOIN profiles p ON (
        CASE 
            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
            ELSE
                LOWER(TRIM(fc.agent_id))
        END
    ) = LOWER(TRIM(p.email));
END;
$$;

-- 5. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO service_role;

GRANT EXECUTE ON FUNCTION public.map_status_voip TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_status_voip TO anon;
GRANT EXECUTE ON FUNCTION public.map_status_voip TO service_role;

-- 6. Testar mapeamento de status
SELECT 
    '=== TESTANDO MAPEAMENTO DE STATUS ===' as teste;

SELECT 
    status_voip,
    public.map_status_voip(status_voip) as status_friendly,
    COUNT(*) as quantidade
FROM calls 
WHERE status_voip IS NOT NULL
GROUP BY status_voip
ORDER BY quantidade DESC;

-- 7. Testar função atualizada
SELECT 
    '=== TESTANDO FUNÇÃO ATUALIZADA ===' as teste_funcao;

SELECT 
    company_name,
    sdr_name,
    status_voip,
    status_voip_friendly,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0)
ORDER BY created_at DESC;

SELECT 'Status VOIP refatorado com mapeamento amigável!' as status;
