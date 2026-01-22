-- =====================================================
-- ADICIONAR NOVAS DIREÇÕES DE KR
-- =====================================================
-- Adiciona suporte às novas direções de Key Results:
-- - at_most: No máximo (limite superior)
-- - at_least: No mínimo (limite inferior)
-- - in_between: Entre (faixa de valores)
-- =====================================================

-- 1. Atualizar constraint de direção
ALTER TABLE key_results 
DROP CONSTRAINT IF EXISTS key_results_direction_check;

ALTER TABLE key_results 
ADD CONSTRAINT key_results_direction_check 
CHECK (direction IN ('increase', 'decrease', 'at_most', 'at_least', 'in_between', NULL));

-- 2. Adicionar coluna target_max para direção "in_between"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'key_results' AND column_name = 'target_max'
  ) THEN
    ALTER TABLE key_results ADD COLUMN target_max NUMERIC;
    COMMENT ON COLUMN key_results.target_max IS 'Limite máximo para direção in_between (faixa: target_value até target_max)';
  END IF;
END $$;

-- 3. Atualizar comentário da coluna direction
COMMENT ON COLUMN key_results.direction IS 'Direção do KR: increase (maior é melhor), decrease (menor é melhor), at_most (não exceder), at_least (no mínimo), in_between (faixa)';

-- 4. Atualizar função de cálculo de progresso (se existir)
CREATE OR REPLACE FUNCTION calculate_kr_progress(
  p_direction TEXT,
  p_start_value NUMERIC,
  p_current_value NUMERIC,
  p_target_value NUMERIC,
  p_target_max NUMERIC DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_progress NUMERIC;
  v_range NUMERIC;
  v_excess NUMERIC;
  v_tolerance NUMERIC;
BEGIN
  -- Valores padrão
  IF p_target_value IS NULL OR p_current_value IS NULL THEN
    RETURN 0;
  END IF;
  
  CASE p_direction
    -- Aumentar: progresso = (atual / meta) * 100
    WHEN 'increase' THEN
      IF p_target_value = 0 THEN RETURN 0; END IF;
      v_progress := (p_current_value / p_target_value) * 100;
      
    -- Diminuir: progresso desde baseline até meta
    WHEN 'decrease' THEN
      IF p_start_value IS NULL OR p_start_value = p_target_value THEN RETURN 0; END IF;
      v_range := p_start_value - p_target_value;
      IF v_range = 0 THEN RETURN 100; END IF;
      v_progress := ((p_start_value - p_current_value) / v_range) * 100;
      
    -- No máximo: 100% se atual <= meta
    WHEN 'at_most' THEN
      IF p_current_value <= p_target_value THEN
        v_progress := 100;
      ELSE
        v_excess := p_current_value - p_target_value;
        v_tolerance := p_target_value * 0.5;
        IF v_tolerance = 0 THEN v_tolerance := 1; END IF;
        v_progress := GREATEST(0, 100 - (v_excess / v_tolerance) * 100);
      END IF;
      
    -- No mínimo: 100% se atual >= meta
    WHEN 'at_least' THEN
      IF p_current_value >= p_target_value THEN
        v_progress := 100;
      ELSE
        IF p_target_value = 0 THEN RETURN 0; END IF;
        v_progress := (p_current_value / p_target_value) * 100;
      END IF;
      
    -- Entre: 100% se está na faixa [target_value, target_max]
    WHEN 'in_between' THEN
      IF p_target_max IS NULL THEN p_target_max := p_target_value; END IF;
      IF p_current_value >= p_target_value AND p_current_value <= p_target_max THEN
        v_progress := 100;
      ELSIF p_current_value < p_target_value THEN
        IF p_target_value = 0 THEN RETURN 0; END IF;
        v_progress := (p_current_value / p_target_value) * 100;
      ELSE
        v_excess := p_current_value - p_target_max;
        v_tolerance := COALESCE(NULLIF(p_target_max - p_target_value, 0), p_target_max * 0.5);
        IF v_tolerance = 0 THEN v_tolerance := 1; END IF;
        v_progress := GREATEST(0, 100 - (v_excess / v_tolerance) * 100);
      END IF;
      
    ELSE
      -- Fallback: progresso simples
      IF p_target_value = 0 THEN RETURN 0; END IF;
      v_progress := (p_current_value / p_target_value) * 100;
  END CASE;
  
  -- Limitar entre 0 e 150
  RETURN LEAST(150, GREATEST(0, v_progress));
END;
$$ LANGUAGE plpgsql;

-- 5. Verificação
SELECT 
  'Direções disponíveis:' as info,
  string_agg(DISTINCT direction, ', ') as directions
FROM key_results
WHERE direction IS NOT NULL;

SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'key_results' 
  AND column_name IN ('direction', 'target_max');
