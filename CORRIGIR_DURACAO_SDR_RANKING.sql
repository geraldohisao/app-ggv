-- 🔧 CORRIGIR DURAÇÃO DO RANKING SDR
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. RECRIAR FUNÇÃO COM DURAÇÃO EM SEGUNDOS (MAIS PRECISA)
-- ===============================================================

DROP FUNCTION IF EXISTS public.get_sdr_metrics(INTEGER);

CREATE OR REPLACE FUNCTION public.get_sdr_metrics(p_days INTEGER DEFAULT 90)
RETURNS TABLE (
  sdr_id TEXT,
  sdr_name TEXT,
  total_calls BIGINT,
  answered_calls BIGINT,
  avg_duration NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    LOWER(TRIM(COALESCE(c.agent_id, 'sdr_desconhecido')))             AS sdr_id,
    TRIM(COALESCE(c.agent_id, 'SDR'))                                 AS sdr_name,
    COUNT(*)::bigint                                                   AS total_calls,
    COUNT(*) FILTER (WHERE c.status_voip = 'normal_clearing')::bigint AS answered_calls,
    -- Usar duration_formated como fonte principal, fallback para duration
    AVG(
      CASE 
        WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN
          EXTRACT(EPOCH FROM c.duration_formated::interval)::integer
        WHEN c.duration > 0 THEN 
          c.duration
        ELSE 0
      END
    ) FILTER (WHERE c.status_voip = 'normal_clearing') AS avg_duration
  FROM public.calls c
  WHERE c.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY LOWER(TRIM(COALESCE(c.agent_id, 'sdr_desconhecido'))),
           TRIM(COALESCE(c.agent_id, 'SDR'))
  ORDER BY total_calls DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_sdr_metrics(INTEGER) TO authenticated, service_role;

-- ===============================================================
-- 2. TESTAR A FUNÇÃO CORRIGIDA
-- ===============================================================

SELECT 
  'TESTE FUNÇÃO CORRIGIDA' as info,
  sdr_name,
  total_calls,
  answered_calls,
  ROUND(avg_duration) as avg_duration_segundos,
  CASE 
    WHEN avg_duration >= 60 THEN 
      FLOOR(avg_duration / 60) || 'm ' || ROUND(avg_duration % 60) || 's'
    ELSE 
      ROUND(avg_duration) || 's'
  END as duracao_formatada
FROM get_sdr_metrics(90)
WHERE total_calls > 10
ORDER BY total_calls DESC;

