-- 🔄 REVERTER ALTERAÇÃO DE DATAS - VOLTAR PARA 2025
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. VERIFICAR SITUAÇÃO ATUAL
-- ===============================================================

SELECT 
  'SITUAÇÃO ATUAL' as status,
  EXTRACT(YEAR FROM created_at) as ano,
  COUNT(*) as quantidade,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM calls
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY ano;

-- ===============================================================
-- 2. REVERTER: ADICIONAR 1 ANO EM TODAS AS DATAS
-- ===============================================================

DO $$
BEGIN
    -- Reverter a alteração: adicionar 1 ano de volta (2024 → 2025)
    UPDATE calls 
    SET 
        created_at = created_at + INTERVAL '1 year',
        updated_at = CASE 
            WHEN updated_at IS NOT NULL 
            THEN updated_at + INTERVAL '1 year'
            ELSE NULL 
        END,
        processed_at = CASE 
            WHEN processed_at IS NOT NULL 
            THEN processed_at + INTERVAL '1 year'
            ELSE NULL 
        END;
        
    RAISE NOTICE 'REVERSÃO CONCLUÍDA! Todas as datas voltaram para 2025';
END $$;

-- ===============================================================
-- 3. VERIFICAR RESULTADO DA REVERSÃO
-- ===============================================================

SELECT 
  'APÓS REVERSÃO' as status,
  EXTRACT(YEAR FROM created_at) as ano,
  EXTRACT(MONTH FROM created_at) as mes,
  to_char(created_at, 'YYYY-MM') as ano_mes,
  COUNT(*) as quantidade,
  MIN(created_at) as primeira,
  MAX(created_at) as ultima
FROM calls
GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), to_char(created_at, 'YYYY-MM')
ORDER BY ano, mes;

-- ===============================================================
-- 4. VERIFICAR PERÍODO SETEMBRO 2025 APÓS REVERSÃO
-- ===============================================================

SELECT 
  'SETEMBRO 2025 APÓS REVERSÃO' as info,
  DATE(created_at) as data,
  COUNT(*) as total_chamadas,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1) as taxa_atendimento
FROM calls 
WHERE EXTRACT(YEAR FROM created_at) = 2025 
  AND EXTRACT(MONTH FROM created_at) = 9
GROUP BY DATE(created_at)
ORDER BY data;

-- ===============================================================
-- 5. TOTAIS FINAIS
-- ===============================================================

SELECT 
  'TOTAIS APÓS REVERSÃO' as info,
  COUNT(*) as total_geral,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 THEN 1 END) as total_2025,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2024 THEN 1 END) as restantes_2024,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 9 THEN 1 END) as setembro_2025,
  COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 AND EXTRACT(MONTH FROM created_at) = 12 THEN 1 END) as dezembro_2025
FROM calls;

