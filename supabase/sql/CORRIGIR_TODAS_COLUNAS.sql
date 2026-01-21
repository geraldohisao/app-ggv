-- =========================================
-- SOLUÇÃO DEFINITIVA: Adicionar TODAS as colunas faltantes
-- Execute este script para corrigir de uma vez
-- =========================================

-- 1. Adicionar coluna created_by (se não existir)
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Adicionar coluna is_carry_over (se não existir)
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS is_carry_over BOOLEAN DEFAULT false;

-- 3. Adicionar coluna updated_at (se não existir)
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Criar todos os índices
CREATE INDEX IF NOT EXISTS idx_sprint_items_created_by ON sprint_items(created_by);
CREATE INDEX IF NOT EXISTS idx_sprint_items_sprint_id ON sprint_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_items_type ON sprint_items(type);
CREATE INDEX IF NOT EXISTS idx_sprint_items_status ON sprint_items(status);

-- 5. Verificar estrutura completa da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sprint_items'
ORDER BY ordinal_position;

-- 6. Contar registros
SELECT 
    COUNT(*) as total_items,
    COUNT(created_by) as with_creator,
    COUNT(is_carry_over) as with_carry_over,
    COUNT(updated_at) as with_updated_at
FROM sprint_items;

-- ✅ Verifique se todas as colunas aparecem acima:
-- - created_by (uuid)
-- - is_carry_over (boolean)
-- - updated_at (timestamp)
