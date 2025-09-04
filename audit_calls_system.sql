-- AUDITORIA COMPLETA DO SISTEMA DE CHAMADAS
-- Identificar problemas e oportunidades de melhoria

-- =====================================================
-- 1. ANÁLISE DE INCONSISTÊNCIAS DE ÁUDIO
-- =====================================================

SELECT 'AUDITORIA: Inconsistências de Áudio e Duração' as secao;

-- Chamadas com duração mas sem áudio
SELECT 
  COUNT(*) as chamadas_com_duracao_sem_audio,
  AVG(duration) as duracao_media_segundos,
  MIN(duration) as duracao_minima,
  MAX(duration) as duracao_maxima
FROM calls 
WHERE duration > 0 
  AND (recording_url IS NULL OR recording_url = '');

-- Chamadas com áudio mas sem duração
SELECT 
  COUNT(*) as chamadas_com_audio_sem_duracao
FROM calls 
WHERE (duration IS NULL OR duration = 0)
  AND (recording_url IS NOT NULL AND recording_url != '');

-- Inconsistências por SDR
SELECT 
  sdr_name,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN duration > 0 THEN 1 END) as com_duracao,
  COUNT(CASE WHEN recording_url IS NOT NULL AND recording_url != '' THEN 1 END) as com_recording_url,
  COUNT(CASE WHEN transcription IS NOT NULL AND transcription != '' THEN 1 END) as com_transcricao,
  ROUND(AVG(CASE WHEN duration > 0 THEN duration ELSE NULL END), 2) as duracao_media
FROM calls 
GROUP BY sdr_name
ORDER BY total_chamadas DESC
LIMIT 10;

-- =====================================================
-- 2. ANÁLISE DE QUALIDADE DOS DADOS
-- =====================================================

SELECT 'AUDITORIA: Qualidade dos Dados' as secao;

-- Campos obrigatórios em branco
SELECT 
  'person' as campo,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN person IS NULL OR person = '' THEN 1 END) as vazios,
  ROUND(COUNT(CASE WHEN person IS NULL OR person = '' THEN 1 END) * 100.0 / COUNT(*), 2) as percentual_vazio
FROM calls
UNION ALL
SELECT 
  'enterprise' as campo,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN enterprise IS NULL OR enterprise = '' THEN 1 END) as vazios,
  ROUND(COUNT(CASE WHEN enterprise IS NULL OR enterprise = '' THEN 1 END) * 100.0 / COUNT(*), 2) as percentual_vazio
FROM calls
UNION ALL
SELECT 
  'sdr_name' as campo,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN sdr_name IS NULL OR sdr_name = '' THEN 1 END) as vazios,
  ROUND(COUNT(CASE WHEN sdr_name IS NULL OR sdr_name = '' THEN 1 END) * 100.0 / COUNT(*), 2) as percentual_vazio
FROM calls;

-- =====================================================
-- 3. ANÁLISE DE PERFORMANCE DO SISTEMA
-- =====================================================

SELECT 'AUDITORIA: Performance e Volume' as secao;

-- Volume de chamadas por período
SELECT 
  DATE_TRUNC('month', created_at) as mes,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  COUNT(CASE WHEN transcription IS NOT NULL AND LENGTH(transcription) > 100 THEN 1 END) as com_transcricao_valida,
  AVG(duration) as duracao_media,
  COUNT(CASE WHEN duration > 300 THEN 1 END) as chamadas_longas
FROM calls 
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- =====================================================
-- 4. ANÁLISE DO SISTEMA DE SCORECARD
-- =====================================================

SELECT 'AUDITORIA: Sistema de Scorecard' as secao;

-- Status das análises
SELECT 
  COUNT(DISTINCT c.id) as total_chamadas_com_transcricao,
  COUNT(DISTINCT ca.call_id) as chamadas_analisadas,
  ROUND(COUNT(DISTINCT ca.call_id) * 100.0 / COUNT(DISTINCT c.id), 2) as percentual_analisado,
  AVG(ca.final_grade) as nota_media,
  MIN(ca.final_grade) as nota_minima,
  MAX(ca.final_grade) as nota_maxima
