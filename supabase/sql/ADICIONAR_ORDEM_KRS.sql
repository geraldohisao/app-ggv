-- =====================================================
-- ADICIONAR CAMPO DE ORDEM NOS KEY RESULTS
-- =====================================================
-- Permite reordenar KRs com drag and drop
-- A ordem é persistida para manter a visualização consistente
-- =====================================================

-- 1. Adicionar coluna position
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_results' AND column_name = 'position'
  ) THEN
    ALTER TABLE key_results ADD COLUMN position INTEGER DEFAULT 0;
    COMMENT ON COLUMN key_results.position IS 'Posição/ordem do KR dentro do OKR (menor = primeiro)';
  END IF;
END $$;

-- 2. Criar índice para ordenação
CREATE INDEX IF NOT EXISTS idx_key_results_position ON key_results(okr_id, position ASC);

-- 3. Inicializar posições existentes baseado na data de criação (dentro de cada OKR)
UPDATE key_results 
SET position = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY okr_id ORDER BY created_at ASC) as row_num
  FROM key_results
  WHERE position IS NULL OR position = 0
) AS subquery
WHERE key_results.id = subquery.id;

-- 4. Verificação
SELECT okr_id, id, title, position, created_at 
FROM key_results 
ORDER BY okr_id, position ASC 
LIMIT 20;
