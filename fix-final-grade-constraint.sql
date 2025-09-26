-- 🔧 CORRIGIR: Constraint da coluna final_grade
-- Permite valores NULL para marcar análises que falharam

-- 1. Verificar constraint atual da coluna final_grade
SELECT 'Constraint atual da coluna final_grade:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'call_analysis'::regclass 
AND conname LIKE '%final_grade%';

-- 2. Primeiro, remover constraint NOT NULL (se existir)
ALTER TABLE call_analysis ALTER COLUMN final_grade DROP NOT NULL;

-- 3. Atualizar dados para permitir NULL
UPDATE call_analysis 
SET final_grade = NULL
WHERE final_grade = -1;

-- 4. Remover constraint CHECK atual (se existir)
ALTER TABLE call_analysis DROP CONSTRAINT IF EXISTS call_analysis_final_grade_check;

-- 5. Adicionar novo constraint que permite NULL
ALTER TABLE call_analysis ADD CONSTRAINT call_analysis_final_grade_check 
CHECK (final_grade IS NULL OR (final_grade >= 0 AND final_grade <= 10));

-- 6. Verificar se o novo constraint foi aplicado
SELECT 'Novo constraint aplicado:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'call_analysis'::regclass 
AND conname LIKE '%final_grade%';

-- 7. Testar se NULL é permitido agora
SELECT 'Teste: Verificar se NULL é permitido:' as info;
SELECT 
    CASE 
        WHEN NULL IS NULL THEN '✅ NULL é permitido'
        ELSE '❌ NULL NÃO é permitido'
    END as resultado_teste;