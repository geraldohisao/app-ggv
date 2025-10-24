-- =====================================================
-- TESTE: ANÁLISE EM MASSA - DIAGNÓSTICO COMPLETO
-- =====================================================

-- 1️⃣ Quantas chamadas são elegíveis?
SELECT 
    '1. Total de chamadas ELEGÍVEIS para análise IA:' as etapa,
    COUNT(*) as total
FROM calls
WHERE duration >= 180  -- >= 3 minutos
  AND LENGTH(transcription) > 100  -- Transcrição válida
  AND (LENGTH(transcription) - LENGTH(REPLACE(transcription, '.', ''))) > 10;  -- >10 segmentos

-- 2️⃣ Quantas já foram analisadas?
SELECT 
    '2. Total de chamadas JÁ ANALISADAS:' as etapa,
    COUNT(*) as total
FROM call_analysis;

-- 3️⃣ Quantas PRECISAM de análise?
SELECT 
    '3. Chamadas que PRECISAM de análise:' as etapa,
    COUNT(*) as total
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.duration >= 180
  AND LENGTH(c.transcription) > 100
  AND (LENGTH(c.transcription) - LENGTH(REPLACE(c.transcription, '.', ''))) > 10
  AND ca.id IS NULL;  -- Sem análise

-- 4️⃣ Exemplos de chamadas PRONTAS para analisar
SELECT 
    '4. EXEMPLOS - Próximas 5 chamadas a serem analisadas:' as etapa;

SELECT 
    c.id,
    c.enterprise,  -- ✅ CORRETO!
    c.person,
    c.agent_id as sdr,
    c.duration as duration_seconds,
    c.duration_formated,
    LENGTH(c.transcription) as transcription_chars,
    (LENGTH(c.transcription) - LENGTH(REPLACE(c.transcription, '.', ''))) as segments,
    c.created_at
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.duration >= 180
  AND LENGTH(c.transcription) > 100
  AND (LENGTH(c.transcription) - LENGTH(REPLACE(c.transcription, '.', ''))) > 10
  AND ca.id IS NULL
ORDER BY c.created_at DESC
LIMIT 5;

-- 5️⃣ Resumo por status
SELECT 
    '5. RESUMO por status de chamada:' as etapa;

SELECT 
    c.status_voip,
    COUNT(*) as total,
    COUNT(ca.id) as com_analise,
    COUNT(*) - COUNT(ca.id) as sem_analise
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.duration >= 180
  AND LENGTH(c.transcription) > 100
GROUP BY c.status_voip
ORDER BY total DESC;

-- 6️⃣ Verificar se há chamadas com análise
SELECT 
    '6. Últimas 3 análises realizadas:' as etapa;

SELECT 
    ca.call_id,
    c.enterprise,
    c.person,
    ca.final_grade as nota,
    ca.scorecard_name,
    ca.created_at as data_analise
FROM call_analysis ca
JOIN calls c ON c.id = ca.call_id
ORDER BY ca.created_at DESC
LIMIT 3;

SELECT '
📊 INTERPRETAÇÃO DOS RESULTADOS:

✅ SE "3. Chamadas que PRECISAM de análise" > 0:
   → Clique em "⚡ Analisar X Novas" no painel

❌ SE "3. Chamadas que PRECISAM de análise" = 0:
   → Todas elegíveis já foram analisadas
   → Use "🔄 Re-analisar X Todas" para forçar

🎯 PRÓXIMO PASSO:
   1. Hard refresh (Ctrl+Shift+R)
   2. Vá na página de Chamadas
   3. Procure painel "🤖 Análise IA Automática"
   4. Clique "🔄 Atualizar"
   5. Os números devem bater com esta query!

' as instrucoes;

