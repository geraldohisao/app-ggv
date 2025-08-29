-- 30_calls_system_simple_fix.sql
-- Versão SIMPLIFICADA que funciona apenas com dados existentes
-- Remove dependências de tabelas que podem não existir

-- =========================================
-- ETAPA 1: FUNÇÃO SIMPLES PARA MAPEAMENTO SDR
-- =========================================

CREATE OR REPLACE FUNCTION public.map_sdr_simple(input_email TEXT)
RETURNS TABLE (
    mapped_email TEXT,
    sdr_name TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        CASE 
            -- Mapeamento específico conhecido
            WHEN LOWER(TRIM(input_email)) = 'camila.ataliba@ggvinteligencia.com.br' THEN 'camila@grupoggv.com'
            WHEN LOWER(TRIM(input_email)) = 'andressa@ggvinteligencia.com.br' THEN 'andressa@grupoggv.com'
            WHEN LOWER(TRIM(input_email)) = 'isabel@ggvinteligencia.com.br' THEN 'isabel@grupoggv.com'
            WHEN LOWER(TRIM(input_email)) = 'loruama@ggvinteligencia.com.br' THEN 'loruama@grupoggv.com'
            WHEN LOWER(TRIM(input_email)) = 'mariana@ggvinteligencia.com.br' THEN 'mariana@grupoggv.com'
            WHEN LOWER(TRIM(input_email)) = 'geraldo@ggvinteligencia.com.br' THEN 'geraldo@grupoggv.com'
            WHEN LOWER(TRIM(input_email)) LIKE '%@ggvinteligencia.com.br' THEN 
                REPLACE(LOWER(TRIM(input_email)), '@ggvinteligencia.com.br', '@grupoggv.com')
            ELSE LOWER(TRIM(input_email))
        END as mapped_email,
        CASE 
            WHEN LOWER(TRIM(input_email)) LIKE '%camila%' THEN 'Camila Ataliba'
            WHEN LOWER(TRIM(input_email)) LIKE '%andressa%' THEN 'Andressa Santos'
            WHEN LOWER(TRIM(input_email)) LIKE '%isabel%' THEN 'Isabel Pestilho'
            WHEN LOWER(TRIM(input_email)) LIKE '%loruama%' THEN 'Lô-Ruama Oliveira'
            WHEN LOWER(TRIM(input_email)) LIKE '%mariana%' THEN 'Mariana Costa'
            WHEN LOWER(TRIM(input_email)) LIKE '%geraldo%' THEN 'Geraldo Hisao'
            ELSE COALESCE(SPLIT_PART(input_email, '@', 1), input_email)
        END as sdr_name;
$$;

-- =========================================
-- ETAPA 2: FUNÇÃO SIMPLES PARA BUSCAR CALLS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_simple(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sdr_email TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company_name TEXT,
    person_name TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    status TEXT,
    duration INTEGER,
    recording_url TEXT,
    audio_url TEXT,
    transcription TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT 
        c.*,
        -- Extrair empresa dos insights ou usar deal_id
        COALESCE(
            NULLIF(c.insights->>'company', ''),
            NULLIF(c.insights->'metadata'->>'company', ''),
            NULLIF(c.insights->'companyName', ''),
            CASE 
                WHEN c.deal_id IS NOT NULL AND c.deal_id != '' THEN 'Deal ' || c.deal_id
                ELSE 'Empresa não informada'
            END
        ) AS extracted_company,
        -- Extrair pessoa dos insights
        COALESCE(
            NULLIF(c.insights->>'person_name', ''),
            NULLIF(c.insights->'metadata'->>'person_name', ''),
            NULLIF(c.insights->'personName', ''),
            'Pessoa não informada'
        ) AS extracted_person,
        -- Mapear SDR
        sm.mapped_email,
        sm.sdr_name,
        -- URL do áudio
        CASE 
            WHEN c.recording_url IS NOT NULL AND c.recording_url != '' THEN c.recording_url
            WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
                CONCAT('https://', c.audio_bucket, '.supabase.co/storage/v1/object/public/', c.audio_path)
            ELSE NULL
        END as computed_audio_url
    FROM calls c
    CROSS JOIN LATERAL public.map_sdr_simple(COALESCE(c.agent_id, '')) sm
    WHERE (p_sdr_email IS NULL OR sm.mapped_email = LOWER(p_sdr_email) OR c.agent_id = p_sdr_email)
      AND (p_status IS NULL OR c.status = p_status)
  ), 
  total AS (SELECT COUNT(*) FROM base)
  SELECT
    b.id,
    b.provider_call_id,
    b.deal_id,
    b.extracted_company as company_name,
    b.extracted_person as person_name,
    b.sdr_name,
    b.mapped_email as sdr_email,
    b.status,
    b.duration,
    b.recording_url,
    b.computed_audio_url as audio_url,
    b.transcription,
    b.agent_id,
    b.created_at,
    (SELECT * FROM total) AS total_count
  FROM base b
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- =========================================
-- ETAPA 3: FUNÇÃO SIMPLES PARA DETALHES DE CALL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_detail_simple(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company_name TEXT,
    person_name TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    status TEXT,
    duration INTEGER,
    recording_url TEXT,
    audio_url TEXT,
    transcription TEXT,
    insights JSONB,
    agent_id TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        -- Extrair empresa dos insights ou usar deal_id
        COALESCE(
            NULLIF(c.insights->>'company', ''),
            NULLIF(c.insights->'metadata'->>'company', ''),
            NULLIF(c.insights->'companyName', ''),
            CASE 
                WHEN c.deal_id IS NOT NULL AND c.deal_id != '' THEN 'Deal ' || c.deal_id
                ELSE 'Empresa não informada'
            END
        ) AS company_name,
        -- Extrair pessoa dos insights
        COALESCE(
            NULLIF(c.insights->>'person_name', ''),
            NULLIF(c.insights->'metadata'->>'person_name', ''),
            NULLIF(c.insights->'personName', ''),
            'Pessoa não informada'
        ) AS person_name,
        sm.sdr_name,
        sm.mapped_email as sdr_email,
        c.status,
        c.duration,
        c.recording_url,
        -- URL do áudio
        CASE 
            WHEN c.recording_url IS NOT NULL AND c.recording_url != '' THEN c.recording_url
            WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
                CONCAT('https://', c.audio_bucket, '.supabase.co/storage/v1/object/public/', c.audio_path)
            ELSE NULL
        END as audio_url,
        c.transcription,
        c.insights,
        c.agent_id,
        c.created_at
    FROM calls c
    CROSS JOIN LATERAL public.map_sdr_simple(COALESCE(c.agent_id, '')) sm
    WHERE c.id = p_call_id;
$$;

-- =========================================
-- ETAPA 4: FUNÇÃO SIMPLES PARA SDRS ÚNICOS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_unique_sdrs_simple()
RETURNS TABLE (
    sdr_email TEXT,
    sdr_name TEXT,
    call_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH sdr_calls AS (
        SELECT 
            c.agent_id,
            COUNT(*) as call_count
        FROM calls c
        WHERE c.agent_id IS NOT NULL AND c.agent_id != ''
        GROUP BY c.agent_id
    )
    SELECT 
        sm.mapped_email as sdr_email,
        sm.sdr_name,
        sc.call_count
    FROM sdr_calls sc
    CROSS JOIN LATERAL public.map_sdr_simple(sc.agent_id) sm
    ORDER BY sc.call_count DESC, sm.sdr_name;
$$;

-- =========================================
-- ETAPA 5: GRANT PERMISSIONS
-- =========================================

GRANT EXECUTE ON FUNCTION public.map_sdr_simple(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_calls_simple(INTEGER, INTEGER, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_detail_simple(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs_simple() TO authenticated, service_role;

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Esta versão simplificada:
-- 1. ✅ Remove dependências de tabelas externas (pipedrive_deals, profiles)
-- 2. ✅ Usa apenas dados da tabela calls existente
-- 3. ✅ Mapeia SDRs com base em padrões conhecidos
-- 4. ✅ Extrai empresa/pessoa do campo insights JSONB
-- 5. ✅ Funciona mesmo se os dados estão incompletos