FROM calls c
LEFT JOIN call_analyses ca ON c.id = ca.call_id
WHERE c.transcription IS NOT NULL 
  AND LENGTH(c.transcription) > 100;

-- Performance por critério
SELECT 
  sc.name as criterio,
  COUNT(cac.id) as total_avaliacoes,
  AVG(cac.achieved_score) as score_medio,
  AVG(cac.percentage) as percentual_medio,
  MIN(cac.percentage) as percentual_minimo,
  MAX(cac.percentage) as percentual_maximo
FROM scorecard_criteria sc
LEFT JOIN call_analysis_criteria cac ON sc.id = cac.criterion_id
GROUP BY sc.id, sc.name, sc.order_index
ORDER BY sc.order_index;

-- =====================================================
-- 5. IDENTIFICAR OPORTUNIDADES DE MELHORIA
-- =====================================================

SELECT 'AUDITORIA: Oportunidades de Melhoria' as secao;

-- Chamadas que precisam ser analisadas
SELECT 
  'Chamadas prontas para análise' as oportunidade,
  COUNT(*) as quantidade
FROM calls c
LEFT JOIN call_analyses ca ON c.id = ca.call_id
WHERE c.transcription IS NOT NULL 
  AND LENGTH(c.transcription) > 100
  AND c.duration > 60
  AND ca.id IS NULL;

-- SDRs com muitas chamadas sem análise
SELECT 
  'Top SDRs sem análise' as oportunidade,
  c.sdr_name,
  COUNT(*) as chamadas_sem_analise
FROM calls c
LEFT JOIN call_analyses ca ON c.id = ca.call_id
WHERE c.transcription IS NOT NULL 
  AND LENGTH(c.transcription) > 100
  AND ca.id IS NULL
GROUP BY c.sdr_name
ORDER BY chamadas_sem_analise DESC
LIMIT 5;

-- =====================================================
-- 6. MÉTRICAS DE SISTEMA
-- =====================================================

SELECT 'AUDITORIA: Métricas do Sistema' as secao;

-- Estatísticas gerais
SELECT 
  'Total de chamadas' as metrica,
  COUNT(*)::text as valor
FROM calls
UNION ALL
SELECT 
  'Chamadas últimos 30 dias' as metrica,
  COUNT(*)::text as valor
FROM calls 
WHERE created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
  'Chamadas com transcrição' as metrica,
  COUNT(*)::text as valor
FROM calls 
WHERE transcription IS NOT NULL AND LENGTH(transcription) > 100
UNION ALL
SELECT 
  'Análises realizadas' as metrica,
  COUNT(*)::text as valor
FROM call_analyses
UNION ALL
SELECT 
  'Scorecard ativo' as metrica,
  name as valor
FROM scorecards 
WHERE active = true
LIMIT 1;

-- =====================================================
-- 7. RECOMENDAÇÕES AUTOMÁTICAS
-- =====================================================

SELECT 'RECOMENDAÇÕES AUTOMÁTICAS' as secao;

-- Verificar se há chamadas órfãs (sem SDR)
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'AÇÃO NECESSÁRIA: ' || COUNT(*) || ' chamadas sem SDR identificado'
    ELSE 'OK: Todas as chamadas têm SDR'
  END as recomendacao
FROM calls 
WHERE sdr_name IS NULL OR sdr_name = '';

-- Verificar integridade dos dados de áudio
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'AÇÃO NECESSÁRIA: ' || COUNT(*) || ' chamadas com duração mas sem áudio'
    ELSE 'OK: Consistência entre duração e áudio'
  END as recomendacao
FROM calls 
WHERE duration > 60 
  AND (recording_url IS NULL OR recording_url = '');

-- Verificar se há análises pendentes
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'OPORTUNIDADE: ' || COUNT(*) || ' chamadas prontas para análise automática'
    ELSE 'OK: Todas as chamadas elegíveis foram analisadas'
  END as recomendacao
FROM calls c
LEFT JOIN call_analyses ca ON c.id = ca.call_id
WHERE c.transcription IS NOT NULL 
  AND LENGTH(c.transcription) > 100
  AND c.duration > 60
  AND ca.id IS NULL;
