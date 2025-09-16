-- INVESTIGAR A VIEW CALLS_WITH_USERS

-- 1. Ver a definição completa da view
SELECT view_definition 
FROM information_schema.views 
WHERE table_name = 'calls_with_users';

-- 2. Ver amostra de dados da view
SELECT * FROM calls_with_users LIMIT 5;

-- 3. Ver estrutura da view
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls_with_users'
ORDER BY ordinal_position;

-- 4. Verificar se há coluna duration_formatted na view
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'calls_with_users'
AND column_name ILIKE '%duration%';

-- 5. Testar durações na view
SELECT 
    id,
    duration,
    created_at
FROM calls_with_users 
ORDER BY duration DESC NULLS LAST
LIMIT 20;

