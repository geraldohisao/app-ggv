-- 🔍 VERIFICAR CONFIABILIDADE DO RANKING DE NOTAS
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. VERIFICAR SE A FUNÇÃO get_sdr_metrics_with_analysis EXISTE
-- ===============================================================

SELECT 
  'FUNÇÕES RELACIONADAS A NOTAS' as info,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_definition ILIKE '%final_grade%' THEN 'USA FINAL_GRADE'
    WHEN routine_definition ILIKE '%avg_score%' THEN 'USA AVG_SCORE'
    ELSE 'OUTROS'
  END as tipo_nota
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name ILIKE '%sdr%' AND routine_name ILIKE '%score%')
ORDER BY routine_name;

-- ===============================================================
-- 2. VERIFICAR ANÁLISES POR SDR (DADOS REAIS)
-- ===============================================================

SELECT 
  'ANÁLISES POR SDR (DADOS REAIS)' as info,
  c.agent_id as sdr,
  COUNT(c.id) as total_calls,
  COUNT(ca.id) as calls_com_analise,
  COUNT(CASE WHEN ca.final_grade IS NOT NULL AND ca.final_grade > 0 THEN 1 END) as calls_com_nota_valida,
  AVG(ca.final_grade) FILTER (WHERE ca.final_grade IS NOT NULL AND ca.final_grade > 0) as media_nota_real,
  ROUND(AVG(ca.final_grade) FILTER (WHERE ca.final_grade IS NOT NULL AND ca.final_grade > 0), 1) as media_nota_formatada,
  MIN(ca.final_grade) FILTER (WHERE ca.final_grade IS NOT NULL AND ca.final_grade > 0) as nota_minima,
  MAX(ca.final_grade) FILTER (WHERE ca.final_grade IS NOT NULL AND ca.final_grade > 0) as nota_maxima
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.created_at >= NOW() - INTERVAL '90 days'  -- Últimos 90 dias
GROUP BY c.agent_id
HAVING COUNT(c.id) > 10  -- Só SDRs com mais de 10 calls
ORDER BY calls_com_nota_valida DESC, media_nota_real DESC;

-- ===============================================================
-- 3. COMPARAR COM A FUNÇÃO ATUAL (SE EXISTIR)
-- ===============================================================

SELECT 
  'TESTE get_sdr_metrics_with_analysis' as info,
  sdr_name,
  total_calls,
  answered_calls,
  avg_score as nota_da_funcao,
  CASE 
    WHEN avg_score >= 8 THEN 'EXCELENTE'
    WHEN avg_score >= 7 THEN 'BOM'
    WHEN avg_score >= 6 THEN 'REGULAR'
    WHEN avg_score >= 5 THEN 'PRECISA MELHORAR'
    ELSE 'INSUFICIENTE'
  END as classificacao
FROM get_sdr_metrics_with_analysis(90)
WHERE avg_score IS NOT NULL AND avg_score > 0
ORDER BY avg_score DESC;

-- ===============================================================
-- 4. VERIFICAR DISTRIBUIÇÃO DE NOTAS GERAL
-- ===============================================================

SELECT 
  'DISTRIBUIÇÃO GERAL DE NOTAS' as info,
  COUNT(*) as total_analises,
  COUNT(CASE WHEN final_grade IS NOT NULL THEN 1 END) as com_final_grade,
  COUNT(CASE WHEN final_grade > 0 THEN 1 END) as com_nota_positiva,
  AVG(final_grade) FILTER (WHERE final_grade > 0) as media_geral,
  MIN(final_grade) FILTER (WHERE final_grade > 0) as nota_minima,
  MAX(final_grade) FILTER (WHERE final_grade > 0) as nota_maxima,
  -- Distribuição por faixas
  COUNT(CASE WHEN final_grade >= 8 THEN 1 END) as excelente_8_10,
  COUNT(CASE WHEN final_grade >= 6 AND final_grade < 8 THEN 1 END) as bom_6_8,
  COUNT(CASE WHEN final_grade >= 4 AND final_grade < 6 THEN 1 END) as regular_4_6,
  COUNT(CASE WHEN final_grade < 4 THEN 1 END) as ruim_0_4
FROM call_analysis
WHERE created_at >= NOW() - INTERVAL '90 days';

-- ===============================================================
-- 5. VERIFICAR SE HÁ DISCREPÂNCIA ENTRE FONTES
-- ===============================================================

WITH sdr_real AS (
  SELECT 
    c.agent_id as sdr,
    COUNT(ca.id) as analises_reais,
    AVG(ca.final_grade) FILTER (WHERE ca.final_grade > 0) as media_real
  FROM calls c
  LEFT JOIN call_analysis ca ON ca.call_id = c.id
  WHERE c.created_at >= NOW() - INTERVAL '90 days'
    AND ca.final_grade IS NOT NULL 
    AND ca.final_grade > 0
  GROUP BY c.agent_id
),
sdr_funcao AS (
  SELECT 
    sdr_name as sdr,
    avg_score as media_funcao
  FROM get_sdr_metrics_with_analysis(90)
  WHERE avg_score IS NOT NULL AND avg_score > 0
)
SELECT 
  'COMPARAÇÃO REAL vs FUNÇÃO' as info,
  COALESCE(sr.sdr, sf.sdr) as sdr,
  sr.analises_reais,
  ROUND(sr.media_real, 1) as media_real,
  ROUND(sf.media_funcao, 1) as media_funcao,
  CASE 
    WHEN ABS(COALESCE(sr.media_real, 0) - COALESCE(sf.media_funcao, 0)) < 0.1 THEN '✅ CONSISTENTE'
    ELSE '❌ DISCREPANTE'
  END as status
FROM sdr_real sr
FULL OUTER JOIN sdr_funcao sf ON sr.sdr = sf.sdr
WHERE COALESCE(sr.analises_reais, 0) > 0 OR COALESCE(sf.media_funcao, 0) > 0
ORDER BY COALESCE(sr.analises_reais, 0) DESC;

