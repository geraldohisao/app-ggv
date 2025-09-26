-- 🛡️ GARANTIR: Sem Nota em Caso de Erro na IA
-- Este script garante que ligações com erro na análise não recebam nota alguma

-- 1. Verificar ligações com erro na análise que ainda têm nota
SELECT '1. Ligações com erro que ainda têm nota:' as info;
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.agent_id,
    c.call_type,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at as analysis_created_at
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade IS NOT NULL
AND (
    ca.general_feedback ILIKE '%erro%'
    OR ca.general_feedback ILIKE '%falha%'
    OR ca.general_feedback ILIKE '%análise automática indisponível%'
    OR ca.general_feedback ILIKE '%configurar chave%'
    OR ca.general_feedback ILIKE '%modelo de ia%'
    OR ca.strengths::text ILIKE '%Chamada realizada com sucesso%'
    OR ca.improvements::text ILIKE '%Configurar chave da API%'
    OR ca.improvements::text ILIKE '%Revisar configuração%'
    OR ca.confidence < 0.5
)
ORDER BY ca.created_at DESC
LIMIT 10;

-- 2. Remover notas de ligações com erro
UPDATE call_analysis
SET 
    final_grade = NULL,
    general_feedback = 'Análise automática indisponível. Nota removida para não impactar métricas.',
    updated_at = NOW()
WHERE final_grade IS NOT NULL
AND (
    general_feedback ILIKE '%erro%'
    OR general_feedback ILIKE '%falha%'
    OR general_feedback ILIKE '%análise automática indisponível%'
    OR general_feedback ILIKE '%configurar chave%'
    OR general_feedback ILIKE '%modelo de ia%'
    OR strengths::text ILIKE '%Chamada realizada com sucesso%'
    OR improvements::text ILIKE '%Configurar chave da API%'
    OR improvements::text ILIKE '%Revisar configuração%'
    OR confidence < 0.5
);

-- 3. Verificar ligações corrigidas
SELECT '2. Ligações corrigidas (sem nota):' as info;
SELECT 
    COUNT(*) as total_corrigidas
FROM call_analysis
WHERE final_grade IS NULL
AND updated_at >= NOW() - INTERVAL '1 minute';

-- 4. Verificar se constraint permite NULL
SELECT '3. Verificando constraint final_grade:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'call_analysis'::regclass
AND conname LIKE '%final_grade%';

-- 5. Estatísticas finais
SELECT '4. Estatísticas finais:' as info;
SELECT 
    COUNT(CASE WHEN final_grade IS NULL THEN 1 END) as sem_nota,
    COUNT(CASE WHEN final_grade >= 8 THEN 1 END) as nota_8_ou_mais,
    COUNT(CASE WHEN final_grade >= 6 AND final_grade < 8 THEN 1 END) as nota_6_a_8,
    COUNT(CASE WHEN final_grade < 6 THEN 1 END) as nota_menor_6,
    COUNT(*) as total_analises
FROM call_analysis;
