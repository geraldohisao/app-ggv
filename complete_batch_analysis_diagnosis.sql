-- complete_batch_analysis_diagnosis.sql
-- Diagnóstico completo do sistema de análise em lote

-- ===================================================================
-- PARTE 1: VERIFICAR ESTRUTURA DAS TABELAS
-- ===================================================================

SELECT '🔍 VERIFICANDO ESTRUTURA DAS TABELAS...' as step;

-- Verificar se tabelas existem
SELECT 
    'calls' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN transcription IS NOT NULL AND length(transcription) > 100 THEN 1 END) as com_transcricao,
    COUNT(CASE WHEN duration >= 180 THEN 1 END) as mais_3min,
    COUNT(CASE WHEN transcription IS NOT NULL AND length(transcription) > 100 AND duration >= 180 THEN 1 END) as elegiveis_analise
FROM calls
UNION ALL
SELECT 
    'call_analysis' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN final_grade IS NOT NULL THEN 1 END) as com_nota,
    COUNT(CASE WHEN final_grade > 0 THEN 1 END) as com_score_positivo,
    0 as elegiveis_analise
FROM call_analysis
UNION ALL
SELECT 
    'scorecards' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN active = true THEN 1 END) as ativos,
    0 as mais_3min,
    0 as elegiveis_analise
FROM scorecards
UNION ALL
SELECT 
    'batch_analysis_jobs' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completados,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as rodando,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes
FROM batch_analysis_jobs;

-- ===================================================================
-- PARTE 2: VERIFICAR FUNÇÕES DISPONÍVEIS
-- ===================================================================

SELECT '🔍 VERIFICANDO FUNÇÕES DISPONÍVEIS...' as step;

SELECT 
    proname as nome_funcao,
    oidvectortypes(proargtypes) as parametros,
    pg_get_function_result(oid) as retorno
FROM pg_proc 
WHERE proname LIKE '%batch%' OR proname LIKE '%scorecard%' OR proname LIKE '%analysis%'
ORDER BY proname;

-- ===================================================================
-- PARTE 3: ANÁLISE DETALHADA DE CHAMADAS ELEGÍVEIS
-- ===================================================================

SELECT '📊 ANÁLISE DETALHADA DE CHAMADAS...' as step;

-- Chamadas elegíveis para análise (sem análise prévia)
WITH eligible_calls AS (
    SELECT 
        c.id,
        c.call_type,
        c.pipeline,
        c.cadence,
        c.duration,
        c.ai_status,
        length(c.transcription) as transcript_length,
        CASE WHEN ca.call_id IS NOT NULL THEN true ELSE false END as has_analysis
    FROM calls c
    LEFT JOIN call_analysis ca ON c.id = ca.call_id
    WHERE c.transcription IS NOT NULL 
    AND length(c.transcription) > 100
    AND c.duration >= 180
)
SELECT 
    'CHAMADAS ELEGÍVEIS' as categoria,
    COUNT(*) as total,
    COUNT(CASE WHEN has_analysis = false THEN 1 END) as sem_analise,
    COUNT(CASE WHEN has_analysis = true THEN 1 END) as com_analise,
    AVG(duration) as duracao_media,
    AVG(transcript_length) as transcript_medio
FROM eligible_calls
UNION ALL
SELECT 
    'POR TIPO' as categoria,
    COUNT(*) as total,
    COUNT(CASE WHEN has_analysis = false THEN 1 END) as sem_analise,
    COUNT(CASE WHEN has_analysis = true THEN 1 END) as com_analise,
    0 as duracao_media,
    0 as transcript_medio
FROM eligible_calls
WHERE call_type IS NOT NULL
GROUP BY call_type
ORDER BY categoria, total DESC;

-- ===================================================================
-- PARTE 4: VERIFICAR SCORECARDS E CRITÉRIOS
-- ===================================================================

SELECT '📋 VERIFICANDO SCORECARDS...' as step;

SELECT 
    s.name as scorecard_nome,
    s.active as ativo,
    s.target_call_types as tipos_chamada,
    s.target_pipelines as pipelines,
    s.target_cadences as cadencias,
    COUNT(sc.id) as criterios_count,
    SUM(sc.weight) as peso_total
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
GROUP BY s.id, s.name, s.active, s.target_call_types, s.target_pipelines, s.target_cadences
ORDER BY s.active DESC, s.created_at DESC;

-- ===================================================================
-- PARTE 5: TESTAR FUNÇÃO DE SELEÇÃO INTELIGENTE
-- ===================================================================

SELECT '🧠 TESTANDO SELEÇÃO INTELIGENTE...' as step;

-- Testar com diferentes combinações
SELECT 
    'TESTE 1: consultoria' as teste,
    name as scorecard_selecionado,
    match_score as pontuacao
FROM get_scorecard_smart('consultoria', null, null)
UNION ALL
SELECT 
    'TESTE 2: consultoria + vendas' as teste,
    name as scorecard_selecionado,
    match_score as pontuacao
FROM get_scorecard_smart('consultoria', 'vendas', null)
UNION ALL
SELECT 
    'TESTE 3: consultoria + vendas + inbound' as teste,
    name as scorecard_selecionado,
    match_score as pontuacao
FROM get_scorecard_smart('consultoria', 'vendas', 'inbound');

-- ===================================================================
-- PARTE 6: VERIFICAR CHAMADAS ESPECÍFICAS QUE FALHARAM
-- ===================================================================

SELECT '🔍 VERIFICANDO CHAMADAS ESPECÍFICAS...' as step;

-- Verificar as chamadas que apareceram nos logs
SELECT 
    c.id,
    c.call_type,
    c.pipeline,
    c.cadence,
    c.duration,
    c.ai_status,
    length(c.transcription) as transcript_length,
    CASE WHEN ca.call_id IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_analise,
    ca.final_grade,
    ca.created_at as analysis_created_at
FROM calls c
LEFT JOIN call_analysis ca ON c.id = ca.call_id
WHERE c.id IN (
    'b93a083f-2606-44c1-91b5-d06bc1158e5c',
    '181d5ebc-2797-4735-aa82-7152ab9a0529',
    'fcdbc641-6546-4948-b129-3054dcf416c6',
    'd5086be3-fc1c-41e8-948f-deaafe780307',
    '695a161b-3232-40d4-b404-65304674c2ba'
);

-- ===================================================================
-- PARTE 7: TESTE DIRETO DA FUNÇÃO DE ANÁLISE
-- ===================================================================

SELECT '🧪 TESTANDO FUNÇÃO DE ANÁLISE DIRETA...' as step;

-- Testar com uma chamada específica
SELECT perform_ultra_fast_ai_analysis('b93a083f-2606-44c1-91b5-d06bc1158e5c') as resultado_teste;

-- ===================================================================
-- PARTE 8: RECOMENDAÇÕES BASEADAS NO DIAGNÓSTICO
-- ===================================================================

SELECT '💡 DIAGNÓSTICO CONCLUÍDO!' as final_step;
SELECT 'Verifique os resultados acima para entender o estado atual do sistema' as instrucoes;
