-- 🔍 VERIFICAR SE A CORREÇÃO DE DATAS FUNCIONOU
-- Execute no Supabase SQL Editor

-- Verificar distribuição atual de datas
SELECT 
  'DISTRIBUIÇÃO ATUAL' as status,
  EXTRACT(YEAR FROM created_at) as ano,
  EXTRACT(MONTH FROM created_at) as mes,
  CASE EXTRACT(MONTH FROM created_at)
    WHEN 9 THEN 'Setembro'
    WHEN 10 THEN 'Outubro'
    WHEN 11 THEN 'Novembro'
    WHEN 12 THEN 'Dezembro'
    ELSE 'Outro'
  END as mes_nome,
  COUNT(*) as quantidade,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM calls
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
ORDER BY ano, mes;

-- Verificar se setembro tem dados desde o início do mês
SELECT 
  'SETEMBRO 2025 POR DIA' as info,
  DATE(created_at) as data,
  COUNT(*) as chamadas_no_dia
FROM calls 
WHERE EXTRACT(YEAR FROM created_at) = 2025 
  AND EXTRACT(MONTH FROM created_at) = 9
GROUP BY DATE(created_at)
ORDER BY data;

