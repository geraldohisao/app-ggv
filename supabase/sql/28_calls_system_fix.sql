-- 28_calls_system_fix.sql
-- Correção das funções RPC para trabalhar com dados reais
-- Resolve problemas: filtros, empresa/cliente, identificação SDR

-- =========================================
-- ETAPA 1: FUNÇÃO CORRIGIDA PARA MAPEAMENTO SDR
-- =========================================

CREATE OR REPLACE FUNCTION public.map_sdr_email_fixed(input_email TEXT)
RETURNS TABLE (
    mapped_email TEXT,
    sdr_id UUID,
    sdr_name TEXT,
    sdr_avatar_url TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH email_mapping AS (
        SELECT 
            CASE 
                -- Mapeamento específico para resolver diferenças de domínio
                WHEN LOWER(TRIM(input_email)) = 'camila.ataliba@ggvinteligencia.com.br' THEN 'camila@grupoggv.com'
                WHEN LOWER(TRIM(input_email)) = 'andressa@ggvinteligencia.com.br' THEN 'andressa@grupoggv.com'
                WHEN LOWER(TRIM(input_email)) = 'isabel@ggvinteligencia.com.br' THEN 'isabel@grupoggv.com'
                WHEN LOWER(TRIM(input_email)) = 'loruama@ggvinteligencia.com.br' THEN 'loruama@grupoggv.com'
                WHEN LOWER(TRIM(input_email)) = 'mariana@ggvinteligencia.com.br' THEN 'mariana@grupoggv.com'
                WHEN LOWER(TRIM(input_email)) = 'geraldo@ggvinteligencia.com.br' THEN 'geraldo@grupoggv.com'
                -- Mapeamento reverso também
                WHEN LOWER(TRIM(input_email)) LIKE '%@grupoggv.com' THEN LOWER(TRIM(input_email))
                WHEN LOWER(TRIM(input_email)) LIKE '%@ggvinteligencia.com.br' THEN 
                    REPLACE(LOWER(TRIM(input_email)), '@ggvinteligencia.com.br', '@grupoggv.com')
                -- Se não tem @, tentar adicionar domínio
                WHEN TRIM(input_email) NOT LIKE '%@%' THEN LOWER(TRIM(input_email)) || '@grupoggv.com'
                ELSE LOWER(TRIM(input_email))
            END as normalized_email
    ),
    profile_match AS (
        SELECT 
            em.normalized_email,
            p.id as sdr_id,
            COALESCE(p.name, p.email, SPLIT_PART(p.email, '@', 1)) as sdr_name,
            p.avatar_url as sdr_avatar_url
        FROM email_mapping em
        LEFT JOIN profiles p ON LOWER(TRIM(p.email)) = em.normalized_email
        WHERE p.id IS NOT NULL
        
        UNION ALL
        
        -- Fallback: buscar por nome similar se não encontrou por email
        SELECT 
            em.normalized_email,
            p.id as sdr_id,
            COALESCE(p.name, p.email, SPLIT_PART(p.email, '@', 1)) as sdr_name,
            p.avatar_url as sdr_avatar_url
        FROM email_mapping em
        LEFT JOIN profiles p ON LOWER(TRIM(p.name)) LIKE '%' || SPLIT_PART(em.normalized_email, '@', 1) || '%'
        WHERE p.id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM profiles p2 WHERE LOWER(TRIM(p2.email)) = em.normalized_email
        )
    )
    SELECT 
        pm.normalized_email as mapped_email,
        pm.sdr_id,
        pm.sdr_name,
        pm.sdr_avatar_url
    FROM profile_match pm
    LIMIT 1;
$$;

