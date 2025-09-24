-- 🔍 ANALISAR COMO RECUPERAR DATAS ORIGINAIS
-- Execute no Supabase SQL Editor - APENAS CONSULTAS

-- ===============================================================
-- 1. ANALISAR PADRÃO DO UPDATED_AT (PODE TER A DATA REAL)
-- ===============================================================

SELECT 
  'ANÁLISE UPDATED_AT COMO REFERÊNCIA' as info,
  EXTRACT(YEAR FROM updated_at) as ano_updated,
  EXTRACT(MONTH FROM updated_at) as mes_updated,
  to_char(updated_at, 'YYYY-MM') as ano_mes_updated,
  COUNT(*) as quantidade,
  MIN(updated_at) as primeiro_update,
  MAX(updated_at) as ultimo_update,
  -- Verificar se updated_at parece ser a data real
  COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2025 AND EXTRACT(MONTH FROM updated_at) = 9 THEN 1 END) as setembro_2025
FROM calls
WHERE updated_at IS NOT NULL
GROUP BY EXTRACT(YEAR FROM updated_at), EXTRACT(MONTH FROM updated_at), to_char(updated_at, 'YYYY-MM')
ORDER BY ano_updated, mes_updated;

-- ===============================================================
-- 2. VERIFICAR SE UPDATED_AT PODE SER USADO COMO CREATED_AT REAL
-- ===============================================================

SELECT 
  'UPDATED_AT COMO DATA REAL?' as info,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2025 THEN 1 END) as updated_em_2025,
  COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2024 THEN 1 END) as updated_em_2024,
  COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2025 AND EXTRACT(MONTH FROM updated_at) = 9 THEN 1 END) as updated_setembro_2025,
  -- Calcular se faz sentido usar updated_at como data real
  ROUND(COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2025 AND EXTRACT(MONTH FROM updated_at) = 9 THEN 1 END) * 100.0 / COUNT(*), 1) as pct_setembro_2025
FROM calls
WHERE updated_at IS NOT NULL;

-- ===============================================================
-- 3. SAMPLE PARA ENTENDER O PADRÃO
-- ===============================================================

SELECT 
  'SAMPLE PARA ANÁLISE' as info,
  id,
  created_at,
  updated_at,
  processed_at,
  agent_id,
  deal_id,
  -- Verificar se updated_at faz mais sentido como data da chamada
  CASE 
    WHEN EXTRACT(YEAR FROM created_at) = 2024 AND EXTRACT(YEAR FROM updated_at) = 2025 THEN 'UPDATED_PARECE_REAL'
    WHEN EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM updated_at) THEN 'DATAS_CONSISTENTES'
    ELSE 'PADRÃO_DIFERENTE'
  END as analise_datas,
  -- Diferença temporal
  updated_at - created_at as tempo_entre_create_update
FROM calls
WHERE updated_at IS NOT NULL
ORDER BY 
  CASE 
    WHEN EXTRACT(YEAR FROM created_at) = 2024 AND EXTRACT(YEAR FROM updated_at) = 2025 THEN 1
    ELSE 2
  END,
  created_at DESC
LIMIT 30;

-- ===============================================================
-- 4. VERIFICAR SE HÁ LÓGICA NAS DATAS DE SETEMBRO
-- ===============================================================

SELECT 
  'DISTRIBUIÇÃO SETEMBRO 2025 (VIA UPDATED_AT)' as info,
  DATE(updated_at) as data_update,
  COUNT(*) as chamadas_atualizadas_neste_dia,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2024 THEN 1 END) as originais_de_2024,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 THEN 1 END) as originais_de_2025,
  MIN(updated_at) as primeiro_update_do_dia,
  MAX(updated_at) as ultimo_update_do_dia
FROM calls
WHERE EXTRACT(YEAR FROM updated_at) = 2025 
  AND EXTRACT(MONTH FROM updated_at) = 9
GROUP BY DATE(updated_at)
ORDER BY data_update;

-- ===============================================================
-- 5. TESTE: SIMULAÇÃO DE CORREÇÃO (SEM EXECUTAR UPDATE)
-- ===============================================================

SELECT 
  'SIMULAÇÃO DE CORREÇÃO' as info,
  COUNT(*) as total_calls,
  -- Se usássemos updated_at como nova data
  COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2025 AND EXTRACT(MONTH FROM updated_at) = 9 THEN 1 END) as ficaria_setembro_2025,
  COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2025 AND EXTRACT(MONTH FROM updated_at) != 9 THEN 1 END) as ficaria_outros_meses_2025,
  COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2024 THEN 1 END) as ficaria_2024,
  -- Percentuais
  ROUND(COUNT(CASE WHEN EXTRACT(YEAR FROM updated_at) = 2025 AND EXTRACT(MONTH FROM updated_at) = 9 THEN 1 END) * 100.0 / COUNT(*), 1) as pct_setembro_2025
FROM calls
WHERE updated_at IS NOT NULL;

-- ===============================================================
-- 6. VERIFICAR TRIGGERS E FUNÇÕES QUE TOCAM EM UPDATED_AT
-- ===============================================================

-- Triggers na tabela calls
SELECT 
  'TRIGGERS TABELA CALLS' as tipo,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'calls'
  AND event_object_schema = 'public';

-- Funções que mencionam updated_at
SELECT 
  'FUNÇÕES COM UPDATED_AT' as tipo,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_definition ILIKE '%updated_at%NOW()%' THEN 'ATUALIZA UPDATED_AT'
    WHEN routine_definition ILIKE '%updated_at%' THEN 'MENCIONA UPDATED_AT'
    ELSE 'OUTROS'
  END as tipo_uso
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%updated_at%'
ORDER BY routine_name;

