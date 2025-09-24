-- 🔧 CORRIGIR DADOS DO DASHBOARD - Unificar nomes e garantir consistência
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. CORRIGIR DUPLICAÇÃO DE NOMES (Mariana vs Mariana Costa)
-- ===============================================================

-- Verificar dados atuais
SELECT 
  'ANTES DA CORREÇÃO' as status,
  agent_id,
  COUNT(*) as total_calls
FROM calls 
WHERE agent_id ILIKE '%mariana%'
GROUP BY agent_id
ORDER BY total_calls DESC;

-- Unificar "Mariana" para "Mariana Costa" na tabela calls
UPDATE calls 
SET agent_id = 'Mariana Costa'
WHERE agent_id = 'Mariana' OR agent_id ILIKE 'mariana@%';

-- Verificar após correção
SELECT 
  'APÓS CORREÇÃO' as status,
  agent_id,
  COUNT(*) as total_calls
FROM calls 
WHERE agent_id ILIKE '%mariana%'
GROUP BY agent_id
ORDER BY total_calls DESC;

-- ===============================================================
-- 2. RECRIAR FUNÇÃO get_calls_with_filters SEM LIMITE
-- ===============================================================

-- Dropar função atual para recriar sem limitações
DROP FUNCTION IF EXISTS get_calls_with_filters CASCADE;

CREATE OR REPLACE FUNCTION get_calls_with_filters(
    p_sdr text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_type text DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL,
    p_limit integer DEFAULT 999999, -- LIMITE MUITO ALTO por padrão
    p_offset integer DEFAULT 0,
    p_sort_by text DEFAULT 'created_at',
    p_min_duration integer DEFAULT NULL,
    p_max_duration integer DEFAULT NULL,
    p_min_score numeric DEFAULT NULL,
    p_search_query text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    provider_call_id text,
    deal_id text,
    enterprise text,
    person text,
    agent_id text,
    sdr_id uuid,
    status text,
    status_voip text,
    status_voip_friendly text,
    duration integer,
    duration_formated text,
    duration_seconds integer,
    call_type text,
    direction text,
    recording_url text,
    transcription text,
    ai_status text,
    insights jsonb,
    scorecard jsonb,
    from_number text,
    to_number text,
    created_at timestamptz,
    updated_at timestamptz,
    processed_at timestamptz,
    calculated_score numeric,
    total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_records bigint;
BEGIN
    -- Contar total primeiro
    SELECT COUNT(*) INTO total_records
    FROM calls c
    WHERE 
        (p_sdr IS NULL OR c.agent_id ILIKE '%' || p_sdr || '%')
        AND (p_status IS NULL OR 
             (p_status = 'normal_clearing' AND c.status_voip = 'normal_clearing') OR
             (p_status = 'Atendida' AND c.status_voip = 'normal_clearing') OR
             (p_status != 'normal_clearing' AND p_status != 'Atendida' AND c.status_voip = p_status))
        AND (p_type IS NULL OR c.call_type = p_type)
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
        AND (p_search_query IS NULL OR 
             c.enterprise ILIKE '%' || p_search_query || '%' OR 
             c.deal_id ILIKE '%' || p_search_query || '%');

    -- Retornar dados com total_count
    RETURN QUERY
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        COALESCE(c.enterprise, c.insights->>'enterprise', 'Empresa não informada') as enterprise,
        COALESCE(c.person, c.insights->>'person', 'Pessoa não informada') as person,
        c.agent_id,
        c.sdr_id,
        c.status,
        c.status_voip,
        CASE c.status_voip
            WHEN 'normal_clearing' THEN 'Atendida'
            WHEN 'no_answer' THEN 'Não atendida'
            WHEN 'originator_cancel' THEN 'Cancelada pela SDR'
            WHEN 'number_changed' THEN 'Numero mudou'
            WHEN 'recovery_on_timer_expire' THEN 'Tempo esgotado'
            WHEN 'unallocated_number' THEN 'Número não encontrado'
            ELSE COALESCE(c.status_voip, 'Status desconhecido')
        END as status_voip_friendly,
        c.duration,
        COALESCE(c.duration_formated, '00:00:00') as duration_formated,
        COALESCE(c.duration, 0) as duration_seconds,
        c.call_type,
        c.direction,
        c.recording_url,
        c.transcription,
        c.ai_status,
        c.insights,
        c.scorecard,
        c.from_number,
        c.to_number,
        c.created_at,
        c.updated_at,
        c.processed_at,
        COALESCE(ca.final_grade, 0) as calculated_score,
        total_records as total_count
    FROM calls c
    LEFT JOIN call_analysis ca ON ca.call_id = c.id
    WHERE 
        (p_sdr IS NULL OR c.agent_id ILIKE '%' || p_sdr || '%')
        AND (p_status IS NULL OR 
             (p_status = 'normal_clearing' AND c.status_voip = 'normal_clearing') OR
             (p_status = 'Atendida' AND c.status_voip = 'normal_clearing') OR
             (p_status != 'normal_clearing' AND p_status != 'Atendida' AND c.status_voip = p_status))
        AND (p_type IS NULL OR c.call_type = p_type)
        AND (p_start_date IS NULL OR c.created_at >= p_start_date)
        AND (p_end_date IS NULL OR c.created_at <= p_end_date)
        AND (p_search_query IS NULL OR 
             c.enterprise ILIKE '%' || p_search_query || '%' OR 
             c.deal_id ILIKE '%' || p_search_query || '%')
    ORDER BY 
        CASE 
            WHEN p_sort_by = 'created_at' THEN c.created_at
            ELSE c.created_at
        END DESC
    LIMIT LEAST(p_limit, 999999) -- Máximo de 999999 registros
    OFFSET p_offset;
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION get_calls_with_filters TO authenticated, service_role;

-- ===============================================================
-- 3. VERIFICAR CONSISTÊNCIA DOS DADOS
-- ===============================================================

-- Total geral de chamadas
SELECT 'TOTAL GERAL' as fonte, COUNT(*) as total_calls FROM calls;

-- Total via get_sdr_metrics
SELECT 
  'VIA get_sdr_metrics' as fonte,
  SUM(total_calls) as total_calls,
  SUM(answered_calls) as answered_calls
FROM get_sdr_metrics(99999);

-- Total via get_calls_with_filters (primeiras 50k)
SELECT 
  'VIA get_calls_with_filters' as fonte,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls
FROM get_calls_with_filters(
  p_sdr := NULL,
  p_status := NULL,
  p_type := NULL,
  p_start_date := NULL,
  p_end_date := NULL,
  p_limit := 50000,
  p_offset := 0
);

-- ===============================================================
-- 4. VERIFICAR NOMES ÚNICOS APÓS CORREÇÃO
-- ===============================================================

SELECT 
  'NOMES ÚNICOS APÓS CORREÇÃO' as status,
  agent_id,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls
FROM calls 
GROUP BY agent_id
HAVING COUNT(*) > 10  -- Só SDRs com mais de 10 calls
ORDER BY total_calls DESC;