-- =========================================
-- ETAPA 2: FUNÇÃO CORRIGIDA PARA BUSCAR CALLS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_with_details_fixed(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sdr_email TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_call_type TEXT DEFAULT NULL,
    p_start TIMESTAMPTZ DEFAULT NULL,
    p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company_name TEXT,
    person_name TEXT,
    person_email TEXT,
    sdr_id UUID,
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
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sdr_mapping AS (
    SELECT DISTINCT
        c.id as call_id,
        c.agent_id,
        sm.mapped_email,
        sm.sdr_id,
        sm.sdr_name,
        sm.sdr_avatar_url
    FROM calls c
    CROSS JOIN LATERAL public.map_sdr_email_fixed(COALESCE(c.agent_id, '')) sm
    WHERE c.agent_id IS NOT NULL AND c.agent_id != ''
  ),
  base AS (
    SELECT 
        c.*,
        -- Informações da empresa e pessoa do deal (pipedrive_deals se existir)
        COALESCE(pd.org_name, '') as deal_company_name,
        COALESCE(pd.person_name, '') as deal_person_name,
        COALESCE(pd.person_email, '') as deal_person_email,
        -- Informações do SDR mapeado
        COALESCE(sm.sdr_id, NULL) as mapped_sdr_id,
        COALESCE(sm.sdr_name, COALESCE(c.agent_id, 'SDR não identificado')) as mapped_sdr_name,
        COALESCE(sm.mapped_email, c.agent_id) as mapped_sdr_email,
        sm.sdr_avatar_url as mapped_sdr_avatar_url,
        -- URL completa do áudio
        CASE 
            WHEN c.recording_url IS NOT NULL AND c.recording_url != '' THEN c.recording_url
            WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
                CONCAT('https://', c.audio_bucket, '.supabase.co/storage/v1/object/public/', c.audio_path)
            ELSE NULL
        END as computed_audio_url
    FROM calls c
    LEFT JOIN pipedrive_deals pd ON c.deal_id = pd.id
    LEFT JOIN sdr_mapping sm ON c.id = sm.call_id
    WHERE (p_sdr_email IS NULL OR sm.mapped_email = LOWER(p_sdr_email) OR c.agent_id = p_sdr_email)
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_call_type IS NULL OR c.call_type = p_call_type)
      AND (p_start IS NULL OR c.created_at >= p_start)
      AND (p_end IS NULL OR c.created_at <= p_end)
  ), 
  total AS (SELECT COUNT(*) FROM base)
  SELECT
    b.id,
    b.provider_call_id,
    b.deal_id,
    -- Empresa: prioridade para pipedrive_deals, depois insights
    COALESCE(
        NULLIF(b.deal_company_name, ''),
        NULLIF(b.insights->>'company', ''), 
        NULLIF(b.insights->'metadata'->>'company', ''),
        CASE 
            WHEN b.deal_id IS NOT NULL AND b.deal_id != '' THEN b.deal_id
            ELSE 'Empresa não informada'
        END
    ) AS company_name,
    -- Pessoa: prioridade para pipedrive_deals, depois insights
    COALESCE(
        NULLIF(b.deal_person_name, ''),
        NULLIF(b.insights->>'person_name', ''),
        NULLIF(b.insights->'metadata'->>'person_name', ''),
        'Pessoa não informada'
    ) AS person_name,
    -- Email da pessoa
    COALESCE(
        NULLIF(b.deal_person_email, ''),
        NULLIF(b.insights->>'person_email', ''),
        NULLIF(b.insights->'metadata'->>'person_email', ''),
        NULL
    ) AS person_email,
    b.mapped_sdr_id as sdr_id,
    b.mapped_sdr_name as sdr_name,
    b.mapped_sdr_email as sdr_email,
    b.mapped_sdr_avatar_url as sdr_avatar_url,
    b.status,
    b.duration,
    b.call_type,
    b.direction,
    b.recording_url,
    b.audio_bucket,
    b.audio_path,
    b.computed_audio_url as audio_url,
    b.transcription,
    b.transcript_status,
    b.ai_status,
    b.insights,
    b.scorecard,
    b.from_number,
    b.to_number,
    b.agent_id,
    b.created_at,
    b.updated_at,
    b.processed_at,
    (SELECT * FROM total) AS total_count
  FROM base b
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- =========================================
-- ETAPA 3: FUNÇÃO CORRIGIDA PARA DETALHES DE CALL
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_detail_complete_fixed(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company_name TEXT,
    person_name TEXT,
    person_email TEXT,
    sdr_id UUID,
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
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    WITH sdr_info AS (
        SELECT 
            sm.mapped_email,
            sm.sdr_id,
            sm.sdr_name,
            sm.sdr_avatar_url
        FROM calls c
        CROSS JOIN LATERAL public.map_sdr_email_fixed(COALESCE(c.agent_id, '')) sm
        WHERE c.id = p_call_id AND c.agent_id IS NOT NULL AND c.agent_id != ''
        LIMIT 1
    )
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        -- Empresa: prioridade para pipedrive_deals, depois insights
        COALESCE(
            NULLIF(pd.org_name, ''),
            NULLIF(c.insights->>'company', ''), 
            NULLIF(c.insights->'metadata'->>'company', ''),
            CASE 
                WHEN c.deal_id IS NOT NULL AND c.deal_id != '' THEN c.deal_id
                ELSE 'Empresa não informada'
            END
        ) AS company_name,
        -- Pessoa: prioridade para pipedrive_deals, depois insights
        COALESCE(
            NULLIF(pd.person_name, ''),
            NULLIF(c.insights->>'person_name', ''),
            NULLIF(c.insights->'metadata'->>'person_name', ''),
            'Pessoa não informada'
        ) AS person_name,
        -- Email da pessoa
        COALESCE(
            NULLIF(pd.person_email, ''),
            NULLIF(c.insights->>'person_email', ''),
            NULLIF(c.insights->'metadata'->>'person_email', ''),
            NULL
        ) AS person_email,
        COALESCE(si.sdr_id, NULL) as sdr_id,
        COALESCE(si.sdr_name, COALESCE(c.agent_id, 'SDR não identificado')) as sdr_name,
        COALESCE(si.mapped_email, c.agent_id) as sdr_email,
        si.sdr_avatar_url,
        c.status,
        c.duration,
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
        -- URL completa do áudio
        CASE 
            WHEN c.recording_url IS NOT NULL AND c.recording_url != '' THEN c.recording_url
            WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
                CONCAT('https://', c.audio_bucket, '.supabase.co/storage/v1/object/public/', c.audio_path)
            ELSE NULL
        END as audio_url,
        c.transcription,
        c.transcript_status,
        c.ai_status,
        c.insights,
        c.scorecard,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.created_at,
        c.updated_at,
        c.processed_at
    FROM calls c
    LEFT JOIN pipedrive_deals pd ON c.deal_id = pd.id
    LEFT JOIN sdr_info si ON true
    WHERE c.id = p_call_id;
$$;

-- =========================================
-- ETAPA 4: FUNÇÃO CORRIGIDA PARA SDRS ÚNICOS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_unique_sdrs_fixed()
RETURNS TABLE (
    sdr_email TEXT,
    sdr_name TEXT,
    sdr_avatar_url TEXT,
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
    ),
    sdr_mapped AS (
        SELECT 
            sc.agent_id,
            sc.call_count,
            sm.mapped_email,
            sm.sdr_name,
            sm.sdr_avatar_url
        FROM sdr_calls sc
        CROSS JOIN LATERAL public.map_sdr_email_fixed(sc.agent_id) sm
    )
    SELECT 
        COALESCE(sm.mapped_email, sm.agent_id) as sdr_email,
        COALESCE(sm.sdr_name, sm.agent_id, 'SDR não identificado') as sdr_name,
        sm.sdr_avatar_url,
        sm.call_count
    FROM sdr_mapped sm
    ORDER BY sm.call_count DESC, sm.sdr_name;
$$;

-- =========================================
-- ETAPA 5: GRANT PERMISSIONS
-- =========================================

GRANT EXECUTE ON FUNCTION public.map_sdr_email_fixed(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_calls_with_details_fixed(INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_detail_complete_fixed(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs_fixed() TO authenticated, service_role;

-- =========================================
-- ETAPA 6: CRIAR TABELA PIPEDRIVE_DEALS SE NÃO EXISTIR
-- =========================================

CREATE TABLE IF NOT EXISTS pipedrive_deals (
    id TEXT PRIMARY KEY,
    title TEXT,
    org_name TEXT,
    org_id INTEGER,
    person_name TEXT,
    person_email TEXT,
    person_id INTEGER,
    status TEXT,
    value DECIMAL,
    currency TEXT,
    stage_name TEXT,
    owner_name TEXT,
    owner_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    raw_data JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pipedrive_deals_org_name ON pipedrive_deals(org_name);
CREATE INDEX IF NOT EXISTS idx_pipedrive_deals_person_email ON pipedrive_deals(person_email);
CREATE INDEX IF NOT EXISTS idx_pipedrive_deals_owner_email ON pipedrive_deals(owner_email);

-- Habilitar RLS
ALTER TABLE pipedrive_deals ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "Authenticated users can view deals" ON pipedrive_deals;
CREATE POLICY "Authenticated users can view deals" ON pipedrive_deals 
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage deals" ON pipedrive_deals;
CREATE POLICY "Service role can manage deals" ON pipedrive_deals 
    FOR ALL USING (auth.role() = 'service_role');

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Este script corrige os problemas identificados:
-- 1. ✅ Mapeamento SDR mais robusto com fallbacks
-- 2. ✅ Busca de empresa/pessoa com prioridades corretas
-- 3. ✅ Filtros funcionais (por email SDR)
-- 4. ✅ Identificação correta do SDR em todas as telas
-- 5. ✅ Fallbacks para quando dados não estão disponíveis
-- 6. ✅ Criação da tabela pipedrive_deals se não existir
