-- 27_calls_system_refactor.sql
-- Refatoração completa do sistema de calls
-- Implementa relacionamentos com deal_id, empresa, pessoa e mapeamento SDR

-- =========================================
-- ETAPA 1: CRIAR TABELAS AUXILIARES
-- =========================================

-- Tabela para mapear deals do Pipedrive (cache local)
CREATE TABLE IF NOT EXISTS pipedrive_deals (
    id TEXT PRIMARY KEY, -- deal_id do Pipedrive
    title TEXT,
    org_name TEXT, -- nome da empresa
    org_id INTEGER,
    person_name TEXT, -- nome da pessoa
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

-- Política: Usuários autenticados podem ver todos os deals
CREATE POLICY "Authenticated users can view deals" ON pipedrive_deals 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Apenas service_role pode inserir/atualizar deals
CREATE POLICY "Service role can manage deals" ON pipedrive_deals 
    FOR ALL USING (auth.role() = 'service_role');

-- =========================================
-- ETAPA 2: FUNÇÃO PARA MAPEAMENTO DE USUÁRIOS SDR
-- =========================================

CREATE OR REPLACE FUNCTION public.map_sdr_email(input_email TEXT)
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
                WHEN LOWER(input_email) = 'camila.ataliba@ggvinteligencia.com.br' THEN 'camila@grupoggv.com'
                WHEN LOWER(input_email) = 'andressa@ggvinteligencia.com.br' THEN 'andressa@grupoggv.com'
                WHEN LOWER(input_email) = 'isabel@ggvinteligencia.com.br' THEN 'isabel@grupoggv.com'
                WHEN LOWER(input_email) = 'loruama@ggvinteligencia.com.br' THEN 'loruama@grupoggv.com'
                WHEN LOWER(input_email) = 'mariana@ggvinteligencia.com.br' THEN 'mariana@grupoggv.com'
                WHEN LOWER(input_email) = 'geraldo@ggvinteligencia.com.br' THEN 'geraldo@grupoggv.com'
                -- Mapeamento reverso também
                WHEN LOWER(input_email) LIKE '%@grupoggv.com' THEN LOWER(input_email)
                WHEN LOWER(input_email) LIKE '%@ggvinteligencia.com.br' THEN 
                    REPLACE(LOWER(input_email), '@ggvinteligencia.com.br', '@grupoggv.com')
                ELSE LOWER(input_email)
            END as normalized_email
    )
    SELECT 
        em.normalized_email as mapped_email,
        p.id as sdr_id,
        COALESCE(p.name, p.email, 'SDR') as sdr_name,
        p.avatar_url as sdr_avatar_url
    FROM email_mapping em
    LEFT JOIN profiles p ON LOWER(p.email) = em.normalized_email
    WHERE p.id IS NOT NULL
    LIMIT 1;
$$;

-- =========================================
-- ETAPA 3: FUNÇÃO AVANÇADA PARA BUSCAR CALLS COM RELACIONAMENTOS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_calls_with_details(
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
    audio_url TEXT, -- URL completa do áudio
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
        sm.mapped_email,
        sm.sdr_id,
        sm.sdr_name,
        sm.sdr_avatar_url
    FROM calls c
    CROSS JOIN LATERAL public.map_sdr_email(c.agent_id) sm
    WHERE c.agent_id IS NOT NULL
  ),
  base AS (
    SELECT 
        c.*,
        -- Informações da empresa e pessoa do deal
        pd.org_name as company_name,
        pd.person_name,
        pd.person_email,
        -- Informações do SDR mapeado
        sm.sdr_id,
        sm.sdr_name,
        sm.mapped_email as sdr_email,
        sm.sdr_avatar_url,
        -- URL completa do áudio
        CASE 
            WHEN c.recording_url IS NOT NULL THEN c.recording_url
            WHEN c.audio_bucket IS NOT NULL AND c.audio_path IS NOT NULL THEN 
                CONCAT('https://', c.audio_bucket, '.supabase.co/storage/v1/object/public/', c.audio_path)
            ELSE NULL
        END as audio_url
    FROM calls c
    LEFT JOIN pipedrive_deals pd ON c.deal_id = pd.id
    LEFT JOIN sdr_mapping sm ON c.id = sm.call_id
    WHERE (p_sdr_email IS NULL OR sm.mapped_email = LOWER(p_sdr_email))
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
    COALESCE(
        b.company_name,
        (b.insights->>'company'), 
        (b.insights->'metadata'->>'company'),
        'Empresa não informada'
    ) AS company_name,
    COALESCE(
        b.person_name,
        (b.insights->>'person_name'),
        (b.insights->'metadata'->>'person_name'),
        'Pessoa não informada'
    ) AS person_name,
    COALESCE(
        b.person_email,
        (b.insights->>'person_email'),
        (b.insights->'metadata'->>'person_email')
    ) AS person_email,
    b.sdr_id,
    COALESCE(b.sdr_name, 'SDR') as sdr_name,
    b.sdr_email,
    b.sdr_avatar_url,
    b.status,
    b.duration,
    b.call_type,
    b.direction,
    b.recording_url,
    b.audio_bucket,
    b.audio_path,
    b.audio_url,
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
-- ETAPA 4: FUNÇÃO PARA DETALHES DE UMA CALL ESPECÍFICA
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_detail_complete(p_call_id UUID)
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
        CROSS JOIN LATERAL public.map_sdr_email(c.agent_id) sm
        WHERE c.id = p_call_id AND c.agent_id IS NOT NULL
        LIMIT 1
    )
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        COALESCE(
            pd.org_name,
            (c.insights->>'company'), 
            (c.insights->'metadata'->>'company'),
            'Empresa não informada'
        ) AS company_name,
        COALESCE(
            pd.person_name,
            (c.insights->>'person_name'),
            (c.insights->'metadata'->>'person_name'),
            'Pessoa não informada'
        ) AS person_name,
        COALESCE(
            pd.person_email,
            (c.insights->>'person_email'),
            (c.insights->'metadata'->>'person_email')
        ) AS person_email,
        si.sdr_id,
        COALESCE(si.sdr_name, 'SDR') as sdr_name,
        si.mapped_email as sdr_email,
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
            WHEN c.recording_url IS NOT NULL THEN c.recording_url
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
-- ETAPA 5: FUNÇÃO PARA LISTAR SDRS ÚNICOS
-- =========================================

