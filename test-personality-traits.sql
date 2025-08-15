-- Script de teste para verificar se personalityTraits foi criada
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Verificar se a coluna existe
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
AND column_name = 'personalitytraits';

-- 2. Verificar todas as colunas da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
ORDER BY ordinal_position;

-- 3. Verificar os dados atuais
SELECT id, name, personalityTraits FROM ai_personas;

-- 4. Testar inserção de um trait
UPDATE ai_personas 
SET personalityTraits = ARRAY['Teste']
WHERE id = 'SDR';

-- 5. Verificar se a atualização funcionou
SELECT id, name, personalityTraits FROM ai_personas WHERE id = 'SDR';

-- 6. Reverter o teste
UPDATE ai_personas 
SET personalityTraits = ARRAY['Consultivo', 'Questionador', 'Focado em resultados', 'Estratégico']
WHERE id = 'SDR';

-- 7. Verificação final
SELECT 
    'Status:' as info,
    COUNT(*) as total_personas,
    COUNT(CASE WHEN personalityTraits IS NOT NULL THEN 1 END) as com_traits,
    COUNT(CASE WHEN personalityTraits IS NULL THEN 1 END) as sem_traits
FROM ai_personas;
