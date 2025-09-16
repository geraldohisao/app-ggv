-- INVESTIGAÇÃO SIMPLES - VER TODAS AS COLUNAS REAIS

-- 1. Ver estrutura real da tabela calls
\d calls;

-- 2. Se o comando acima não funcionar, tentar este:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Ver uma amostra real dos dados
SELECT * FROM calls LIMIT 3;

-- 4. Verificar se há outras tabelas que podem conter durações
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (table_name ILIKE '%call%' OR table_name ILIKE '%duration%')
ORDER BY table_name;

