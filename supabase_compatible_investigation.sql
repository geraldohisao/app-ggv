-- INVESTIGAÇÃO COMPATÍVEL COM SUPABASE SQL EDITOR

-- 1. Ver estrutura real da tabela calls
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver uma amostra real dos dados (todas as colunas)
SELECT * FROM calls LIMIT 3;

-- 3. Verificar outras tabelas relacionadas
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (table_name ILIKE '%call%' OR table_name ILIKE '%duration%')
ORDER BY table_name;

-- 4. Ver se há views relacionadas a calls
SELECT table_name, view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
AND table_name ILIKE '%call%';

