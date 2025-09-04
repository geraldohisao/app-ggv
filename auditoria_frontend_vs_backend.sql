-- AUDITORIA COMPLETA: FRONTEND vs BACKEND
-- Verificar se todas as chamadas da tabela estão chegando no frontend

-- =====================================================
-- 1. CONTAGEM TOTAL POR FONTE
-- =====================================================

SELECT 'CONTAGEM TOTAL POR FONTE:' as secao;

-- Contagem direta da tabela
SELECT 
  'Tabela calls (direto)' as origem,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN agent_id IS NOT NULL THEN 1 END) as com_agent_id,
  COUNT(CASE WHEN agent_id IS NULL THEN 1 END) as sem_agent_id,
  MIN(created_at) as chamada_mais_antiga,
  MAX(created_at) as chamada_mais_recente
FROM calls;

-- Contagem via função RPC
SELECT 
  'Função get_calls_with_filters' as origem,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN agent_id IS NOT NULL THEN 1 END) as com_agent_id,
  COUNT(CASE WHEN agent_id IS NULL THEN 1 END) as sem_agent_id,
  MIN(created_at) as chamada_mais_antiga,
  MAX(created_at) as chamada_mais_recente
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);

-- =====================================================
-- 2. VERIFICAR FILTROS IMPLÍCITOS
-- =====================================================

SELECT 'VERIFICANDO FILTROS IMPLÍCITOS:' as secao;

-- Chamadas que podem estar sendo filtradas
SELECT 
  'Sem agent_id' as possivel_filtro,
  COUNT(*) as quantidade,
  ARRAY_AGG(DISTINCT sdr_name) as sdr_names_encontrados,
  ARRAY_AGG(DISTINCT call_type) as call_types_encontrados
FROM calls 
WHERE agent_id IS NULL;

SELECT 
  'Sem sdr_email' as possivel_filtro,
  COUNT(*) as quantidade
FROM calls 
WHERE sdr_email IS NULL OR sdr_email = '';

-- =====================================================
-- 3. ANÁLISE POR PERÍODO
-- =====================================================

SELECT 'ANÁLISE POR PERÍODO:' as secao;

-- Últimos 7 dias (versão corrigida)
SELECT 
  DATE(created_at) as data,
  COUNT(*) as total_tabela
FROM calls
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- =====================================================
-- 4. VERIFICAR DADOS ESPECÍFICOS
-- =====================================================

SELECT 'VERIFICANDO DADOS ESPECÍFICOS:' as secao;

-- Chamadas com dados completos vs incompletos
SELECT 
  'Dados completos' as tipo,
  COUNT(*) as quantidade
FROM calls 
WHERE enterprise IS NOT NULL 
  AND person IS NOT NULL 
  AND agent_id IS NOT NULL
  AND duration_formated IS NOT NULL
  AND duration_formated != '00:00:00';

SELECT 
  'Dados incompletos' as tipo,
  COUNT(*) as quantidade
FROM calls 
WHERE enterprise IS NULL 
  OR person IS NULL 
  OR agent_id IS NULL
  OR duration_formated IS NULL
  OR duration_formated = '00:00:00';

-- =====================================================
-- 5. TESTAR FUNÇÃO COM DIFERENTES PARÂMETROS
-- =====================================================

SELECT 'TESTANDO FUNÇÃO COM PARÂMETROS:' as secao;

-- Teste sem filtros
SELECT 
  'Sem filtros' as teste,
  COUNT(*) as resultado
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);

-- Teste com SDR específico
SELECT 
  'SDR: Andressa' as teste,
  COUNT(*) as resultado
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0)
WHERE agent_id = 'Andressa';

-- Teste com call_type específico
SELECT 
  'Call Type: Lead (Qualificação)' as teste,
  COUNT(*) as resultado
FROM get_calls_with_filters(NULL, 'Lead (Qualificação)', NULL, NULL, NULL, 1000, 0);

-- =====================================================
-- 6. IDENTIFICAR CHAMADAS PERDIDAS
-- =====================================================

SELECT 'CHAMADAS QUE PODEM ESTAR PERDIDAS:' as secao;

-- IDs que estão na tabela mas não na função
WITH tabela_ids AS (
  SELECT id FROM calls ORDER BY created_at DESC LIMIT 100
),
funcao_ids AS (
  SELECT id FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0)
)
SELECT 
  'IDs na tabela mas não na função' as problema,
  COUNT(*) as quantidade
FROM tabela_ids t
LEFT JOIN funcao_ids f ON t.id = f.id
WHERE f.id IS NULL;

-- =====================================================
-- 7. RECOMENDAÇÕES
-- =====================================================

SELECT 'RECOMENDAÇÕES:' as secao;

SELECT 
  CASE 
    WHEN COUNT(*) = (SELECT COUNT(*) FROM calls) THEN 
      'OK: Todas as chamadas estão sendo retornadas pela função'
    ELSE 
      'PROBLEMA: ' || ((SELECT COUNT(*) FROM calls) - COUNT(*))::TEXT || ' chamadas não estão sendo retornadas'
  END as recomendacao
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);

SELECT 'Auditoria completa concluída!' as resultado;
