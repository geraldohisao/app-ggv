-- ============================================
-- AUTO-CÁLCULO DE STATUS DE KR (SMART)
-- ============================================

-- Função para calcular status baseado em progresso vs. tempo decorrido
CREATE OR REPLACE FUNCTION calculate_kr_status_auto(
  p_okr_id UUID,
  p_type TEXT,
  p_direction TEXT,
  p_start_value NUMERIC,
  p_current_value NUMERIC,
  p_target_value NUMERIC,
  p_activity_done BOOLEAN
)
RETURNS TEXT AS $$
DECLARE
  okr_start_date DATE;
  okr_end_date DATE;
  total_days INTEGER;
  elapsed_days INTEGER;
  time_progress NUMERIC; -- % de tempo decorrido
  value_progress NUMERIC; -- % de progresso no valor
  expected_progress NUMERIC; -- % esperado baseado no tempo
  performance_ratio NUMERIC; -- value_progress / expected_progress
BEGIN
  -- Buscar datas do OKR
  SELECT start_date, end_date INTO okr_start_date, okr_end_date
  FROM okrs WHERE id = p_okr_id;

  IF okr_start_date IS NULL OR okr_end_date IS NULL THEN
    RETURN 'vermelho'; -- Fallback se não houver datas
  END IF;

  -- Se for atividade, status binário
  IF p_type = 'activity' THEN
    RETURN CASE WHEN p_activity_done THEN 'verde' ELSE 'vermelho' END;
  END IF;

  -- Calcular tempo decorrido
  total_days := okr_end_date - okr_start_date;
  elapsed_days := GREATEST(0, CURRENT_DATE - okr_start_date);
  
  IF total_days <= 0 THEN total_days := 1; END IF; -- Evitar divisão por zero
  time_progress := (elapsed_days::NUMERIC / total_days::NUMERIC) * 100;
  time_progress := LEAST(100, time_progress); -- Cap em 100%

  -- Calcular progresso no valor
  IF p_direction = 'increase' THEN
    -- Aumentar: (atual - inicial) / (meta - inicial)
    IF p_target_value - COALESCE(p_start_value, 0) = 0 THEN
      value_progress := CASE WHEN p_current_value >= p_target_value THEN 100 ELSE 0 END;
    ELSE
      value_progress := ((p_current_value - COALESCE(p_start_value, 0)) / (p_target_value - COALESCE(p_start_value, 0))) * 100;
    END IF;
  ELSIF p_direction = 'decrease' THEN
    -- Diminuir: (inicial - atual) / (inicial - meta)
    IF COALESCE(p_start_value, 0) - p_target_value = 0 THEN
      value_progress := CASE WHEN p_current_value <= p_target_value THEN 100 ELSE 0 END;
    ELSE
      value_progress := ((COALESCE(p_start_value, 0) - p_current_value) / (COALESCE(p_start_value, 0) - p_target_value)) * 100;
    END IF;
  ELSE
    -- Fallback: simples (atual / meta)
    IF p_target_value = 0 THEN
      value_progress := 0;
    ELSE
      value_progress := (p_current_value / p_target_value) * 100;
    END IF;
  END IF;

  -- Clamp value_progress entre 0 e 150% (permitir overperformance)
  value_progress := LEAST(150, GREATEST(0, value_progress));

  -- Progresso esperado para o tempo decorrido
  expected_progress := time_progress;

  -- Performance ratio: quanto % do esperado já foi atingido?
  IF expected_progress = 0 THEN expected_progress := 1; END IF; -- Evitar divisão por zero no início
  performance_ratio := (value_progress / expected_progress) * 100;

  -- Critérios de status:
  -- Verde: >= 85% do esperado
  -- Amarelo: 75-85% do esperado
  -- Vermelho: < 75% do esperado
  IF performance_ratio >= 85 THEN
    RETURN 'verde';
  ELSIF performance_ratio >= 75 THEN
    RETURN 'amarelo';
  ELSE
    RETURN 'vermelho';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_kr_status_auto IS 'Calcula status do KR automaticamente baseado em progresso vs. tempo decorrido';

-- Trigger para atualizar status automaticamente ao salvar/atualizar KR
DROP TRIGGER IF EXISTS trigger_auto_update_kr_status ON key_results;
CREATE TRIGGER trigger_auto_update_kr_status
  BEFORE INSERT OR UPDATE OF current_value, target_value, start_value, type, direction, activity_done ON key_results
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_kr_status_trigger();

-- Função chamada pelo trigger
CREATE OR REPLACE FUNCTION auto_update_kr_status_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := calculate_kr_status_auto(
    NEW.okr_id,
    NEW.type,
    NEW.direction,
    NEW.start_value,
    NEW.current_value,
    NEW.target_value,
    NEW.activity_done
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_update_kr_status_trigger IS 'Trigger function para auto-atualizar status do KR';

-- Atualizar status de KRs existentes (rodar uma vez após ativar o trigger)
-- UPDATE key_results SET updated_at = updated_at; -- Força recalcular status de todos os KRs

