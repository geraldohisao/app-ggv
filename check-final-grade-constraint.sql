-- 🔍 VERIFICAR: Constraint da coluna final_grade
-- Verifica se o constraint permite valores negativos

-- 1. Verificar constraint atual da coluna final_grade
SELECT 'Constraint atual da coluna final_grade:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'call_analysis'::regclass 
AND conname LIKE '%final_grade%';

-- 2. Verificar se -1 é permitido (teste)
SELECT 'Teste: Verificar se -1 é permitido:' as info;
SELECT 
    CASE 
        WHEN -1 >= 0 AND -1 <= 10 THEN '✅ -1 é permitido (0-10)'
        WHEN -1 >= 0 THEN '✅ -1 é permitido (>= 0)'
        ELSE '❌ -1 NÃO é permitido'
    END as resultado_teste;

-- 3. Verificar valores atuais na tabela
SELECT 'Valores atuais de final_grade:' as info;
SELECT 
    final_grade,
    COUNT(*) as quantidade
FROM call_analysis 
GROUP BY final_grade 
ORDER BY final_grade;

-- 4. Verificar se há constraint CHECK
SELECT 'Constraints CHECK na tabela call_analysis:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'call_analysis'::regclass 
AND contype = 'c';
