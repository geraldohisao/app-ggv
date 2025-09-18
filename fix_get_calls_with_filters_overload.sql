-- FIX: Resolver conflito de overload em get_calls_with_filters
-- Erro observado: "Could not choose the best candidate function between ..."
-- Causa: Existem duas versões com mesmos parâmetros exceto tipos (text vs timestamptz)
-- Solução: Manter apenas a ASSINATURA com timestamp with time zone (timestamptz)

DO $$
BEGIN
  -- Remover versão com datas como text, se existir
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_calls_with_filters'
      AND pg_get_function_identity_arguments(p.oid) LIKE '%p_start_date text%'
  ) THEN
    RAISE NOTICE 'Dropping text-based overload of get_calls_with_filters';
    EXECUTE 'DROP FUNCTION public.get_calls_with_filters(
      p_sdr text,
      p_status text,
      p_type text,
      p_start_date text,
      p_end_date text,
      p_limit integer,
      p_offset integer,
      p_sort_by text,
      p_min_duration integer,
      p_max_duration integer,
      p_min_score numeric
    )';
  END IF;
END $$;

-- Garantir grants na versão correta (timestamptz)
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(
  p_sdr text,
  p_status text,
  p_type text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_limit integer,
  p_offset integer,
  p_sort_by text,
  p_min_duration integer,
  p_max_duration integer,
  p_min_score numeric
) TO authenticated, anon;



