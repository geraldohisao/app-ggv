-- 🔍 DEBUG SIMPLIFICADO - Transcrição Trocada

-- ====================================
-- 1. DADOS DA CHAMADA QUE VOCÊ ABRIU
-- ====================================
SELECT 
    id,
    enterprise,
    person,
    duration,
    LEFT(transcription, 200) as transcription_preview
FROM calls 
WHERE id = '9671164a-d697-41a2-abc2-22cbf2117370';

-- ====================================
-- 2. ANÁLISE DESTA CHAMADA
-- ====================================
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.scorecard_name
FROM call_analysis ca
WHERE ca.call_id = '9671164a-d697-41a2-abc2-22cbf2117370';

-- ====================================
-- 3. BUSCAR CHAMADA DO "INTERCOM"
-- ====================================
SELECT 
    id,
    enterprise,
    person,
    LEFT(transcription, 100) as transcription_preview
FROM calls 
WHERE transcription ILIKE '%Intercom%'
  AND transcription ILIKE '%Well%'
ORDER BY created_at DESC
LIMIT 3;

-- ====================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- ====================================

/*
Se Query 1 retornar empresa diferente de "Intercom":
→ Bug de estado React (correção já aplicada)

Se Query 2 retornar call_id diferente de '9671164a...':
→ Bug de SQL (função get_call_analysis retorna errado)

Se Query 3 retornar ID diferente de '9671164a...':
→ Confirmação que existe outra chamada com "Intercom"
*/


