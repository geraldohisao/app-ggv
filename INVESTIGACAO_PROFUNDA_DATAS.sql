-- 🕵️ INVESTIGAÇÃO PROFUNDA DAS DATAS - APENAS CONSULTAS
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. ANÁLISE DETALHADA DOS PADRÕES DE DATA
-- ===============================================================

SELECT 
  'PADRÕES CREATED_AT vs UPDATED_AT' as info,
  DATE(created_at) as data_created,
  DATE(updated_at) as data_updated,
  COUNT(*) as quantidade,
  COUNT(CASE WHEN DATE(created_at) = DATE(updated_at) THEN 1 END) as datas_iguais,
  COUNT(CASE WHEN DATE(created_at) != DATE(updated_at) THEN 1 END) as datas_diferentes,
  MIN(created_at) as primeiro_created,
  MAX(created_at) as ultimo_created,
  MIN(updated_at) as primeiro_updated,
  MAX(updated_at) as ultimo_updated
FROM calls
GROUP BY DATE(created_at), DATE(updated_at)
ORDER BY quantidade DESC;

-- ===============================================================
-- 2. VERIFICAR SE HÁ UM DIA ESPECÍFICO PROBLEMÁTICO
-- ===============================================================

SELECT 
  'ANÁLISE 03/12/2024' as info,
  DATE(created_at) = '2024-12-03' as eh_03_dezembro_2024,
  COUNT(*) as quantidade,
  COUNT(DISTINCT DATE(updated_at)) as diferentes_datas_updated,
  string_agg(DISTINCT DATE(updated_at)::text, ', ') as datas_updated_encontradas,
  MIN(updated_at) as primeiro_update,
  MAX(updated_at) as ultimo_update
FROM calls
GROUP BY DATE(created_at) = '2024-12-03'
ORDER BY eh_03_dezembro_2024 DESC;

-- ===============================================================
-- 3. INVESTIGAR HORÁRIOS DAS CHAMADAS DE 2024-12-03
-- ===============================================================

SELECT 
  'HORÁRIOS 03/12/2024' as info,
  EXTRACT(HOUR FROM created_at) as hora_created,
  COUNT(*) as quantidade_nessa_hora,
  COUNT(DISTINCT EXTRACT(MINUTE FROM created_at)) as diferentes_minutos,
  MIN(created_at) as primeiro_da_hora,
  MAX(created_at) as ultimo_da_hora,
  -- Verificar se são sequenciais (indício de import em lote)
  MAX(created_at) - MIN(created_at) as duracao_da_hora
FROM calls
WHERE DATE(created_at) = '2024-12-03'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hora_created;

-- ===============================================================
-- 4. ANALISAR DIFERENÇA TEMPORAL ENTRE CREATED E UPDATED
-- ===============================================================

SELECT 
  'DIFERENÇA TEMPORAL CREATED->UPDATED' as info,
  CASE 
    WHEN updated_at - created_at < INTERVAL '1 hour' THEN 'Menos de 1 hora'
    WHEN updated_at - created_at < INTERVAL '1 day' THEN '1-24 horas'
    WHEN updated_at - created_at < INTERVAL '7 days' THEN '1-7 dias'
    WHEN updated_at - created_at < INTERVAL '30 days' THEN '1-30 dias'
    WHEN updated_at - created_at < INTERVAL '365 days' THEN '1-12 meses'
    ELSE 'Mais de 1 ano'
  END as categoria_diferenca,
  COUNT(*) as quantidade,
  AVG(updated_at - created_at) as diferenca_media,
  MIN(updated_at - created_at) as diferenca_minima,
  MAX(updated_at - created_at) as diferenca_maxima
FROM calls
WHERE updated_at IS NOT NULL AND created_at IS NOT NULL
GROUP BY CASE 
    WHEN updated_at - created_at < INTERVAL '1 hour' THEN 'Menos de 1 hora'
    WHEN updated_at - created_at < INTERVAL '1 day' THEN '1-24 horas'
    WHEN updated_at - created_at < INTERVAL '7 days' THEN '1-7 dias'
    WHEN updated_at - created_at < INTERVAL '30 days' THEN '1-30 dias'
    WHEN updated_at - created_at < INTERVAL '365 days' THEN '1-12 meses'
    ELSE 'Mais de 1 ano'
  END
