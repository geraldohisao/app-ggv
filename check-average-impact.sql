-- 📊 VERIFICAR: Impacto das notas zero nas médias
-- Analisa o impacto das notas zero nas médias das SDRs

-- 1. Verificar médias antes da correção (incluindo notas zero)
SELECT 'Médias ANTES da correção (incluindo notas zero):' as info;
SELECT 
    'Todas as análises' as tipo,
    COUNT(*) as total_analises,
    AVG(final_grade) as media_geral,
    MIN(final_grade) as nota_minima,
    MAX(final_grade) as nota_maxima,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as notas_zero,
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as notas_null
FROM call_analysis;

-- 2. Verificar médias APÓS a correção (excluindo notas zero)
SELECT 'Médias APÓS a correção (excluindo notas zero):' as info;
SELECT 
    'Apenas análises válidas' as tipo,
    COUNT(*) as total_analises,
    AVG(final_grade) as media_geral,
    MIN(final_grade) as nota_minima,
    MAX(final_grade) as nota_maxima,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as notas_zero,
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as notas_null
FROM call_analysis 
WHERE final_grade IS NOT NULL AND final_grade > 0;

-- 3. Comparar médias por SDR (se houver dados de SDR)
SELECT 'Médias por SDR (se disponível):' as info;
SELECT 
    'Dados de SDR não disponíveis na tabela call_analysis' as observacao;

-- 4. Verificar distribuição de notas
SELECT 'Distribuição de notas:' as info;
SELECT 
    CASE 
        WHEN final_grade IS NULL THEN 'NULL (para reprocessar)'
        WHEN final_grade = 0 THEN '0 (erro)'
        WHEN final_grade BETWEEN 1 AND 3 THEN '1-3 (baixa)'
        WHEN final_grade BETWEEN 4 AND 6 THEN '4-6 (média)'
        WHEN final_grade BETWEEN 7 AND 8 THEN '7-8 (boa)'
        WHEN final_grade BETWEEN 9 AND 10 THEN '9-10 (excelente)'
        ELSE 'Outros'
    END as faixa_nota,
    COUNT(*) as quantidade,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM call_analysis), 2) as percentual
FROM call_analysis
GROUP BY 
    CASE 
        WHEN final_grade IS NULL THEN 'NULL (para reprocessar)'
        WHEN final_grade = 0 THEN '0 (erro)'
        WHEN final_grade BETWEEN 1 AND 3 THEN '1-3 (baixa)'
        WHEN final_grade BETWEEN 4 AND 6 THEN '4-6 (média)'
        WHEN final_grade BETWEEN 7 AND 8 THEN '7-8 (boa)'
        WHEN final_grade BETWEEN 9 AND 10 THEN '9-10 (excelente)'
        ELSE 'Outros'
    END
ORDER BY 
    CASE 
        WHEN final_grade IS NULL THEN 1
        WHEN final_grade = 0 THEN 2
        WHEN final_grade BETWEEN 1 AND 3 THEN 3
        WHEN final_grade BETWEEN 4 AND 6 THEN 4
        WHEN final_grade BETWEEN 7 AND 8 THEN 5
        WHEN final_grade BETWEEN 9 AND 10 THEN 6
        ELSE 7
    END;

-- 5. Verificar ligações que precisam ser reprocessadas
SELECT 'Ligações que precisam ser reprocessadas:' as info;
SELECT 
    COUNT(*) as total_para_reprocessar,
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as com_nota_null,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as ainda_com_zero
FROM call_analysis 
WHERE final_grade IS NULL OR final_grade = 0;

-- 6. Verificar se há ligações na fila de reprocessamento
SELECT 'Fila de reprocessamento:' as info;
SELECT 
    COUNT(*) as total_na_fila,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as concluidas,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as falharam
FROM analysis_queue;

-- 7. Resumo do impacto
SELECT 'RESUMO DO IMPACTO:' as info;
SELECT 
    'Notas zero identificadas e marcadas para reprocessamento' as acao,
    'Médias não serão mais impactadas por erros de análise' as beneficio,
    'Sistema mais confiável e preciso' as resultado;
