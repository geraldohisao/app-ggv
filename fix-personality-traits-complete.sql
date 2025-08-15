-- Script COMPLETO para corrigir a tabela ai_personas
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Verificar se a tabela existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_personas') THEN
        RAISE EXCEPTION 'Tabela ai_personas não existe. Execute primeiro o script supabase-schema.sql';
    END IF;
END $$;

-- 2. Adicionar coluna personalityTraits se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_personas' 
        AND column_name = 'personalitytraits'
    ) THEN
        ALTER TABLE ai_personas ADD COLUMN personalityTraits TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Coluna personalityTraits adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna personalityTraits já existe';
    END IF;
END $$;

-- 3. Verificar se todas as colunas necessárias existem
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
ORDER BY ordinal_position;

-- 4. Atualizar as personas existentes com as novas características
UPDATE ai_personas 
SET personalityTraits = ARRAY['Consultivo', 'Questionador', 'Focado em resultados', 'Estratégico']
WHERE id = 'SDR';

UPDATE ai_personas 
SET personalityTraits = ARRAY['Consultivo', 'Focado na dor', 'Orientado ao fechamento', 'Estratégico']
WHERE id = 'Closer';

UPDATE ai_personas 
SET personalityTraits = ARRAY['Estratégico', 'Analítico', 'Questionador', 'Visionário']
WHERE id = 'Gestor';

-- 5. Verificar se as atualizações foram aplicadas
SELECT id, name, personalityTraits FROM ai_personas;

-- 6. Testar inserção de uma nova persona (se necessário)
-- INSERT INTO ai_personas (id, name, description, tone, wordLimit, systemPrompt, directives, personalityTraits) 
-- VALUES ('TEST', 'Test Persona', 'Test Description', 'test', 200, 'test prompt', 'test directives', ARRAY['test trait'])
-- ON CONFLICT (id) DO NOTHING;

-- 7. Limpar teste (se foi criado)
-- DELETE FROM ai_personas WHERE id = 'TEST';

-- 8. Verificação final
SELECT 
    'Verificação final:' as status,
    COUNT(*) as total_personas,
    COUNT(CASE WHEN personalityTraits IS NOT NULL THEN 1 END) as personas_com_traits
FROM ai_personas;
