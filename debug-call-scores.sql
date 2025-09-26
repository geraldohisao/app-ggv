-- 🔍 DEBUG: Investigar Notas das Ligações
-- Este script investiga por que as ligações não têm notas

-- 1. Verificar ligações com análise
SELECT '1. Ligações com análise:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.enterprise,
    c.person,
    c.agent_id,
    c.call_type,
    c.duration,
    c.ai_status,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at as analysis_created_at
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.created_at >= '2025-09-26'
ORDER BY c.created_at DESC
LIMIT 10;

-- 2. Verificar ligações com nota >= 8
SELECT '2. Ligações com nota >= 8:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.enterprise,
    c.person,
    c.agent_id,
    c.call_type,
    c.duration,
    c.ai_status,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at as analysis_created_at
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade >= 8
ORDER BY ca.final_grade DESC
LIMIT 10;

-- 3. Verificar ligações com nota entre 6 e 8
SELECT '3. Ligações com nota entre 6 e 8:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.enterprise,
    c.person,
    c.agent_id,
    c.call_type,
    c.duration,
    c.ai_status,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at as analysis_created_at
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade >= 6 AND ca.final_grade < 8
ORDER BY ca.final_grade DESC
LIMIT 10;

-- 4. Verificar ligações com nota < 6
SELECT '4. Ligações com nota < 6:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.enterprise,
    c.person,
    c.agent_id,
    c.call_type,
    c.duration,
    c.ai_status,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at as analysis_created_at
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade < 6
ORDER BY ca.final_grade DESC
LIMIT 10;

-- 5. Verificar ligações sem análise
SELECT '5. Ligações sem análise:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.enterprise,
    c.person,
    c.agent_id,
    c.call_type,
    c.duration,
    c.ai_status,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at as analysis_created_at
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade IS NULL
AND c.created_at >= '2025-09-26'
ORDER BY c.created_at DESC
LIMIT 10;

-- 6. Estatísticas gerais
SELECT '6. Estatísticas gerais:' as info;
SELECT 
    COUNT(*) as total_ligacoes,
    COUNT(CASE WHEN ca.final_grade IS NOT NULL THEN 1 END) as com_analise,
    COUNT(CASE WHEN ca.final_grade >= 8 THEN 1 END) as nota_8_ou_mais,
    COUNT(CASE WHEN ca.final_grade >= 6 AND ca.final_grade < 8 THEN 1 END) as nota_6_a_8,
    COUNT(CASE WHEN ca.final_grade < 6 THEN 1 END) as nota_menor_6,
    COUNT(CASE WHEN ca.final_grade IS NULL THEN 1 END) as sem_analise
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.created_at >= '2025-09-26';
