-- =========================================
-- EXECUTAR UMA FUNÇÃO POR VEZ - EVITAR ERRO DE SNIPPET
-- Copie e cole cada bloco separadamente no Supabase
-- =========================================

-- PASSO 1: Atualizar get_call_volume_data_with_analysis
-- Execute este bloco primeiro:

DROP FUNCTION IF EXISTS public.get_call_volume_data_with_analysis CASCADE;

CREATE OR REPLACE FUNCTION public.get_call_volume_data_with_analysis(
    p_days INTEGER DEFAULT 14,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    date_key DATE,
    answered_count BIGINT,
    missed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_start_date := COALESCE(p_start_date, CURRENT_DATE - p_days);
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);
    
    RETURN QUERY
    SELECT 
        c.created_at::DATE as date_key,
        COUNT(CASE WHEN c.status_voip = 'normal_clearing' THEN 1 END) as answered_count,
        COUNT(CASE WHEN c.status_voip != 'normal_clearing' OR c.status_voip IS NULL THEN 1 END) as missed_count
    FROM calls c
    LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
    INNER JOIN call_analysis ca ON c.id = ca.call_id
    WHERE c.created_at::DATE >= v_start_date 
      AND c.created_at::DATE <= v_end_date
      AND ca.final_grade IS NOT NULL
    GROUP BY c.created_at::DATE
    ORDER BY c.created_at::DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_volume_data_with_analysis(INTEGER, DATE, DATE) TO authenticated, anon, service_role;
