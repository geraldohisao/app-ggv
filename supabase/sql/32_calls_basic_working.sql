-- 32_calls_basic_working.sql
-- Versão BÁSICA que funciona com dados mínimos
-- Foca apenas no essencial sem complexidade

-- =========================================
-- ETAPA 1: FUNÇÃO BÁSICA PARA BUSCAR CALLS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_basic(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
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
  WITH total AS (SELECT COUNT(*) FROM calls),
  base AS (
    SELECT 
        c.*,
        -- Empresa simples
        CASE 
            WHEN c.deal_id IS NOT NULL AND c.deal_id != '' THEN c.deal_id
            ELSE 'Empresa ' || SUBSTRING(c.id::TEXT, 1, 8)
        END as simple_company,
        -- SDR simples
        CASE 
            WHEN c.agent_id LIKE '%camila%' THEN 'Camila Ataliba'
            WHEN c.agent_id LIKE '%andressa%' THEN 'Andressa Santos'
            WHEN c.agent_id LIKE '%isabel%' THEN 'Isabel Pestilho'
            WHEN c.agent_id LIKE '%loruama%' THEN 'Lô-Ruama Oliveira'
            WHEN c.agent_id LIKE '%mariana%' THEN 'Mariana Costa'
            WHEN c.agent_id LIKE '%geraldo%' THEN 'Geraldo Hisao'
            WHEN c.agent_id IS NOT NULL THEN c.agent_id
            ELSE 'SDR não identificado'
        END as simple_sdr,
        -- Áudio simples
        COALESCE(c.recording_url, 
                 CASE WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL 
                      THEN CONCAT('https://', c.audio_bucket, '.supabase.co/storage/v1/object/public/', c.audio_path)
                      ELSE NULL END) as simple_audio
    FROM calls c
  )
  SELECT
    b.id,
    b.provider_call_id,
    b.deal_id,
    b.simple_company as company_name,
    'Pessoa não informada' as person_name,
    b.simple_sdr as sdr_name,
    b.agent_id as sdr_email,
    COALESCE(b.status, 'received') as status,
    COALESCE(b.duration, 0) as duration,
    b.simple_audio as audio_url,
    b.transcription,
    b.agent_id,
    b.created_at,
    (SELECT * FROM total) AS total_count
  FROM base b
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- =========================================
-- ETAPA 2: FUNÇÃO BÁSICA PARA DETALHES
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_detail_basic(p_call_id UUID)
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
    audio_url TEXT,
    transcription TEXT,
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
        -- Empresa simples
        CASE 
            WHEN c.deal_id IS NOT NULL AND c.deal_id != '' THEN c.deal_id
            ELSE 'Empresa ' || SUBSTRING(c.id::TEXT, 1, 8)
        END as company_name,
        'Pessoa não informada' as person_name,
        -- SDR simples
        CASE 
            WHEN c.agent_id LIKE '%camila%' THEN 'Camila Ataliba'
            WHEN c.agent_id LIKE '%andressa%' THEN 'Andressa Santos'
            WHEN c.agent_id LIKE '%isabel%' THEN 'Isabel Pestilho'
            WHEN c.agent_id LIKE '%loruama%' THEN 'Lô-Ruama Oliveira'
            WHEN c.agent_id LIKE '%mariana%' THEN 'Mariana Costa'
            WHEN c.agent_id LIKE '%geraldo%' THEN 'Geraldo Hisao'
            WHEN c.agent_id IS NOT NULL THEN c.agent_id
            ELSE 'SDR não identificado'
        END as sdr_name,
        c.agent_id as sdr_email,
        COALESCE(c.status, 'received') as status,
        COALESCE(c.duration, 0) as duration,
        -- Áudio simples
        COALESCE(c.recording_url, 
                 CASE WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL 
                      THEN CONCAT('https://', c.audio_bucket, '.supabase.co/storage/v1/object/public/', c.audio_path)
                      ELSE NULL END) as audio_url,
        c.transcription,
        c.agent_id,
        c.created_at
    FROM calls c
    WHERE c.id = p_call_id;
$$;

-- =========================================
-- ETAPA 3: FUNÇÃO BÁSICA PARA SDRS ÚNICOS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_unique_sdrs_basic()
RETURNS TABLE (
    sdr_email TEXT,
    sdr_name TEXT,
    call_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH sdr_stats AS (
        SELECT 
            COALESCE(c.agent_id, 'unknown') as agent_id,
            COUNT(*) as call_count,
            -- SDR simples
            CASE 
                WHEN c.agent_id LIKE '%camila%' THEN 'Camila Ataliba'
                WHEN c.agent_id LIKE '%andressa%' THEN 'Andressa Santos'
                WHEN c.agent_id LIKE '%isabel%' THEN 'Isabel Pestilho'
                WHEN c.agent_id LIKE '%loruama%' THEN 'Lô-Ruama Oliveira'
                WHEN c.agent_id LIKE '%mariana%' THEN 'Mariana Costa'
                WHEN c.agent_id LIKE '%geraldo%' THEN 'Geraldo Hisao'
                WHEN c.agent_id IS NOT NULL THEN c.agent_id
                ELSE 'SDR não identificado'
            END as simple_sdr
        FROM calls c
        WHERE c.agent_id IS NOT NULL AND c.agent_id != ''
        GROUP BY c.agent_id
    )
    SELECT 
        s.agent_id as sdr_email,
        s.simple_sdr as sdr_name,
        s.call_count
    FROM sdr_stats s
    WHERE s.agent_id != 'unknown'
    ORDER BY s.call_count DESC, s.simple_sdr;
$$;

-- =========================================
-- ETAPA 4: GRANT PERMISSIONS
-- =========================================

GRANT EXECUTE ON FUNCTION public.get_calls_basic(INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_detail_basic(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs_basic() TO authenticated, service_role;

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Esta versão básica:
-- 1. ✅ Remove toda complexidade desnecessária
-- 2. ✅ Usa apenas campos básicos da tabela calls
-- 3. ✅ Mapeamento simples de SDRs por LIKE
-- 4. ✅ Empresa baseada em deal_id ou ID da call
-- 5. ✅ Funciona com qualquer estrutura de dados
