-- Adicionar coluna 'description' em key_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='key_results' AND column_name='description'
  ) THEN
    ALTER TABLE key_results ADD COLUMN description TEXT;
    COMMENT ON COLUMN key_results.description IS 'Descrição opcional ou comentário sobre o KR';
  END IF;
END $$;

