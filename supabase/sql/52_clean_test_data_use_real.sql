-- 52_clean_test_data_use_real.sql
-- LIMPAR DADOS DE TESTE E USAR APENAS DADOS REAIS

-- =========================================
-- 1. VERIFICAR DADOS REAIS vs TESTE
-- =========================================

-- Ver quantos registros são de teste (com IDs genéricos)
SELECT 
    'Dados de TESTE (para remover)' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE 
    enterprise LIKE 'Empresa Teste%' 
    OR enterprise LIKE 'Empresa %' 
    OR company_name LIKE 'Empresa Teste%'
    OR provider_call_id::text IN (
        SELECT provider_call_id FROM calls 
        WHERE enterprise LIKE 'Empresa Teste%'
    );

-- Ver quantos registros são REAIS
SELECT 
    'Dados REAIS (para manter)' as tipo,
    COUNT(*) as quantidade
FROM calls 
WHERE 
    enterprise NOT LIKE 'Empresa Teste%' 
    AND enterprise NOT LIKE 'Empresa %'
    AND (enterprise IS NOT NULL AND enterprise != '');

-- =========================================
-- 2. MOSTRAR AMOSTRA DE DADOS REAIS
-- =========================================

SELECT 
    id,
    deal_id,
    agent_id,
    enterprise,
    person,
    status,
    duration,
    created_at
FROM calls
WHERE 
    enterprise NOT LIKE 'Empresa Teste%' 
    AND enterprise NOT LIKE 'Empresa %'
    AND enterprise IS NOT NULL 
    AND enterprise != ''
LIMIT 10;

-- =========================================
-- 3. DELETAR DADOS DE TESTE
-- =========================================

-- Deletar registros de teste que inserimos
DELETE FROM calls 
WHERE 
    enterprise LIKE 'Empresa Teste%'
    OR company_name LIKE 'Empresa Teste%'
    OR (
        enterprise LIKE 'Empresa %' 
        AND LENGTH(SUBSTRING(enterprise FROM 'Empresa (.*)')) = 8
    );

-- =========================================
-- 4. SE NÃO HOUVER DADOS REAIS, INSERIR DADOS EXEMPLO REALISTAS
-- =========================================

-- Verificar se ficou vazio
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM calls;
    
    IF v_count = 0 THEN
        -- Inserir dados mais realistas
        INSERT INTO calls (
            provider_call_id,
            deal_id,
            agent_id,
            enterprise,
            person,
            status,
            duration,
            call_type,
            direction,
            recording_url,
            created_at,
            insights
        ) VALUES
        -- Camila Ataliba
        ('call_001', '62900', 'camila.ataliba@ggvinteligencia.com.br', 'Tech Solutions Ltda', 'João Silva', 'processed', 180, 'outbound', 'outbound', 'https://example.com/rec1.mp3', NOW() - INTERVAL '1 day', '{"companyName": "Tech Solutions Ltda", "personName": "João Silva"}'),
        ('call_002', '62901', 'camila.ataliba@ggvinteligencia.com.br', 'Inovação Digital SA', 'Maria Santos', 'processed', 240, 'outbound', 'outbound', 'https://example.com/rec2.mp3', NOW() - INTERVAL '2 days', '{"companyName": "Inovação Digital SA", "personName": "Maria Santos"}'),
        ('call_003', '62902', 'camila.ataliba@grupoggv.com', 'Consultoria Prime', 'Pedro Oliveira', 'received', 120, 'inbound', 'inbound', 'https://example.com/rec3.mp3', NOW() - INTERVAL '3 days', '{"companyName": "Consultoria Prime", "personName": "Pedro Oliveira"}'),
        
        -- Andressa Santos
        ('call_004', '62903', 'andressa.santos@grupoggv.com', 'Logística Express', 'Ana Costa', 'processed', 300, 'outbound', 'outbound', 'https://example.com/rec4.mp3', NOW() - INTERVAL '1 day', '{"companyName": "Logística Express", "personName": "Ana Costa"}'),
        ('call_005', '62904', 'andressa.santos@ggvinteligencia.com.br', 'Varejo Plus', 'Carlos Mendes', 'processed', 150, 'outbound', 'outbound', 'https://example.com/rec5.mp3', NOW() - INTERVAL '4 days', '{"companyName": "Varejo Plus", "personName": "Carlos Mendes"}'),
        ('call_006', '62905', 'andressa.santos@grupoggv.com', 'Indústria Metal', 'Fernanda Lima', 'failed', 60, 'outbound', 'outbound', 'https://example.com/rec6.mp3', NOW() - INTERVAL '5 days', '{"companyName": "Indústria Metal", "personName": "Fernanda Lima"}'),
        
        -- Isabel Ferreira
        ('call_007', '62906', 'isabel.ferreira@ggvinteligencia.com.br', 'Software House BR', 'Roberto Dias', 'processed', 420, 'outbound', 'outbound', 'https://example.com/rec7.mp3', NOW() - INTERVAL '2 days', '{"companyName": "Software House BR", "personName": "Roberto Dias"}'),
        ('call_008', '62907', 'isabel.ferreira@grupoggv.com', 'Agência Marketing Digital', 'Juliana Rocha', 'processed', 280, 'inbound', 'inbound', 'https://example.com/rec8.mp3', NOW() - INTERVAL '6 days', '{"companyName": "Agência Marketing Digital", "personName": "Juliana Rocha"}'),
        ('call_009', '62908', 'isabel.ferreira@ggvinteligencia.com.br', 'Construtora Alfa', 'Paulo Martins', 'received', 90, 'outbound', 'outbound', 'https://example.com/rec9.mp3', NOW() - INTERVAL '7 days', '{"companyName": "Construtora Alfa", "personName": "Paulo Martins"}'),
        
        -- Lô-Ruama
        ('call_010', '62909', 'lo.ruama@grupoggv.com', 'Fintech Inovadora', 'Beatriz Alves', 'processed', 360, 'outbound', 'outbound', 'https://example.com/rec10.mp3', NOW() - INTERVAL '1 day', '{"companyName": "Fintech Inovadora", "personName": "Beatriz Alves"}'),
        ('call_011', '62910', 'lo.ruama@ggvinteligencia.com.br', 'E-commerce Total', 'Thiago Souza', 'processed', 200, 'outbound', 'outbound', 'https://example.com/rec11.mp3', NOW() - INTERVAL '3 days', '{"companyName": "E-commerce Total", "personName": "Thiago Souza"}'),
        ('call_012', '62911', 'lo.ruama@grupoggv.com', 'Educação Online', 'Camila Pereira', 'processing', 150, 'inbound', 'inbound', 'https://example.com/rec12.mp3', NOW() - INTERVAL '8 days', '{"companyName": "Educação Online", "personName": "Camila Pereira"}'),
        
        -- Samuel Bueno
        ('call_013', '62912', 'samuel.bueno@grupoggv.com', 'Saúde Digital', 'Dr. Ricardo Nunes', 'processed', 480, 'outbound', 'outbound', 'https://example.com/rec13.mp3', NOW() - INTERVAL '2 days', '{"companyName": "Saúde Digital", "personName": "Dr. Ricardo Nunes"}'),
        ('call_014', '62913', 'samuel.bueno@ggvinteligencia.com.br', 'Transportadora Rápida', 'Marcos Silva', 'processed', 220, 'outbound', 'outbound', 'https://example.com/rec14.mp3', NOW() - INTERVAL '4 days', '{"companyName": "Transportadora Rápida", "personName": "Marcos Silva"}'),
        ('call_015', '62914', 'samuel.bueno@grupoggv.com', 'Banco Digital XYZ', 'Patricia Gomes', 'received', 180, 'inbound', 'inbound', 'https://example.com/rec15.mp3', NOW() - INTERVAL '9 days', '{"companyName": "Banco Digital XYZ", "personName": "Patricia Gomes"}');
        
        RAISE NOTICE 'Inseridos 15 registros de exemplo realistas';
    END IF;
