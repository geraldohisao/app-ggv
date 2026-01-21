-- Adicionar colunas faltantes em sprints

ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES sprints(id);

ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_sprints_parent_id ON sprints(parent_id);

-- Verificar colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sprints'
ORDER BY ordinal_position;