ORDER BY COUNT(*) DESC;

-- ===============================================================
-- 5. VERIFICAR PROVIDER_CALL_ID PARA ENTENDER ORIGEM
-- ===============================================================

SELECT 
  'ANÁLISE PROVIDER_CALL_ID' as info,
  LEFT(provider_call_id, 10) as prefixo_provider_id,
  DATE(created_at) as data_created,
  COUNT(*) as quantidade,
  COUNT(DISTINCT agent_id) as diferentes_sdrs,
  MIN(created_at) as primeiro,
  MAX(created_at) as ultimo
FROM calls
WHERE provider_call_id IS NOT NULL
GROUP BY LEFT(provider_call_id, 10), DATE(created_at)
HAVING COUNT(*) > 5  -- Só grupos com mais de 5 calls
ORDER BY data_created, quantidade DESC;

-- ===============================================================
-- 6. VERIFICAR CAMPOS ESPECÍFICOS DAS CHAMADAS DE 2024-12-03
-- ===============================================================

SELECT 
  'SAMPLE DETALHADO 2024-12-03' as info,
  id,
  provider_call_id,
  created_at,
  updated_at,
  agent_id,
  status,
  status_voip,
  duration,
  call_type,
  direction,
  -- Calcular diferença
  updated_at - created_at as diferenca_tempo,
  -- Verificar se tem dados nas outras colunas
  CASE WHEN transcription IS NOT NULL THEN 'TEM' ELSE 'SEM' END as tem_transcricao,
  CASE WHEN recording_url IS NOT NULL THEN 'TEM' ELSE 'SEM' END as tem_audio,
  CASE WHEN deal_id IS NOT NULL THEN 'TEM' ELSE 'SEM' END as tem_deal_id
FROM calls
WHERE DATE(created_at) = '2024-12-03'
ORDER BY created_at
LIMIT 20;

-- ===============================================================
-- 7. COMPARAR CHAMADAS 2024 vs 2025 - ESTRUTURA DOS DADOS
-- ===============================================================

SELECT 
  'COMPARAÇÃO ESTRUTURAL 2024 vs 2025' as comparacao,
  EXTRACT(YEAR FROM created_at) as ano,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN transcription IS NOT NULL THEN 1 END) as com_transcricao,
  COUNT(CASE WHEN recording_url IS NOT NULL THEN 1 END) as com_audio,
  COUNT(CASE WHEN deal_id IS NOT NULL THEN 1 END) as com_deal_id,
  COUNT(CASE WHEN status_voip IS NOT NULL THEN 1 END) as com_status_voip,
  COUNT(CASE WHEN duration > 0 THEN 1 END) as com_duracao,
  COUNT(DISTINCT agent_id) as diferentes_sdrs,
  -- Percentuais
  ROUND(COUNT(CASE WHEN transcription IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as pct_transcricao,
  ROUND(COUNT(CASE WHEN recording_url IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as pct_audio,
  ROUND(COUNT(CASE WHEN deal_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as pct_deal_id
FROM calls
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY ano;

-- ===============================================================
-- 8. VERIFICAR SE EXISTE ALGUMA LÓGICA NO UPDATED_AT
-- ===============================================================

SELECT 
  'ANÁLISE UPDATED_AT SETEMBRO 2025' as info,
  DATE(updated_at) as data_updated,
  COUNT(*) as quantidade_updates,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2024 THEN 1 END) as updates_de_dados_2024,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 THEN 1 END) as updates_de_dados_2025,
  MIN(updated_at) as primeiro_update_do_dia,
  MAX(updated_at) as ultimo_update_do_dia,
  -- Verificar se foram em lote
  COUNT(DISTINCT EXTRACT(HOUR FROM updated_at)) as diferentes_horas_update
FROM calls
WHERE EXTRACT(YEAR FROM updated_at) = 2025 AND EXTRACT(MONTH FROM updated_at) = 9
GROUP BY DATE(updated_at)
ORDER BY data_updated;