CREATE OR REPLACE FUNCTION public.get_unique_sdrs()
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
        WHERE c.agent_id IS NOT NULL
        GROUP BY c.agent_id
    )
    SELECT 
        sm.mapped_email as sdr_email,
        sm.sdr_name,
        sm.sdr_avatar_url,
        sc.call_count
    FROM sdr_calls sc
    CROSS JOIN LATERAL public.map_sdr_email(sc.agent_id) sm
    WHERE sm.sdr_id IS NOT NULL
    ORDER BY sc.call_count DESC, sm.sdr_name;
$$;

-- =========================================
-- ETAPA 6: FUNÇÃO PARA SINCRONIZAR DEAL DO PIPEDRIVE
-- =========================================

CREATE OR REPLACE FUNCTION public.sync_pipedrive_deal(
    p_deal_id TEXT,
    p_title TEXT DEFAULT NULL,
    p_org_name TEXT DEFAULT NULL,
    p_org_id INTEGER DEFAULT NULL,
    p_person_name TEXT DEFAULT NULL,
    p_person_email TEXT DEFAULT NULL,
    p_person_id INTEGER DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_value DECIMAL DEFAULT NULL,
    p_currency TEXT DEFAULT NULL,
    p_stage_name TEXT DEFAULT NULL,
    p_owner_name TEXT DEFAULT NULL,
    p_owner_email TEXT DEFAULT NULL,
    p_raw_data JSONB DEFAULT '{}'
)
RETURNS pipedrive_deals
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO pipedrive_deals (
        id, title, org_name, org_id, person_name, person_email, person_id,
        status, value, currency, stage_name, owner_name, owner_email, raw_data, updated_at
    ) VALUES (
        p_deal_id, p_title, p_org_name, p_org_id, p_person_name, p_person_email, p_person_id,
        p_status, p_value, p_currency, p_stage_name, p_owner_name, p_owner_email, p_raw_data, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        org_name = EXCLUDED.org_name,
        org_id = EXCLUDED.org_id,
        person_name = EXCLUDED.person_name,
        person_email = EXCLUDED.person_email,
        person_id = EXCLUDED.person_id,
        status = EXCLUDED.status,
        value = EXCLUDED.value,
        currency = EXCLUDED.currency,
        stage_name = EXCLUDED.stage_name,
        owner_name = EXCLUDED.owner_name,
        owner_email = EXCLUDED.owner_email,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW()
    RETURNING *;
$$;

-- =========================================
-- ETAPA 7: GRANT PERMISSIONS
-- =========================================

GRANT EXECUTE ON FUNCTION public.map_sdr_email(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_calls_with_details(INTEGER, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_call_detail_complete(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_pipedrive_deal(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, INTEGER, TEXT, DECIMAL, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Este script implementa:
-- 1. ✅ Tabela pipedrive_deals para cache de dados do Pipedrive
-- 2. ✅ Função map_sdr_email para resolver mapeamento @grupoggv.com vs @ggvinteligencia.com.br
-- 3. ✅ Função get_calls_with_details com relacionamentos completos
-- 4. ✅ Função get_call_detail_complete para detalhes de uma call
-- 5. ✅ Função get_unique_sdrs para filtros do frontend
-- 6. ✅ Função sync_pipedrive_deal para sincronizar dados
-- 7. ✅ URLs completas de áudio (recording_url ou construção via bucket/path)
-- 8. ✅ Relacionamento deal_id -> empresa/pessoa
-- 9. ✅ Mapeamento robusto de usuários SDR
