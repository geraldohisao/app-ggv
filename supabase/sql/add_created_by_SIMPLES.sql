-- =========================================
-- VERSÃO SIMPLES: Adicionar coluna created_by
-- Execute este script se a versão completa der erro
-- =========================================

-- 1. Adicionar coluna created_by (ignora se já existir)
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Criar índice (ignora se já existir)
CREATE INDEX IF NOT EXISTS idx_sprint_items_created_by ON sprint_items(created_by);

-- 3. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sprint_items'
ORDER BY ordinal_position;

-- 4. Contar registros
SELECT 
    COUNT(*) as total_items,
    COUNT(created_by) as items_with_creator,
    COUNT(*) - COUNT(created_by) as items_without_creator
FROM sprint_items;

-- ✅ Pronto! Se você viu a lista de colunas acima e 'created_by' está lá, funcionou!
