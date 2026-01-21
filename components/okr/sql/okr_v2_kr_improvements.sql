-- ============================================
-- MELHORIAS NO MODELO DE KEY RESULTS
-- ============================================
-- Adiciona suporte para:
-- - Diferentes tipos (numeric, percentage, currency, activity)
-- - Direção (increase, decrease)
-- - Valor inicial para metas "de X para Y"
-- - Atividades binárias (feito/não feito)
-- ============================================

-- 1. Adicionar novas colunas em key_results
ALTER TABLE key_results 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'numeric' 
    CHECK (type IN ('numeric', 'percentage', 'currency', 'activity'));

ALTER TABLE key_results 
  ADD COLUMN IF NOT EXISTS direction TEXT 
    CHECK (direction IN ('increase', 'decrease', NULL));

ALTER TABLE key_results 
  ADD COLUMN IF NOT EXISTS start_value NUMERIC;

ALTER TABLE key_results 
  ADD COLUMN IF NOT EXISTS activity_done BOOLEAN DEFAULT FALSE;

-- 2. Comentários para documentação
COMMENT ON COLUMN key_results.type IS 'Tipo do KR: numeric (quantidade), percentage (%), currency (R$), activity (atividade binária)';
COMMENT ON COLUMN key_results.direction IS 'Direção: increase (mais é melhor) ou decrease (menos é melhor)';
COMMENT ON COLUMN key_results.start_value IS 'Valor inicial para metas "de X para Y" (opcional)';
COMMENT ON COLUMN key_results.activity_done IS 'Para type=activity: true=concluído, false=pendente';

-- 3. Atualizar KRs existentes para ter tipo padrão
UPDATE key_results 
SET type = 'numeric' 
WHERE type IS NULL;

-- 4. Função para calcular progresso (PostgreSQL)
CREATE OR REPLACE FUNCTION calculate_kr_progress(
  kr_type TEXT,
  kr_direction TEXT,
  start_val NUMERIC,
  current_val NUMERIC,
  target_val NUMERIC,
  is_activity_done BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  progress INTEGER;
BEGIN
  -- Atividade: 0 ou 100
  IF kr_type = 'activity' THEN
    RETURN CASE WHEN is_activity_done THEN 100 ELSE 0 END;
  END IF;

  -- Valores padrão
  start_val := COALESCE(start_val, 0);
  current_val := COALESCE(current_val, 0);
  target_val := COALESCE(target_val, 0);

  -- Sem direção: lógica antiga (simples)
  IF kr_direction IS NULL THEN
    IF target_val = 0 THEN RETURN 0; END IF;
    progress := LEAST(ROUND((current_val / target_val) * 100), 100);
    RETURN GREATEST(0, progress);
  END IF;

  -- Aumentar (increase)
  IF kr_direction = 'increase' THEN
    IF target_val = start_val THEN
      RETURN CASE WHEN current_val >= target_val THEN 100 ELSE 0 END;
    END IF;
    progress := ROUND(((current_val - start_val) / (target_val - start_val)) * 100);
    RETURN GREATEST(0, LEAST(100, progress));
  END IF;

  -- Diminuir (decrease)
  IF kr_direction = 'decrease' THEN
    IF start_val = target_val THEN
      RETURN CASE WHEN current_val <= target_val THEN 100 ELSE 0 END;
    END IF;
    progress := ROUND(((start_val - current_val) / (start_val - target_val)) * 100);
    RETURN GREATEST(0, LEAST(100, progress));
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_kr_progress IS 'Calcula progresso de KR considerando tipo e direção';

-- 5. View atualizada com progresso calculado
CREATE OR REPLACE VIEW key_results_with_progress AS
SELECT 
  kr.*,
  calculate_kr_progress(
    kr.type,
    kr.direction,
    kr.start_value,
    kr.current_value,
    kr.target_value,
    kr.activity_done
  ) AS progress
FROM key_results kr;

COMMENT ON VIEW key_results_with_progress IS 'Key Results com progresso calculado automaticamente';

-- 6. Atualizar função de progresso do OKR para usar a nova view
CREATE OR REPLACE FUNCTION calculate_okr_progress(okr_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_krs INTEGER;
  avg_progress NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_krs
  FROM key_results
  WHERE okr_id = okr_uuid;
  
  IF total_krs = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT AVG(
    calculate_kr_progress(
      type,
      direction,
      start_value,
      current_value,
      target_value,
      activity_done
    )
  ) INTO avg_progress
  FROM key_results
  WHERE okr_id = okr_uuid;
  
  RETURN LEAST(ROUND(avg_progress), 100);
END;
$$ LANGUAGE plpgsql;

-- FIM DAS MELHORIAS
-- Execute este SQL no Supabase para aplicar as mudanças

