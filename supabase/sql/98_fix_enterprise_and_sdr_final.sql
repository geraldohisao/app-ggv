-- ===================================================================
-- FIX ENTERPRISE AND SDR FINAL - Corrigir empresas e SDR duplicado
-- ===================================================================

-- 1. Investigar por que algumas empresas ainda têm códigos
SELECT 
    '=== INVESTIGANDO EMPRESAS COM CÓDIGOS ===' as info;

SELECT 
    id,
    deal_id,
    enterprise,
    insights->>'companyName' as insights_company,
    insights->>'company' as insights_company2,
    CASE 
        WHEN enterprise IS NOT NULL AND TRIM(enterprise) != '' AND TRIM(enterprise) != 'null' THEN 
            'TEM ENTERPRISE: [' || enterprise || ']'
        WHEN insights->>'companyName' IS NOT NULL AND TRIM(insights->>'companyName') != '' THEN 
            'TEM INSIGHTS COMPANY: [' || (insights->>'companyName') || ']'
        ELSE 
            'SEM DADOS - USANDO FALLBACK'
    END as status_empresa
FROM calls 
WHERE deal_id IN ('62845', '63021', '62855')  -- Exemplos que aparecem com código
ORDER BY created_at DESC;

-- 2. Verificar SDRs duplicados na função atual
SELECT 
    '=== VERIFICANDO SDR DUPLICADO ===' as info;

SELECT 
    sdr_name,
    COUNT(*) as quantidade_entradas,
    SUM(total_calls) as total_chamadas_somadas
FROM public.get_sdr_metrics(30)
WHERE LOWER(sdr_name) LIKE '%camila%'
GROUP BY sdr_name
ORDER BY quantidade_entradas DESC;

-- 3. Atualizar função get_calls_with_filters com melhor lógica de empresa
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
        -- LÓGICA MELHORADA PARA EMPRESA
        CASE 
            -- 1. Tentar enterprise primeiro (mais restritivo)
            WHEN fc.enterprise IS NOT NULL 
                AND TRIM(fc.enterprise) != '' 
                AND TRIM(fc.enterprise) != 'null' 
                AND LENGTH(TRIM(fc.enterprise)) > 3  -- Evitar códigos muito curtos
                AND NOT (TRIM(fc.enterprise) ~ '^[0-9]+$')  -- Evitar só números
            THEN TRIM(fc.enterprise)
            
            -- 2. Tentar insights companyName
            WHEN fc.insights->>'companyName' IS NOT NULL 
                AND TRIM(fc.insights->>'companyName') != '' 
                AND TRIM(fc.insights->>'companyName') != 'null'
                AND LENGTH(TRIM(fc.insights->>'companyName')) > 3
                AND NOT (TRIM(fc.insights->>'companyName') ~ '^[0-9]+$')
            THEN TRIM(fc.insights->>'companyName')
            
            -- 3. Tentar insights company
            WHEN fc.insights->>'company' IS NOT NULL 
                AND TRIM(fc.insights->>'company') != '' 
                AND TRIM(fc.insights->>'company') != 'null'
                AND LENGTH(TRIM(fc.insights->>'company')) > 3
                AND NOT (TRIM(fc.insights->>'company') ~ '^[0-9]+$')
            THEN TRIM(fc.insights->>'company')
            
            -- 4. Fallback melhorado
            ELSE 'Empresa ' || COALESCE(fc.deal_id, SUBSTRING(fc.id::TEXT, 1, 8))
        END AS company_name,
        
        -- PERSON NAME (sem mudanças)
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
        
        -- NOME DO SDR NORMALIZADO (igual ao ranking)
        CASE
            -- Se tem mapeamento no profiles, usar o full_name
            WHEN p.full_name IS NOT NULL AND TRIM(p.full_name) != '' THEN
                TRIM(p.full_name)
            -- Se não tem mapeamento, extrair nome do email e normalizar
            ELSE
                -- Remover prefixos numéricos e normalizar
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

-- 4. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO service_role;

-- 5. Testar função corrigida
SELECT 
    '=== TESTANDO EMPRESAS CORRIGIDAS ===' as teste;

SELECT 
    deal_id,
    company_name,
    sdr_name,
    status_voip_friendly,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0)
WHERE deal_id IN ('62845', '63021', '62855')
ORDER BY created_at DESC;

-- 6. Verificar se SDR não está mais duplicado
SELECT 
    '=== VERIFICANDO SDR CAMILA ===' as verificacao;

SELECT 
    sdr_name,
    COUNT(*) as quantidade_aparicoes
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0)
WHERE LOWER(sdr_name) LIKE '%camila%'
GROUP BY sdr_name
ORDER BY quantidade_aparicoes DESC;

SELECT 'Empresas e SDR corrigidos!' as status;
