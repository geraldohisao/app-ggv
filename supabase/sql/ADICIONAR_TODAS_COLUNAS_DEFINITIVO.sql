-- =========================================
-- SCRIPT DEFINITIVO: Adicionar TODAS as colunas que podem estar faltando
-- Execute este script UMA VEZ e nunca mais terá problemas de colunas
-- =========================================

-- 1. Adicionar TODAS as colunas opcionais (se não existirem)

-- Coluna responsible_user_id
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES auth.users(id);

-- Coluna project_id
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS project_id UUID;

-- Coluna created_by
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Coluna is_carry_over
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS is_carry_over BOOLEAN DEFAULT false;

-- Coluna updated_at
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Criar TODOS os índices necessários
CREATE INDEX IF NOT EXISTS idx_sprint_items_sprint_id ON sprint_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_items_type ON sprint_items(type);
CREATE INDEX IF NOT EXISTS idx_sprint_items_status ON sprint_items(status);
CREATE INDEX IF NOT EXISTS idx_sprint_items_created_by ON sprint_items(created_by);
CREATE INDEX IF NOT EXISTS idx_sprint_items_responsible_user_id ON sprint_items(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_sprint_items_project_id ON sprint_items(project_id);

-- 3. Criar ou atualizar trigger para updated_at
CREATE OR REPLACE FUNCTION update_sprint_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sprint_items_updated_at ON sprint_items;

CREATE TRIGGER trigger_sprint_items_updated_at
    BEFORE UPDATE ON sprint_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sprint_items_updated_at();

-- 4. Verificar estrutura COMPLETA da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sprint_items'
ORDER BY ordinal_position;

-- 5. Verificar se TODAS as colunas necessárias existem
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'id') THEN '✅' ELSE '❌' END AS id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'sprint_id') THEN '✅' ELSE '❌' END AS sprint_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'type') THEN '✅' ELSE '❌' END AS type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'title') THEN '✅' ELSE '❌' END AS title,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'description') THEN '✅' ELSE '❌' END AS description,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'responsible') THEN '✅' ELSE '❌' END AS responsible,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'responsible_user_id') THEN '✅' ELSE '❌' END AS responsible_user_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'status') THEN '✅' ELSE '❌' END AS status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'due_date') THEN '✅' ELSE '❌' END AS due_date,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'project_id') THEN '✅' ELSE '❌' END AS project_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'created_by') THEN '✅' ELSE '❌' END AS created_by,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'is_carry_over') THEN '✅' ELSE '❌' END AS is_carry_over,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'created_at') THEN '✅' ELSE '❌' END AS created_at,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sprint_items' AND column_name = 'updated_at') THEN '✅' ELSE '❌' END AS updated_at;

-- ✅ Se TODAS as colunas acima tiverem ✅, está perfeito!
-- ❌ Se alguma tiver ❌, algo deu errado
