-- TESTAR DIFERENTES OPERADORES DE DURAÇÃO

-- 1. Testar com operador > (maior que)
SELECT COUNT(*) as count_maior_que_60 
FROM calls_with_users 
WHERE duration > 60;

-- 2. Testar com operador = (igual a)
SELECT COUNT(*) as count_igual_60 
FROM calls_with_users 
WHERE duration = 60;

-- 3. Testar com operador >= (maior ou igual) - pode estar com problema
SELECT COUNT(*) as count_maior_igual_60 
FROM calls_with_users 
WHERE duration >= 60;

-- 4. Testar range específico
SELECT COUNT(*) as count_entre_60_e_120 
FROM calls_with_users 
WHERE duration BETWEEN 60 AND 120;

-- 5. Ver todas as durações > 58 para verificar se há mais dados
SELECT 
    id,
    duration,
    created_at
FROM calls_with_users 
WHERE duration > 58
ORDER BY duration DESC;

-- 6. Testar se o problema é com o tipo de dados
SELECT 
    id,
    duration,
    CAST(duration AS INTEGER) as duration_int,
    duration::text as duration_text
FROM calls_with_users 
WHERE duration > 58
ORDER BY duration DESC
LIMIT 10;

