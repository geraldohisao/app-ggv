-- Adicionar coluna checkin_id em sprint_items
-- Permite rastrear qual check-in originou cada item

-- 1. Adicionar coluna checkin_id (nullable)
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS checkin_id UUID REFERENCES sprint_checkins(id) ON DELETE SET NULL;

-- 2. Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_sprint_items_checkin ON sprint_items(checkin_id);

-- 3. Adicionar comentário para documentação
COMMENT ON COLUMN sprint_items.checkin_id IS 
'ID do check-in que originou este item (NULL = criado manualmente pela UI)';

-- 4. Verificar resultado
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sprint_items' 
  AND column_name = 'checkin_id';

-- Resultado esperado:
-- column_name  | data_type | is_nullable | column_default
-- checkin_id   | uuid      | YES         | NULL
