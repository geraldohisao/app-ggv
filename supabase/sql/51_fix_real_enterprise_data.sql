-- 51_fix_real_enterprise_data.sql
-- CORREÇÃO DEFINITIVA PARA USAR DADOS REAIS DA COLUNA 'enterprise'

-- =========================================
-- 1. VERIFICAR SE A COLUNA ENTERPRISE EXISTE
-- =========================================

DO $$ 
BEGIN
    -- Adicionar coluna enterprise se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'calls' 
        AND column_name = 'enterprise'
    ) THEN
        ALTER TABLE public.calls ADD COLUMN enterprise TEXT;
    END IF;
    
    -- Adicionar coluna person se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'calls' 
        AND column_name = 'person'
    ) THEN
        ALTER TABLE public.calls ADD COLUMN person TEXT;
    END IF;
END $$;

-- =========================================
-- 2. LIMPAR FUNÇÕES ANTIGAS
-- =========================================

DROP FUNCTION IF EXISTS public.get_dashboard_metrics(integer);
DROP FUNCTION IF EXISTS public.get_calls_with_filters(integer, integer, text, text, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_call_details(uuid);
DROP FUNCTION IF EXISTS public.get_unique_sdrs();
DROP FUNCTION IF EXISTS public.normalize_sdr_email(text);
DROP FUNCTION IF EXISTS public.get_sdr_display_name(text);

-- =========================================
-- 3. FUNÇÕES AUXILIARES
-- =========================================

CREATE OR REPLACE FUNCTION public.normalize_sdr_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_email IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN LOWER(REPLACE(REPLACE(p_email, '@grupoggv.com', '@ggvinteligencia.com.br'), ' ', ''));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sdr_display_name(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    normalized_email TEXT;
BEGIN
    IF p_email IS NULL THEN
        RETURN 'SDR Desconhecido';
    END IF;
    
    normalized_email := public.normalize_sdr_email(p_email);
    
    RETURN CASE
        WHEN normalized_email LIKE '%camila.ataliba%' THEN 'Camila Ataliba'
        WHEN normalized_email LIKE '%andressa.santos%' THEN 'Andressa Santos'
        WHEN normalized_email LIKE '%isabel.ferreira%' THEN 'Isabel Ferreira'
        WHEN normalized_email LIKE '%lo.ruama%' THEN 'Lô-Ruama Silva'
        WHEN normalized_email LIKE '%samuel.bueno%' THEN 'Samuel Bueno'
        ELSE COALESCE(SPLIT_PART(p_email, '@', 1), 'SDR Desconhecido')
    END;
END;
$$;

-- =========================================
-- 4. FUNÇÃO GET_DASHBOARD_METRICS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_days INTEGER DEFAULT 14)
RETURNS TABLE(
    total_calls BIGINT,
    answered_calls BIGINT,
    answered_rate NUMERIC,
    avg_duration NUMERIC,
    total_sdrs BIGINT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_period_start TIMESTAMPTZ := NOW() - INTERVAL '1 day' * p_days;
    v_period_end TIMESTAMPTZ := NOW();
BEGIN
    RETURN QUERY
    SELECT
        COUNT(c.id) AS total_calls,
        COUNT(CASE WHEN c.status = 'processed' THEN c.id END) AS answered_calls,
        COALESCE(
            ROUND(
                (COUNT(CASE WHEN c.status = 'processed' THEN c.id END)::NUMERIC / 
                NULLIF(COUNT(c.id), 0)) * 100, 
                2
            ), 
            0
        ) AS answered_rate,
        COALESCE(ROUND(AVG(c.duration)::NUMERIC, 2), 0) AS avg_duration,
        COUNT(DISTINCT public.normalize_sdr_email(c.agent_id)) AS total_sdrs,
        v_period_start AS period_start,
        v_period_end AS period_end
    FROM
        public.calls c
    WHERE
        c.created_at >= v_period_start 
        AND c.created_at <= v_period_end;
END;
$$;

-- =========================================
-- 5. FUNÇÃO GET_CALLS_WITH_FILTERS - USANDO DADOS REAIS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sdr_email TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
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
    transcription TEXT,
    transcript_status TEXT,
    ai_status TEXT,
    insights JSONB,
    scorecard JSONB,
    score NUMERIC,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_search_pattern TEXT;
    v_total_count BIGINT;
BEGIN
    -- Preparar padrão de busca
    IF p_search IS NOT NULL THEN
        v_search_pattern := '%' || LOWER(p_search) || '%';
    END IF;
    
    -- Calcular total de registros
    SELECT COUNT(*)
    INTO v_total_count
    FROM public.calls c
    WHERE
        (p_sdr_email IS NULL OR 
         public.normalize_sdr_email(c.agent_id) = public.normalize_sdr_email(p_sdr_email))
        AND (p_status IS NULL OR c.status = p_status)
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
        AND (p_search IS NULL OR (
            LOWER(COALESCE(c.enterprise, '')) LIKE v_search_pattern OR
            LOWER(COALESCE(c.person, '')) LIKE v_search_pattern OR
            LOWER(COALESCE(c.deal_id, '')) LIKE v_search_pattern OR
            LOWER(COALESCE(public.get_sdr_display_name(c.agent_id), '')) LIKE v_search_pattern
        ));
    
    -- Retornar dados
    RETURN QUERY
    SELECT
        c.id,
        c.provider_call_id,
        c.deal_id,
        -- USAR COLUNA ENTERPRISE REAL
        COALESCE(
            c.enterprise,
            c.company_name,
            c.insights->>'companyName',
            c.insights->>'company',
            'Empresa ' || SUBSTRING(c.deal_id FROM '[0-9]+'),
            'Empresa Desconhecida'
        ) AS company_name,
        -- USAR COLUNA PERSON REAL
        COALESCE(
            c.person,
            c.person_name,
            c.insights->>'personName',
            c.insights->>'person',
            'Pessoa Desconhecida'
        ) AS person_name,
        COALESCE(
            c.person_email,
            c.insights->>'personEmail',
            'email@desconhecido.com'
        ) AS person_email,
        c.agent_id AS sdr_id,
        public.get_sdr_display_name(c.agent_id) AS sdr_name,
        public.normalize_sdr_email(c.agent_id) AS sdr_email,
        'https://i.pravatar.cc/64?u=' || COALESCE(public.normalize_sdr_email(c.agent_id), 'default') AS sdr_avatar_url,
        c.status,
        c.duration,
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
        c.transcription,
        c.transcript_status,
        c.ai_status,
        c.insights,
        c.scorecard,
        COALESCE((c.scorecard->>'overallScore')::NUMERIC, 0) AS score,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.created_at,
        c.updated_at,
        c.processed_at,
        v_total_count
    FROM
        public.calls c
    WHERE
        (p_sdr_email IS NULL OR 
         public.normalize_sdr_email(c.agent_id) = public.normalize_sdr_email(p_sdr_email))
        AND (p_status IS NULL OR c.status = p_status)
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
        AND (p_search IS NULL OR (
            LOWER(COALESCE(c.enterprise, '')) LIKE v_search_pattern OR
            LOWER(COALESCE(c.person, '')) LIKE v_search_pattern OR
            LOWER(COALESCE(c.deal_id, '')) LIKE v_search_pattern OR
            LOWER(COALESCE(public.get_sdr_display_name(c.agent_id), '')) LIKE v_search_pattern
        ))
    ORDER BY
        c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- =========================================
-- 6. FUNÇÃO GET_CALL_DETAILS - USANDO DADOS REAIS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_details(p_call_id UUID)
RETURNS TABLE(
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
    score NUMERIC,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    comments JSONB,
    detailed_scores JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.provider_call_id,
        c.deal_id,
        -- USAR COLUNA ENTERPRISE REAL
        COALESCE(
            c.enterprise,
            c.company_name,
            c.insights->>'companyName',
            c.insights->>'company',
            'Empresa ' || SUBSTRING(c.deal_id FROM '[0-9]+'),
            'Empresa Desconhecida'
        ) AS company_name,
        -- USAR COLUNA PERSON REAL
        COALESCE(
            c.person,
            c.person_name,
            c.insights->>'personName',
            c.insights->>'person',
            'Pessoa Desconhecida'
        ) AS person_name,
        COALESCE(
            c.person_email,
            c.insights->>'personEmail',
            'email@desconhecido.com'
        ) AS person_email,
        c.agent_id AS sdr_id,
        public.get_sdr_display_name(c.agent_id) AS sdr_name,
        public.normalize_sdr_email(c.agent_id) AS sdr_email,
        'https://i.pravatar.cc/64?u=' || COALESCE(public.normalize_sdr_email(c.agent_id), 'default') AS sdr_avatar_url,
        c.status,
        c.duration,
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
        -- Construir audio_url
        CASE
            WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN
                'https://mwlekwyxbfbxfxskywgx.supabase.co/storage/v1/object/public/' || 
                c.audio_bucket || '/' || c.audio_path
            ELSE
                c.recording_url
        END AS audio_url,
        c.transcription,
        c.transcript_status,
        c.ai_status,
        c.insights,
        c.scorecard,
        COALESCE((c.scorecard->>'overallScore')::NUMERIC, 0) AS score,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.created_at,
        c.updated_at,
        c.processed_at,
        COALESCE(c.insights->'comments', '[]'::jsonb) AS comments,
        COALESCE(c.scorecard->'criteriaScores', '[]'::jsonb) AS detailed_scores
    FROM
        public.calls c
    WHERE
        c.id = p_call_id;
END;
$$;

-- =========================================
-- 7. FUNÇÃO GET_UNIQUE_SDRS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_unique_sdrs()
RETURNS TABLE(
    sdr_id TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
    call_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.agent_id AS sdr_id,
        public.get_sdr_display_name(c.agent_id) AS sdr_name,
        public.normalize_sdr_email(c.agent_id) AS sdr_email,
        'https://i.pravatar.cc/64?u=' || COALESCE(public.normalize_sdr_email(c.agent_id), 'default') AS sdr_avatar_url,
        COUNT(c.id) AS call_count
    FROM
        public.calls c
    WHERE
        c.agent_id IS NOT NULL
    GROUP BY
        c.agent_id
    ORDER BY
        public.get_sdr_display_name(c.agent_id);
END;
$$;

-- =========================================
-- 8. CONCEDER PERMISSÕES
-- =========================================

GRANT EXECUTE ON FUNCTION public.normalize_sdr_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sdr_display_name(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs() TO anon, authenticated, service_role;

-- =========================================
-- 9. TESTES DE VERIFICAÇÃO
-- =========================================

-- Teste 1: Verificar dados de empresa
SELECT 
    'Teste 1: Empresas' as teste,
    COUNT(DISTINCT enterprise) as empresas_unicas,
    COUNT(*) as total_calls
FROM calls 
WHERE enterprise IS NOT NULL;

-- Teste 2: Testar função get_calls_with_filters
SELECT 
    'Teste 2: Chamadas com filtros' as teste,
    company_name,
    person_name,
    sdr_name,
    deal_id,
    status
FROM public.get_calls_with_filters(
    p_limit := 5,
    p_offset := 0
);

-- Teste 3: Testar função get_unique_sdrs
SELECT 
    'Teste 3: SDRs únicos' as teste,
    *
FROM public.get_unique_sdrs();

-- Teste 4: Testar função get_dashboard_metrics
SELECT 
    'Teste 4: Métricas do dashboard' as teste,
    *
FROM public.get_dashboard_metrics(14);

SELECT '✅ Script executado com sucesso! As funções agora usam a coluna ENTERPRISE real.' AS status;