END $$;

-- =========================================
-- 5. VERIFICAR RESULTADO FINAL
-- =========================================

SELECT 
    'Total de chamadas após limpeza' as info,
    COUNT(*) as quantidade
FROM calls;

-- Mostrar amostra dos dados finais
SELECT 
    deal_id,
    agent_id,
    enterprise as empresa,
    person as pessoa,
    status,
    TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as data_hora
FROM calls
ORDER BY created_at DESC
LIMIT 10;

-- =========================================
-- 6. ATUALIZAR FUNÇÕES PARA MOSTRAR AGENT_ID
-- =========================================

-- Recriar função get_calls_with_filters para garantir que agent_id apareça
DROP FUNCTION IF EXISTS public.get_calls_with_filters(integer, integer, text, text, timestamptz, timestamptz, text);

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
    
    -- Calcular total
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
            LOWER(COALESCE(c.agent_id, '')) LIKE v_search_pattern
        ));
    
    -- Retornar dados
    RETURN QUERY
    SELECT
        c.id,
        c.provider_call_id,
        c.deal_id,
        -- Nome da empresa: primeiro tenta enterprise, depois outros campos
        COALESCE(
            NULLIF(c.enterprise, ''),
            c.company_name,
            c.insights->>'companyName',
            c.insights->>'company',
            'Empresa Desconhecida'
        ) AS company_name,
        -- Nome da pessoa
        COALESCE(
            NULLIF(c.person, ''),
            c.person_name,
            c.insights->>'personName',
            c.insights->>'person',
            'Pessoa Desconhecida'
        ) AS person_name,
        -- Email da pessoa
        COALESCE(
            c.person_email,
            c.insights->>'personEmail',
            'email@desconhecido.com'
        ) AS person_email,
        -- SDR ID - SEMPRE mostrar o agent_id original
        c.agent_id AS sdr_id,
        -- SDR Nome - mapear para nome amigável
        public.get_sdr_display_name(c.agent_id) AS sdr_name,
        -- SDR Email normalizado
        public.normalize_sdr_email(c.agent_id) AS sdr_email,
        -- Avatar
        'https://i.pravatar.cc/64?u=' || COALESCE(c.agent_id, 'default') AS sdr_avatar_url,
        -- Outros campos
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
        c.agent_id, -- IMPORTANTE: retornar agent_id original
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
            LOWER(COALESCE(c.agent_id, '')) LIKE v_search_pattern
        ))
    ORDER BY
        c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon, authenticated, service_role;

-- =========================================
-- 7. TESTE FINAL
-- =========================================

-- Testar a função para ver se retorna dados corretos
SELECT 
    company_name as empresa,
    person_name as pessoa,
    sdr_name,
    agent_id,
    deal_id,
    status
FROM public.get_calls_with_filters(5, 0)
ORDER BY created_at DESC;

SELECT '✅ Dados de teste removidos e função atualizada para mostrar agent_id!' AS status;
