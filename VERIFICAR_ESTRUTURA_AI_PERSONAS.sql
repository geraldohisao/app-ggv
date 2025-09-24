-- VERIFICAR_ESTRUTURA_AI_PERSONAS.sql
-- Script para verificar a estrutura da tabela ai_personas

-- 1. Verificar estrutura da tabela ai_personas
SELECT 
    'Estrutura da tabela ai_personas:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar dados atuais da persona SDR
SELECT 
    'Persona SDR atual:' as info,
    *
FROM ai_personas 
WHERE id = 'SDR';

-- 3. Verificar se há outras colunas relacionadas
SELECT 
    'Colunas disponíveis:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as colunas
FROM information_schema.columns 
WHERE table_name = 'ai_personas' 
AND table_schema = 'public';
