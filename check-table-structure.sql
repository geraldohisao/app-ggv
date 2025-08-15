-- Script para verificar a estrutura atual da tabela ai_personas
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Verificar se a tabela existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_personas') 
        THEN '✅ Tabela ai_personas EXISTE' 
        ELSE '❌ Tabela ai_personas NÃO EXISTE' 
    END as status_tabela;

-- 2. Verificar todas as colunas da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
ORDER BY ordinal_position;

-- 3. Verificar se as colunas específicas existem
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_personas' AND column_name = 'wordlimit') 
        THEN '✅ Coluna wordLimit EXISTE' 
        ELSE '❌ Coluna wordLimit NÃO EXISTE' 
    END as status_wordlimit,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_personas' AND column_name = 'systemprompt') 
        THEN '✅ Coluna systemPrompt EXISTE' 
        ELSE '❌ Coluna systemPrompt NÃO EXISTE' 
    END as status_systemprompt,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_personas' AND column_name = 'personalitytraits') 
        THEN '✅ Coluna personalityTraits EXISTE' 
        ELSE '❌ Coluna personalityTraits NÃO EXISTE' 
    END as status_personalitytraits;

-- 4. Verificar dados na tabela
SELECT 
    COUNT(*) as total_personas,
    STRING_AGG(id, ', ') as personas_existentes
FROM ai_personas;

-- 5. Mostrar dados completos (se existirem)
SELECT * FROM ai_personas LIMIT 3;
