-- Adicionar coluna 'activity_progress' para permitir progresso parcial em atividades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='key_results' AND column_name='activity_progress'
  ) THEN
    ALTER TABLE key_results ADD COLUMN activity_progress INTEGER DEFAULT 0 CHECK (activity_progress >= 0 AND activity_progress <= 100);
    COMMENT ON COLUMN key_results.activity_progress IS 'Progresso da atividade em % (0-100). Usado quando type = activity.';
  END IF;
END $$;

