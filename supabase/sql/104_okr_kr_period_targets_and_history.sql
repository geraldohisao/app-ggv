-- ============================================
-- OKR Cockpit: metas por período + history
-- Data: 2026-01-27
-- Objetivo:
-- 1) Metas por período (mensal/trimestral) opcionais por KR
-- 2) Persistir `key_results.history` para sparklines/tendência (alimentado por `kr_checkins`)
-- ============================================

-- ============================================
-- 1) key_results.history (sparklines)
-- ============================================

ALTER TABLE public.key_results
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.key_results.history IS
'Série curta (JSON) para sparkline do KR. Alimentada por triggers a partir de kr_checkins. Ex: [{date,value}].';

-- ============================================
-- 2) Tabela: kr_period_targets (mensal/trimestral)
-- ============================================

CREATE TABLE IF NOT EXISTS public.kr_period_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id UUID NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,

  -- month | quarter
  period_type TEXT NOT NULL CHECK (period_type IN ('month', 'quarter')),
  -- padronizar como 1º dia do mês (month) ou 1º dia do trimestre (quarter)
  period_start DATE NOT NULL,

  -- delta | point | range
  -- delta: meta incremental no período (ex.: faturamento no mês)
  -- point: meta de ponto/limiar ao final do período (ex.: % no fim do mês)
  -- range: faixa ao final do período (in_between)
  target_kind TEXT NOT NULL CHECK (target_kind IN ('delta', 'point', 'range')),

  target_value NUMERIC NOT NULL,
  target_max NUMERIC NULL,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT kr_period_targets_unique UNIQUE (kr_id, period_type, period_start),
  CONSTRAINT kr_period_targets_value_non_negative CHECK (target_value >= 0),
  CONSTRAINT kr_period_targets_range_rules CHECK (
    (target_kind <> 'range' AND target_max IS NULL)
    OR
    (target_kind = 'range' AND target_max IS NOT NULL AND target_max >= target_value AND target_max >= 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_kr_period_targets_kr_id
ON public.kr_period_targets (kr_id);

CREATE INDEX IF NOT EXISTS idx_kr_period_targets_period
ON public.kr_period_targets (period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_kr_period_targets_kr_period
ON public.kr_period_targets (kr_id, period_type, period_start);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_kr_period_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kr_period_targets_updated_at ON public.kr_period_targets;
CREATE TRIGGER trigger_update_kr_period_targets_updated_at
  BEFORE UPDATE ON public.kr_period_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kr_period_targets_updated_at();

-- RLS
ALTER TABLE public.kr_period_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.kr_period_targets;
CREATE POLICY "Permitir tudo para autenticados"
ON public.kr_period_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 3) Trigger: alimentar key_results.history a partir de kr_checkins
-- ============================================

CREATE OR REPLACE FUNCTION public.append_kr_history_from_checkin()
RETURNS TRIGGER AS $$
DECLARE
  v_history JSONB;
  v_new JSONB;
BEGIN
  -- Se a coluna history ainda não existir por algum motivo, não falhar
  BEGIN
    SELECT COALESCE(history, '[]'::jsonb)
      INTO v_history
    FROM public.key_results
    WHERE id = NEW.kr_id
    FOR UPDATE;
  EXCEPTION WHEN undefined_column THEN
    RETURN NEW;
  END;

  v_new := v_history || jsonb_build_array(
    jsonb_build_object(
      'date', NEW.created_at::text,
      'value', NEW.value
    )
  );

  -- Manter apenas os últimos 12 pontos (ordem cronológica)
  v_new := (
    SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
    FROM (
      SELECT elem, ord
      FROM jsonb_array_elements(v_new) WITH ORDINALITY t(elem, ord)
      ORDER BY ord DESC
      LIMIT 12
    ) last
  );

  UPDATE public.key_results
  SET history = v_new
  WHERE id = NEW.kr_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'kr_checkins'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_append_kr_history_from_checkin ON public.kr_checkins;';
    EXECUTE $q$
      CREATE TRIGGER trigger_append_kr_history_from_checkin
      AFTER INSERT ON public.kr_checkins
      FOR EACH ROW
      EXECUTE FUNCTION public.append_kr_history_from_checkin();
    $q$;
  END IF;
END $$;

