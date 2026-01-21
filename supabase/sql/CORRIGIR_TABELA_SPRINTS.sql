-- =========================================
-- CORRIGIR TABELA SPRINTS: Adicionar colunas faltantes
-- Execute se houver erro ao finalizar/criar sprint
-- =========================================

-- 1. Adicionar coluna created_by (se não existir)
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Adicionar coluna parent_id (para histórico de sprints)
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES sprints(id);

-- 3. Adicionar coluna updated_at (se não existir)
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Garantir que okr_id pode ser NULL
ALTER TABLE sprints 
ALTER COLUMN okr_id DROP NOT NULL;

-- 5. Criar índices
CREATE INDEX IF NOT EXISTS idx_sprints_created_by ON sprints(created_by);
CREATE INDEX IF NOT EXISTS idx_sprints_parent_id ON sprints(parent_id);
CREATE INDEX IF NOT EXISTS idx_sprints_okr_id ON sprints(okr_id);
CREATE INDEX IF NOT EXISTS idx_sprints_department ON sprints(department);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_type ON sprints(type);

-- 6. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_sprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sprints_updated_at ON sprints;

CREATE TRIGGER trigger_sprints_updated_at
    BEFORE UPDATE ON sprints
    FOR EACH ROW
    EXECUTE FUNCTION update_sprints_updated_at();

-- 7. Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sprints'
ORDER BY ordinal_position;

-- 8. Verificar colunas críticas
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprints' AND column_name = 'created_by') THEN '✅' ELSE '❌' END AS created_by,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprints' AND column_name = 'parent_id') THEN '✅' ELSE '❌' END AS parent_id,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprints' AND column_name = 'updated_at') THEN '✅' ELSE '❌' END AS updated_at,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprints' AND column_name = 'okr_id') THEN '✅' ELSE '❌' END AS okr_id;

-- ✅ Todas as colunas acima devem ter ✅
