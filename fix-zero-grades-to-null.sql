-- 🔧 CORREÇÃO: Atualizar final_grade de 0 para NULL
-- Para que ligações com erro não impactem as médias das SDRs

-- Verificar quantas ligações estão com final_grade = 0
SELECT 
  COUNT(*) as total_calls_with_zero_grade,
  COUNT(CASE WHEN ca.final_grade = 0 THEN 1 END) as calls_with_zero_grade
FROM call_analysis ca
WHERE ca.final_grade = 0;

-- Atualizar final_grade de 0 para NULL (não impacta médias)
UPDATE call_analysis 
SET 
  final_grade = NULL,
  updated_at = NOW()
WHERE final_grade = 0;

-- Verificar resultado
SELECT 
  COUNT(*) as total_calls,
  COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as calls_with_null_grade,
  COUNT(CASE WHEN final_grade IS NOT NULL THEN 1 END) as calls_with_valid_grade
FROM call_analysis;
