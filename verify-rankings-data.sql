-- 🔍 VERIFICAR: Se rankings refletem dados reais do banco
-- Execute este script no SQL Editor do Supabase

-- 1. RANKING POR VOLUME DE CHAMADAS (verificar dados reais)
SELECT '1. RANKING POR VOLUME - Dados reais do banco:' as info;
SELECT 
    agent_id,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as chamadas_atendidas,
    ROUND(
        (COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 
        0
    ) as taxa_atendimento_percent,
    AVG(EXTRACT(EPOCH FROM duration_formated::interval))::INTEGER as duracao_media_segundos
FROM calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY total_chamadas DESC
LIMIT 10;

-- 2. RANKING POR NOTA MÉDIA (verificar dados reais)
SELECT '2. RANKING POR NOTA MÉDIA - Dados reais do banco:' as info;
SELECT 
    c.agent_id,
    COUNT(ca.final_grade) as total_com_nota,
    COUNT(c.id) as total_chamadas,
    ROUND(AVG(ca.final_grade), 1) as nota_media,
    ROUND(
        (COUNT(ca.final_grade)::NUMERIC / COUNT(c.id)) * 100, 
        0
    ) as cobertura_analise_percent
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id AND ca.final_grade IS NOT NULL
WHERE c.agent_id IS NOT NULL
GROUP BY c.agent_id
HAVING COUNT(ca.final_grade) > 0  -- Apenas SDRs com pelo menos uma nota
ORDER BY nota_media DESC
LIMIT 10;

-- 3. Verificar dados específicos dos top SDRs mostrados na interface
SELECT '3. Verificação específica dos top SDRs:' as info;

-- Camila Ataliba
SELECT 
    'Camila Ataliba' as sdr,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
    COUNT(ca.final_grade) as calls_with_score,
    ROUND(AVG(ca.final_grade), 1) as avg_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id AND ca.final_grade IS NOT NULL
WHERE c.agent_id = 'Camila Ataliba'

UNION ALL

-- Mariana Costa
SELECT 
    'Mariana Costa' as sdr,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
    COUNT(ca.final_grade) as calls_with_score,
    ROUND(AVG(ca.final_grade), 1) as avg_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id AND ca.final_grade IS NOT NULL
WHERE c.agent_id = 'Mariana Costa'

UNION ALL

-- Lô-Ruama Oliveira
SELECT 
    'Lô-Ruama Oliveira' as sdr,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
    COUNT(ca.final_grade) as calls_with_score,
    ROUND(AVG(ca.final_grade), 1) as avg_score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id AND ca.final_grade IS NOT NULL
WHERE c.agent_id = 'Lô-Ruama Oliveira';

-- 4. Verificar se há inconsistências nos dados
SELECT '4. Verificação de inconsistências:' as info;
SELECT 
    'Ligações com scorecard mas sem call_analysis' as tipo,
    COUNT(*) as quantidade
FROM calls c
WHERE c.scorecard IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id)

UNION ALL

SELECT 
    'Ligações com call_analysis mas sem scorecard' as tipo,
    COUNT(*) as quantidade
FROM calls c
JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.scorecard IS NULL;

-- 5. Verificar função que o dashboard usa
SELECT '5. Testando função que o dashboard provavelmente usa:' as info;
SELECT * FROM get_unique_sdrs() ORDER BY call_count DESC LIMIT 5;
