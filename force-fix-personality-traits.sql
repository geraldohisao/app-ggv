-- Script FORÇADO para corrigir a coluna personalityTraits
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Verificar se a tabela existe
SELECT 'Verificando tabela ai_personas...' as status;

-- 2. FORÇAR a criação da coluna personalityTraits
DO $$ 
BEGIN
    -- Tentar adicionar a coluna se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_personas' 
        AND column_name = 'personalitytraits'
    ) THEN
        ALTER TABLE ai_personas ADD COLUMN personalityTraits TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Coluna personalityTraits ADICIONADA com sucesso';
    ELSE
        RAISE NOTICE 'Coluna personalityTraits já existe';
    END IF;
    
    -- Verificar se a coluna foi criada
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_personas' 
        AND column_name = 'personalitytraits'
    ) THEN
        RAISE NOTICE 'VERIFICAÇÃO: Coluna personalityTraits encontrada no schema';
    ELSE
        RAISE EXCEPTION 'ERRO: Coluna personalityTraits NÃO foi criada';
    END IF;
END $$;

-- 3. Atualizar TODAS as personas com características padrão
UPDATE ai_personas 
SET personalityTraits = ARRAY['Consultivo', 'Questionador', 'Focado em resultados', 'Estratégico']
WHERE id = 'SDR';

UPDATE ai_personas 
SET personalityTraits = ARRAY['Consultivo', 'Focado na dor', 'Orientado ao fechamento', 'Estratégico']
WHERE id = 'Closer';

UPDATE ai_personas 
SET personalityTraits = ARRAY['Estratégico', 'Analítico', 'Questionador', 'Visionário']
WHERE id = 'Gestor';

-- 4. Verificar se as atualizações funcionaram
SELECT 
    id, 
    name, 
    personalityTraits,
    CASE 
        WHEN personalityTraits IS NOT NULL THEN '✅ OK'
        ELSE '❌ NULL'
    END as status
FROM ai_personas;

-- 5. Testar inserção de uma nova característica
UPDATE ai_personas 
SET personalityTraits = ARRAY['Teste', 'Característica']
WHERE id = 'SDR';

-- 6. Verificar se a inserção funcionou
SELECT 
    id, 
    name, 
    personalityTraits
FROM ai_personas 
WHERE id = 'SDR';

-- 7. Reverter o teste
UPDATE ai_personas 
SET personalityTraits = ARRAY['Consultivo', 'Questionador', 'Focado em resultados', 'Estratégico']
WHERE id = 'SDR';

-- 8. Verificação final completa
SELECT 
    'VERIFICAÇÃO FINAL:' as info,
    COUNT(*) as total_personas,
    COUNT(CASE WHEN personalityTraits IS NOT NULL THEN 1 END) as com_traits,
    COUNT(CASE WHEN personalityTraits IS NULL THEN 1 END) as sem_traits,
    CASE 
        WHEN COUNT(CASE WHEN personalityTraits IS NULL THEN 1 END) = 0 THEN '✅ TODAS OK'
        ELSE '❌ ALGUMAS SEM TRAITS'
    END as resultado
FROM ai_personas;

-- 9. Mostrar todas as colunas da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
ORDER BY ordinal_position;
