-- 🔄 MARCAR: Ligações com nota zero para reprocessamento
-- Marca ligações com erro de análise para reprocessamento em massa

-- 1. Marcar ligações com nota zero e feedback de erro para reprocessamento
UPDATE call_analysis 
SET 
    final_grade = -1,  -- Marcar como erro de análise (não impacta médias)
    updated_at = NOW()
WHERE final_grade = 0
AND (
    general_feedback ILIKE '%análise automática indisponível%'
    OR general_feedback ILIKE '%erro%'
    OR general_feedback ILIKE '%falha%'
    OR general_feedback ILIKE '%configurar chave%'
    OR general_feedback ILIKE '%modelo de ia%'
    OR strengths::text ILIKE '%Chamada realizada com sucesso%'
    OR improvements::text ILIKE '%Configurar chave da API Gemini%'
    OR improvements::text ILIKE '%Revisar configuração do modelo%'
);

-- 2. Verificar quantas ligações foram marcadas
SELECT 'Ligações marcadas para reprocessamento:' as info;
SELECT 
    COUNT(*) as total_marcadas,
    COUNT(CASE WHEN final_grade = -1 THEN 1 END) as com_nota_erro,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as ainda_com_zero
FROM call_analysis 
WHERE updated_at >= NOW() - INTERVAL '1 minute';

-- 3. Verificar ligações que ainda têm nota zero (não foram marcadas)
SELECT 'Ligações que ainda têm nota zero (não foram marcadas):' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = 0
ORDER BY ca.created_at DESC;

-- 4. Verificar ligações com nota -1 (marcadas para reprocessamento)
SELECT 'Ligações com nota -1 (marcadas para reprocessamento):' as info;
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.confidence,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = -1
ORDER BY ca.created_at DESC;

-- 5. Estatísticas finais
SELECT 'Estatísticas finais:' as info;
SELECT 
    COUNT(CASE WHEN final_grade = -1 THEN 1 END) as ligacoes_para_reprocessar,
    COUNT(CASE WHEN final_grade = 0 THEN 1 END) as ligacoes_com_nota_zero,
    COUNT(CASE WHEN final_grade > 0 THEN 1 END) as ligacoes_com_nota_valida,
    COUNT(*) as total_analises
FROM call_analysis;

-- 6. Verificar se há ligações que precisam ser adicionadas à fila de reprocessamento
SELECT 'Ligações que precisam ser adicionadas à fila de reprocessamento:' as info;

-- Buscar ligações com nota -1 que não estão na fila
SELECT 
    ca.call_id,
    ca.id as analysis_id,
    ca.created_at as analysis_created_at
FROM call_analysis ca
WHERE ca.final_grade = -1
AND NOT EXISTS (
    SELECT 1 FROM analysis_queue aq 
    WHERE aq.call_id = ca.call_id 
    AND aq.status IN ('pending', 'processing')
);

-- 7. Adicionar ligações à fila de reprocessamento (se necessário)
INSERT INTO analysis_queue (call_id, status, created_at)
SELECT 
    ca.call_id,
    'pending',
    NOW()
FROM call_analysis ca
WHERE ca.final_grade = -1
AND NOT EXISTS (
    SELECT 1 FROM analysis_queue aq 
    WHERE aq.call_id = ca.call_id 
    AND aq.status IN ('pending', 'processing')
);

-- 8. Verificar fila de reprocessamento
SELECT 'Fila de reprocessamento:' as info;
SELECT 
    COUNT(*) as total_na_fila,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as concluidas,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as falharam
FROM analysis_queue;
