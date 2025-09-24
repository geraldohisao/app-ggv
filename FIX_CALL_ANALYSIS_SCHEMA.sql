-- FIX_CALL_ANALYSIS_SCHEMA.sql
-- Normaliza o schema de public.call_analysis para a função de análise funcionar

-- Criar tabela se não existir (com todas as colunas esperadas)
CREATE TABLE IF NOT EXISTS public.call_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID UNIQUE REFERENCES public.calls(id) ON DELETE CASCADE,
  scorecard_id UUID,
  scorecard_name TEXT,
  final_grade NUMERIC(3,1),
  detailed_analysis JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar colunas ausentes de forma idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='call_analysis' AND column_name='detailed_analysis'
  ) THEN
    ALTER TABLE public.call_analysis ADD COLUMN detailed_analysis JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='call_analysis' AND column_name='final_grade'
  ) THEN
    ALTER TABLE public.call_analysis ADD COLUMN final_grade NUMERIC(3,1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='call_analysis' AND column_name='scorecard_id'
  ) THEN
    ALTER TABLE public.call_analysis ADD COLUMN scorecard_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='call_analysis' AND column_name='scorecard_name'
  ) THEN
    ALTER TABLE public.call_analysis ADD COLUMN scorecard_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='call_analysis' AND constraint_name='uq_call_analysis_call_id'
  ) THEN
    ALTER TABLE public.call_analysis
      ADD CONSTRAINT uq_call_analysis_call_id UNIQUE (call_id);
  END IF;
END $$;

-- RLS e permissões mínimas
ALTER TABLE public.call_analysis ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='call_analysis' AND policyname='call_analysis_read'
  ) THEN
    CREATE POLICY call_analysis_read ON public.call_analysis FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='call_analysis' AND policyname='call_analysis_write_service'
  ) THEN
    CREATE POLICY call_analysis_write_service ON public.call_analysis FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

GRANT SELECT ON public.call_analysis TO authenticated;
GRANT ALL ON public.call_analysis TO service_role;

-- Verificação
SELECT '✅ call_analysis schema ok' AS status,
       (SELECT string_agg(column_name, ', ' ORDER BY column_name)
          FROM information_schema.columns
         WHERE table_schema='public' AND table_name='call_analysis') AS columns;




