-- =====================================================
-- ADICIONAR CAMPO DE ORDEM NOS OKRS
-- =====================================================
-- Permite reordenar OKRs com drag and drop
-- A ordem é usada para priorizar exibição no dashboard
-- =====================================================

-- 1. Adicionar coluna position
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'okrs' AND column_name = 'position'
  ) THEN
    ALTER TABLE okrs ADD COLUMN position INTEGER DEFAULT 0;
    COMMENT ON COLUMN okrs.position IS 'Posição/ordem do OKR na lista (menor = mais prioritário)';
  END IF;
END $$;

-- 2. Criar índice para ordenação
CREATE INDEX IF NOT EXISTS idx_okrs_position ON okrs(position ASC);

-- 3. Inicializar posições existentes baseado na data de criação
UPDATE okrs 
SET position = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM okrs
  WHERE position IS NULL OR position = 0
) AS subquery
WHERE okrs.id = subquery.id;

-- 4. Verificação
SELECT id, objective, position, created_at 
FROM okrs 
ORDER BY position ASC 
LIMIT 10;
