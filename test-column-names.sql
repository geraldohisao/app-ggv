-- Script para testar os nomes exatos das colunas
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Verificar nomes exatos das colunas (case sensitive)
SELECT 
    column_name,
    CASE 
        WHEN column_name = 'wordLimit' THEN '✅ wordLimit (camelCase)'
        WHEN column_name = 'wordlimit' THEN '✅ wordlimit (lowercase)'
        WHEN column_name = 'WORDLIMIT' THEN '✅ WORDLIMIT (uppercase)'
        ELSE column_name
    END as column_analysis
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
ORDER BY ordinal_position;

-- 2. Testar update com diferentes casos
-- Teste 1: camelCase
UPDATE ai_personas 
SET name = 'Teste CamelCase', wordLimit = 250 
WHERE id = 'SDR';

-- Verificar se funcionou
SELECT id, name, wordLimit FROM ai_personas WHERE id = 'SDR';

-- Teste 2: lowercase (se o anterior falhou)
UPDATE ai_personas 
SET name = 'Teste Lowercase', wordlimit = 250 
WHERE id = 'SDR';

-- Verificar se funcionou
SELECT id, name, wordlimit FROM ai_personas WHERE id = 'SDR';

-- 3. Reverter para o valor original
UPDATE ai_personas 
SET name = 'SDR - Qualificação', wordLimit = 200 
WHERE id = 'SDR';

-- Verificar final
SELECT * FROM ai_personas WHERE id = 'SDR';
