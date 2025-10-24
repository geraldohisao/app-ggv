-- 🔍 INVESTIGAÇÃO: Problemas na Análise de IA
-- Chamada: Prefiro não falar - Mario Miyasaki

-- =========================================
-- PARTE 1: VERIFICAR ANÁLISES EXISTENTES
-- =========================================

SELECT '=== ANÁLISES DA CHAMADA (call_analysis) ===' as info;

SELECT 
    ca.id,
    ca.call_id,
    ca.scorecard_name,
    ca.overall_score,
    ca.max_possible_score,
    ca.final_grade,
    ca.general_feedback,
    ca.confidence,
    ca.created_at,
    jsonb_array_length(ca.criteria_analysis) as num_criterios
FROM call_analysis ca
WHERE ca.call_id = 'e6ae879c-4890-496a-b25a-560208ed8ab8'
ORDER BY ca.created_at DESC;

-- =========================================
-- PARTE 2: VER DETALHES DOS CRITÉRIOS
-- =========================================

SELECT '=== ANÁLISE DETALHADA DOS CRITÉRIOS ===' as info;

SELECT 
    ca.id,
    ca.final_grade as nota_geral,
    ca.overall_score as pontuacao_total,
    ca.max_possible_score as pontuacao_maxima,
    jsonb_pretty(ca.criteria_analysis) as criterios_detalhados
FROM call_analysis ca
WHERE ca.call_id = 'e6ae879c-4890-496a-b25a-560208ed8ab8'
ORDER BY ca.created_at DESC
LIMIT 1;

-- =========================================
-- PARTE 3: VERIFICAR DURAÇÃO
-- =========================================

SELECT '=== DURAÇÃO DA CHAMADA ===' as info;

SELECT 
    id,
    enterprise,
    person,
    -- CAMPOS DE DURAÇÃO
    duration,
    duration_formated,
    -- ÁUDIO
    recording_url,
    -- TRANSCRIÇÃO
    LENGTH(transcription) as transcription_length,
    -- OUTROS
    created_at
FROM calls
WHERE id = 'e6ae879c-4890-496a-b25a-560208ed8ab8';

-- =========================================
-- PARTE 4: VERIFICAR SCORECARD USADO
-- =========================================

SELECT '=== SCORECARD E CRITÉRIOS ===' as info;

-- Buscar scorecard usado
WITH ultima_analise AS (
    SELECT scorecard_id
    FROM call_analysis
    WHERE call_id = 'e6ae879c-4890-496a-b25a-560208ed8ab8'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    s.id,
    s.name,
    s.description,
    s.conversation_type,
    COUNT(sc.id) as total_criterios,
    SUM(sc.weight) as soma_pesos,
    SUM(sc.max_score) as pontuacao_maxima_possivel
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON sc.scorecard_id = s.id
WHERE s.id = (SELECT scorecard_id FROM ultima_analise)
GROUP BY s.id, s.name, s.description, s.conversation_type;

-- Ver critérios individuais
WITH ultima_analise AS (
    SELECT scorecard_id
    FROM call_analysis
    WHERE call_id = 'e6ae879c-4890-496a-b25a-560208ed8ab8'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    sc.name as criterio,
    sc.description,
    sc.weight as peso,
    sc.max_score as nota_maxima,
    sc.order_index as ordem
FROM scorecard_criteria sc
WHERE sc.scorecard_id = (SELECT scorecard_id FROM ultima_analise)
ORDER BY sc.order_index;

-- =========================================
-- PARTE 5: DIAGNÓSTICO
-- =========================================

SELECT '
🔍 DIAGNÓSTICO:

1. NOTA 8.0 ANTES DA ANÁLISE:
   - Verificar se há análise antiga na tabela call_analysis
   - Frontend pode estar mostrando análise em cache
   - Solução: Limpar estado ao reprocessar

2. DURAÇÃO PLAYER vs EXIBIDA:
   - Player: 3:20 (200s) vs Duração: 6:39 (399s)
   - Verificar qual está correto
   - Pode ser áudio cortado ou campo errado

3. NOTA MUITO BAIXA (1.2/10):
   - Exemplo: "Se apresentou" = 2/10
   - Verificar se cálculo de peso está correto
   - Fórmula: (achieved_score * weight) / (max_score * weight)
   - OpenAI pode estar sendo muito rigoroso

4. CÁLCULO DE PESO:
   - Ver soma total de pesos dos critérios
   - Verificar se fórmula está correta em scorecardAnalysisService.ts
   - Linhas ~465-488

' as diagnostico;

-- =========================================
-- PARTE 6: EXEMPLO DE CÁLCULO CORRETO
-- =========================================

SELECT '
📊 EXEMPLO DE CÁLCULO COM PESOS:

Critério 1: Se apresentou
- Nota obtida: 2 / Nota máxima: 10
- Peso: 2
- Pontuação ponderada: 2 * 2 = 4

Critério 2: Outro critério
- Nota obtida: 8 / Nota máxima: 10
- Peso: 1
- Pontuação ponderada: 8 * 1 = 8

TOTAL:
- Pontuação ponderada total: 4 + 8 = 12
- Pontuação máxima ponderada: (10*2) + (10*1) = 30
- Nota final: (12/30) * 10 = 4.0/10

Se está dando 1.2, algo está errado no cálculo!

' as exemplo_calculo;

