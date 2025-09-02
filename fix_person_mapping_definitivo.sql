-- ===================================================================
-- FIX PERSON MAPPING DEFINITIVO - Corrigir mapeamento de pessoas
-- ===================================================================

-- 1. Verificar estrutura atual da tabela calls
SELECT 
    '=== VERIFICANDO ESTRUTURA ATUAL DA TABELA CALLS ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'calls' 
    AND column_name IN ('person', 'person_name', 'person_email', 'enterprise')
ORDER BY column_name;

-- 2. Verificar dados atuais das colunas de pessoa
SELECT 
    '=== VERIFICANDO DADOS ATUAIS ===' as info;

SELECT 
    id,
    person,
    person_name,
    enterprise,
    insights->>'personName' as insights_person_name,
    insights->>'person' as insights_person,
    insights->'contact'->>'name' as insights_contact_name,
    CASE 
        WHEN person IS NOT NULL AND TRIM(person) != '' THEN 'TEM PERSON'
        WHEN person_name IS NOT NULL AND TRIM(person_name) != '' THEN 'TEM PERSON_NAME'
        WHEN insights->>'personName' IS NOT NULL AND TRIM(insights->>'personName') != '' THEN 'TEM INSIGHTS_PERSON_NAME'
        ELSE 'SEM DADOS'
    END as status_dados
FROM calls 
ORDER BY created_at DESC
LIMIT 5;

-- 3. Garantir que as colunas necessárias existem
DO $$ 
BEGIN
    -- Adicionar coluna person se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'calls' 
        AND column_name = 'person'
    ) THEN
        ALTER TABLE public.calls ADD COLUMN person TEXT;
        RAISE NOTICE 'Coluna person adicionada!';
    END IF;
    
    -- Adicionar coluna enterprise se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'calls' 
        AND column_name = 'enterprise'
    ) THEN
        ALTER TABLE public.calls ADD COLUMN enterprise TEXT;
        RAISE NOTICE 'Coluna enterprise adicionada!';
    END IF;
END $$;

-- 4. Atualizar dados nas colunas person e enterprise baseado nos insights
UPDATE calls 
SET 
    person = CASE 
        WHEN person IS NULL OR TRIM(person) = '' THEN
            COALESCE(
                NULLIF(TRIM(insights->>'personName'), ''),
                NULLIF(TRIM(insights->>'person'), ''),
                NULLIF(TRIM(insights->'contact'->>'name'), ''),
                NULL
            )
        ELSE person
    END,
    enterprise = CASE 
        WHEN enterprise IS NULL OR TRIM(enterprise) = '' THEN
            COALESCE(
                NULLIF(TRIM(insights->>'companyName'), ''),
                NULLIF(TRIM(insights->>'company'), ''),
                NULLIF(TRIM(insights->>'enterprise'), ''),
                NULL
            )
        ELSE enterprise
    END
WHERE 
    (person IS NULL OR TRIM(person) = '' OR enterprise IS NULL OR TRIM(enterprise) = '')
    AND insights IS NOT NULL;

-- 5. Recriar função get_calls_with_filters com lógica corrigida
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
        
        -- EMPRESA: Priorizar coluna enterprise, depois insights
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
        
        -- PESSOA: Priorizar coluna person, depois insights
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
        
        -- SDR ID (normalizado)
        CASE 
            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
            ELSE
                LOWER(TRIM(fc.agent_id))
        END AS sdr_id,
        
        -- NOME DO SDR NORMALIZADO
        CASE
            -- Se tem mapeamento no profiles, usar o full_name
            WHEN p.full_name IS NOT NULL AND TRIM(p.full_name) != '' THEN
                TRIM(p.full_name)
            -- Se não tem mapeamento, extrair nome do email e normalizar
            ELSE
                REGEXP_REPLACE(
                    INITCAP(REPLACE(SPLIT_PART(
                        CASE 
                            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                                REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
                            ELSE
                                LOWER(TRIM(fc.agent_id))
                        END, '@', 1), '.', ' ')),
                    '^[0-9]+-', ''  -- Remove números no início
                )
        END AS sdr_name,
        
        -- Email do SDR (normalizado)
        CASE 
            WHEN LOWER(TRIM(fc.agent_id)) LIKE '%@ggvinteligencia.com.br' THEN
                REPLACE(LOWER(TRIM(fc.agent_id)), '@ggvinteligencia.com.br', '@grupoggv.com')
            ELSE
                LOWER(TRIM(fc.agent_id))
        END AS sdr_email,
        
        -- Avatar URL
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

-- 6. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO service_role;

-- 7. Testar função corrigida
SELECT 
    '=== TESTANDO FUNÇÃO CORRIGIDA ===' as teste;

SELECT 
    deal_id,
    company_name,
    person_name,
    sdr_name,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0)
ORDER BY created_at DESC;

-- 8. Verificar se ainda há "Pessoa Desconhecida"
SELECT 
    '=== VERIFICANDO PESSOAS DESCONHECIDAS ===' as verificacao;

SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN person_name LIKE '%Desconhecida%' THEN 1 END) as pessoas_desconhecidas,
    COUNT(CASE WHEN person_name NOT LIKE '%Desconhecida%' AND person_name NOT LIKE 'Contato %' THEN 1 END) as pessoas_identificadas
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0);

SELECT 'CORREÇÃO DO MAPEAMENTO DE PESSOAS CONCLUÍDA!' as status;
