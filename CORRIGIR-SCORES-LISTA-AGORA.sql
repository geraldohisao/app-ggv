-- =====================================================
-- 🎯 CORREÇÃO DEFINITIVA: SCORES NA LISTA DE CHAMADAS
-- =====================================================
-- Problema: Notas não aparecem na listagem
-- Solução: LEFT JOIN com call_analysis na RPC

-- 1️⃣ DIAGNÓSTICO: Ver se há notas no banco
SELECT 
    '1️⃣ VERIFICANDO NOTAS NO BANCO:' as etapa;

SELECT 
    COUNT(*) as total_analises,
    COUNT(DISTINCT call_id) as chamadas_com_nota,
    ROUND(AVG(final_grade), 2) as nota_media
FROM call_analysis
WHERE final_grade IS NOT NULL;

-- 2️⃣ EXEMPLO: Notas que DEVERIAM aparecer
SELECT 
    '2️⃣ EXEMPLOS DE NOTAS QUE EXISTEM:' as etapa;

SELECT 
    ca.call_id,
    c.enterprise as empresa,
    c.person as pessoa,
    ca.final_grade as nota,
    ca.created_at as data_analise
FROM call_analysis ca
JOIN calls c ON c.id = ca.call_id
WHERE ca.final_grade IS NOT NULL
ORDER BY ca.created_at DESC
LIMIT 5;

-- 3️⃣ TESTAR FUNÇÃO ATUAL
SELECT 
    '3️⃣ TESTANDO FUNÇÃO ATUAL (score deve estar NULL):' as etapa;

SELECT 
    id,
    company_name,
    score
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0);

-- 4️⃣ RECRIAR FUNÇÃO COM SCORES
SELECT 
    '4️⃣ RECRIANDO FUNÇÃO COM LEFT JOIN PARA SCORES:' as etapa;

DROP FUNCTION IF EXISTS public.get_calls_with_filters CASCADE;

