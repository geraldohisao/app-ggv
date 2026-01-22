-- Prevenir duplicados futuros com constraints de unicidade parciais
-- Este script PRIMEIRO limpa duplicados existentes, DEPOIS cria os índices
-- Execute este script no Supabase SQL Editor

-- ============================================
-- PASSO 1: LIMPAR DUPLICADOS EXISTENTES
-- ============================================

-- 1.1 Limpar duplicados em KEY_RESULTS (mantém o mais recente)
WITH kr_ranked AS (
  SELECT 
    id,
    row_number() OVER (
      PARTITION BY okr_id, lower(trim(title))
      ORDER BY updated_at DESC NULLS LAST, id ASC
    ) AS rn
  FROM key_results
  WHERE title IS NOT NULL
)
DELETE FROM key_results
WHERE id IN (SELECT id FROM kr_ranked WHERE rn > 1);

-- 1.2 Limpar duplicados em SPRINT_ITEMS (mantém o mais recente)
WITH si_ranked AS (
  SELECT 
    id,
    row_number() OVER (
      PARTITION BY sprint_id, type, lower(trim(title))
      ORDER BY updated_at DESC NULLS LAST, id ASC
    ) AS rn
  FROM sprint_items
  WHERE title IS NOT NULL
)
DELETE FROM sprint_items
WHERE id IN (SELECT id FROM si_ranked WHERE rn > 1);

-- 1.3 Limpar duplicados em OKRS (mantém o mais recente)
WITH okr_ranked AS (
  SELECT 
    id,
    row_number() OVER (
      PARTITION BY user_id, lower(trim(objective)), start_date, end_date
      ORDER BY updated_at DESC NULLS LAST, id ASC
    ) AS rn
  FROM okrs
  WHERE objective IS NOT NULL
)
DELETE FROM okrs
WHERE id IN (SELECT id FROM okr_ranked WHERE rn > 1);

-- ============================================
-- PASSO 2: CRIAR ÍNDICES ÚNICOS
-- ============================================

-- 2.1 CONSTRAINT PARA KEY_RESULTS
DROP INDEX IF EXISTS key_results_unique_title_per_okr;
CREATE UNIQUE INDEX key_results_unique_title_per_okr 
ON key_results (okr_id, lower(trim(title)))
WHERE title IS NOT NULL;

-- 2.2 CONSTRAINT PARA SPRINT_ITEMS  
DROP INDEX IF EXISTS sprint_items_unique_title_per_sprint;
CREATE UNIQUE INDEX sprint_items_unique_title_per_sprint 
ON sprint_items (sprint_id, type, lower(trim(title)))
WHERE title IS NOT NULL;

-- 2.3 CONSTRAINT PARA OKRS
DROP INDEX IF EXISTS okrs_unique_objective_per_period;
CREATE UNIQUE INDEX okrs_unique_objective_per_period 
ON okrs (user_id, lower(trim(objective)), start_date, end_date)
WHERE objective IS NOT NULL;

-- 2.4 CONSTRAINT PARA KR_CHECKINS (REMOVIDO)
-- Nota: Não é possível criar índice único com date_trunc ou cast pois não são IMMUTABLE
-- A lógica de negócio no frontend/backend já previne checkins duplicados no mesmo dia

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('key_results', 'sprint_items', 'okrs', 'kr_checkins')
  AND indexname LIKE '%unique%'
ORDER BY tablename, indexname;
