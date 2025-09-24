-- 📊 VERIFICAR CHAMADAS DO PERÍODO 17/09/2025 A 23/09/2025
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. TOTAL DE CHAMADAS NO PERÍODO
-- ===============================================================

SELECT 
  'TOTAL NO PERÍODO 17/09 a 23/09' as info,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as total_atendidas,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*))
      ELSE 0 
    END, 1
  ) as taxa_atendimento_pct
FROM calls 
WHERE created_at >= '2025-09-17 00:00:00'::timestamptz
  AND created_at <= '2025-09-23 23:59:59'::timestamptz;

-- ===============================================================
-- 2. BREAKDOWN POR DIA
-- ===============================================================

SELECT 
  to_char(created_at, 'YYYY-MM-DD') as data,
  to_char(created_at, 'DD/MM (Day)') as data_amigavel,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  COUNT(CASE WHEN status_voip != 'normal_clearing' OR status_voip IS NULL THEN 1 END) as nao_atendidas,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*))
      ELSE 0 
    END, 1
  ) as taxa_atendimento_pct
FROM calls 
WHERE created_at >= '2025-09-17 00:00:00'::timestamptz
  AND created_at <= '2025-09-23 23:59:59'::timestamptz
GROUP BY to_char(created_at, 'YYYY-MM-DD'), to_char(created_at, 'DD/MM (Day)')
ORDER BY data;

-- ===============================================================
-- 3. BREAKDOWN POR SDR NO PERÍODO
-- ===============================================================

SELECT 
  agent_id as sdr_nome,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  COUNT(CASE WHEN status_voip != 'normal_clearing' OR status_voip IS NULL THEN 1 END) as nao_atendidas,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*))
      ELSE 0 
    END, 1
  ) as taxa_atendimento_pct
FROM calls 
WHERE created_at >= '2025-09-17 00:00:00'::timestamptz
  AND created_at <= '2025-09-23 23:59:59'::timestamptz
GROUP BY agent_id
ORDER BY total_chamadas DESC;

-- ===============================================================
-- 4. VERIFICAR STATUS VOIP NO PERÍODO
-- ===============================================================

SELECT 
  status_voip,
  CASE status_voip
    WHEN 'normal_clearing' THEN 'Atendida'
    WHEN 'no_answer' THEN 'Não atendida'
    WHEN 'originator_cancel' THEN 'Cancelada pela SDR'
    WHEN 'number_changed' THEN 'Numero mudou'
    WHEN 'recovery_on_timer_expire' THEN 'Tempo esgotado'
    WHEN 'unallocated_number' THEN 'Número não encontrado'
    ELSE COALESCE(status_voip, 'Status desconhecido')
  END as status_amigavel,
  COUNT(*) as quantidade,
  ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls WHERE created_at >= '2025-09-17 00:00:00'::timestamptz AND created_at <= '2025-09-23 23:59:59'::timestamptz)), 1) as percentual
FROM calls 
WHERE created_at >= '2025-09-17 00:00:00'::timestamptz
  AND created_at <= '2025-09-23 23:59:59'::timestamptz
GROUP BY status_voip
ORDER BY quantidade DESC;

-- ===============================================================
-- 5. COMPARAÇÃO COM TOTAIS GERAIS
-- ===============================================================

SELECT 
  'COMPARAÇÃO GERAL' as info,
  (SELECT COUNT(*) FROM calls) as total_geral_historico,
  (SELECT COUNT(*) FROM calls WHERE created_at >= '2025-09-17 00:00:00'::timestamptz AND created_at <= '2025-09-23 23:59:59'::timestamptz) as total_periodo_17_23,
  ROUND(
    (SELECT COUNT(*) FROM calls WHERE created_at >= '2025-09-17 00:00:00'::timestamptz AND created_at <= '2025-09-23 23:59:59'::timestamptz) * 100.0 / 
    (SELECT COUNT(*) FROM calls), 1
  ) as percentual_do_historico;