CREATE OR REPLACE FUNCTION public.get_calls_with_filters(
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_start_date TEXT DEFAULT NULL,
    p_end_date TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_sort_by TEXT DEFAULT 'created_at',
    p_min_duration INTEGER DEFAULT NULL,
    p_max_duration INTEGER DEFAULT NULL,
    p_min_score NUMERIC DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL
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
    duration_seconds INTEGER,
    duration_formated TEXT,
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
    score NUMERIC,              -- ✅ NOTA DA ANÁLISE
    from_number TEXT,           -- ✅ TELEFONE
    to_number TEXT,             -- ✅ TELEFONE
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    total_count BIGINT,
    enterprise TEXT,
    person TEXT,
    pipeline TEXT,
    cadence TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    query_start_date TIMESTAMPTZ;
    query_end_date TIMESTAMPTZ;
BEGIN
    IF p_start_date IS NOT NULL AND p_start_date != '' THEN
        query_start_date := p_start_date::TIMESTAMPTZ;
    END IF;
    
    IF p_end_date IS NOT NULL AND p_end_date != '' THEN
        query_end_date := p_end_date::TIMESTAMPTZ;
    END IF;

    RETURN QUERY
    WITH filtered_calls AS (
        SELECT 
            c.*,
            COUNT(*) OVER() as total_count
        FROM calls c
        WHERE 
            (p_sdr IS NULL OR c.agent_id ILIKE '%' || p_sdr || '%')
            AND (p_status IS NULL OR c.status_voip = p_status)
            AND (p_type IS NULL OR c.call_type = p_type)
            AND (query_start_date IS NULL OR c.created_at >= query_start_date)
            AND (query_end_date IS NULL OR c.created_at <= query_end_date)
        ORDER BY 
            CASE WHEN p_sort_by = 'created_at' THEN c.created_at END DESC,
            CASE WHEN p_sort_by = 'duration' THEN c.duration END DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT 
        fc.id,
        fc.provider_call_id,
        fc.deal_id,
        COALESCE(NULLIF(TRIM(fc.enterprise), ''), fc.insights->>'company', 'Empresa não informada') AS company_name,
        COALESCE(NULLIF(TRIM(fc.person), ''), fc.insights->>'person', 'Pessoa Desconhecida') AS person_name,
        COALESCE(fc.insights->>'person_email', fc.insights->>'email') AS person_email,
        fc.agent_id AS sdr_id,
        COALESCE(NULLIF(TRIM(fc.agent_id), ''), 'SDR') AS sdr_name,
        fc.agent_id AS sdr_email,
        'https://i.pravatar.cc/64?u=' || COALESCE(fc.agent_id, 'default') AS sdr_avatar_url,
        fc.status,
        COALESCE(fc.status_voip, fc.status) as status_voip,
        COALESCE(
            NULLIF(TRIM(fc.status_voip_friendly), ''),
            translate_status_voip(fc.status_voip),
            translate_status_voip(fc.status)
        ) AS status_voip_friendly,
        fc.duration,
        fc.duration AS duration_seconds,
        fc.duration_formated,
        fc.call_type,
        COALESCE(fc.direction, 'outbound') AS direction,
        fc.recording_url,
        fc.audio_bucket,
        fc.audio_path,
        fc.recording_url AS audio_url,
        fc.transcription,
        COALESCE(fc.transcript_status, 'pending') AS transcript_status,
        COALESCE(fc.ai_status, 'pending') AS ai_status,
        fc.insights,
        fc.scorecard,
        -- ✅✅✅ BUSCAR NOTA DA ANÁLISE ✅✅✅
        ca.final_grade AS score,
        -- ✅✅✅ TELEFONES ✅✅✅
        fc.from_number,
        fc.to_number,
        fc.agent_id,
        fc.created_at,
        fc.updated_at,
        fc.processed_at,
        fc.total_count,
        fc.enterprise,
        fc.person,
        COALESCE(fc.insights->>'pipeline', 'N/A') AS pipeline,
        COALESCE(fc.insights->>'cadence', 'N/A') AS cadence
    FROM filtered_calls fc
    -- ✅ LEFT JOIN LATERAL: Buscar última análise de cada chamada
    LEFT JOIN LATERAL (
        SELECT ca_inner.final_grade
        FROM call_analysis ca_inner
        WHERE ca_inner.call_id = fc.id
        ORDER BY ca_inner.created_at DESC
        LIMIT 1
    ) ca ON true;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters TO authenticated, anon, service_role;

SELECT '✅ FUNÇÃO RECRIADA COM SUCESSO!' as resultado;

-- 5️⃣ TESTAR NOVAMENTE (agora score deve aparecer!)
SELECT 
    '5️⃣ TESTANDO FUNÇÃO CORRIGIDA (score deve aparecer):' as etapa;

SELECT 
    id,
    company_name,
    person_name,
    score,
    to_number,
    from_number
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0)
ORDER BY created_at DESC;

-- 6️⃣ ESTATÍSTICAS FINAIS
SELECT 
    '6️⃣ ESTATÍSTICAS APÓS CORREÇÃO:' as etapa;

SELECT 
    COUNT(*) as total_chamadas_retornadas,
    COUNT(score) as chamadas_com_nota,
    ROUND(AVG(score), 2) as nota_media,
    MIN(score) as nota_minima,
    MAX(score) as nota_maxima
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);

SELECT '
🎉 CORREÇÃO APLICADA!

✅ O QUE FOI FEITO:
   - get_calls_with_filters agora faz LEFT JOIN com call_analysis
   - Campo "score" (final_grade) agora vem preenchido
   - Telefones (to_number, from_number) mantidos
   
🚀 PRÓXIMO PASSO:
   1. Fazer HARD REFRESH no navegador (Ctrl+Shift+R)
   2. Notas devem aparecer na lista de chamadas!
   
📊 SE NÃO FUNCIONAR:
   - Verificar etapa 5 acima (deve mostrar notas)
   - Se etapa 5 mostrar null, problema é falta de análises
   - Se etapa 5 mostrar notas, problema é no cache do frontend

' as instrucoes;

