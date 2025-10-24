-- 🔍 VERIFICAR ESTRUTURA DA TABELA CALLS
-- Descobrir todas as colunas relacionadas a duração

-- 1. Ver todas as colunas da tabela calls
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND table_schema = 'public'
  AND column_name ILIKE '%duration%'
ORDER BY column_name;

-- 2. Ver TODAS as colunas da tabela calls para identificar campos relacionados
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar dados da chamada específica em TODOS os campos
SELECT *
FROM calls 
WHERE id = '13867f2f-4df6-4679-a160-e0c294d32544';