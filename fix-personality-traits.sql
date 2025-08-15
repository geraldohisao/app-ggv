-- Script para corrigir a tabela ai_personas
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Adicionar coluna personalityTraits se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_personas' 
        AND column_name = 'personalitytraits'
    ) THEN
        ALTER TABLE ai_personas ADD COLUMN personalityTraits TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 2. Atualizar as personas existentes com as novas características
UPDATE ai_personas 
SET personalityTraits = ARRAY['Consultivo', 'Questionador', 'Focado em resultados', 'Estratégico']
WHERE id = 'SDR';

UPDATE ai_personas 
SET personalityTraits = ARRAY['Consultivo', 'Focado na dor', 'Orientado ao fechamento', 'Estratégico']
WHERE id = 'Closer';

UPDATE ai_personas 
SET personalityTraits = ARRAY['Estratégico', 'Analítico', 'Questionador', 'Visionário']
WHERE id = 'Gestor';

-- 3. Verificar se as colunas foram criadas corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
ORDER BY ordinal_position;
