-- Permitir Sprints Contínuas (sem data fim)
-- Execute este script no Supabase SQL Editor

-- Remover a restrição NOT NULL da coluna end_date
ALTER TABLE sprints 
ALTER COLUMN end_date DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN sprints.end_date IS 'Data de término da sprint. Pode ser NULL para sprints contínuas (sem data fim definida)';

-- Verificar a alteração
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sprints' 
    AND column_name = 'end_date';
