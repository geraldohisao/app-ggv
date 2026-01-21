-- ================================================
-- SCRIPT IDEMPOTENTE: Carry-over e Status Detalhados
-- ================================================
-- Adiciona suporte para:
-- 1. Carry-over de itens entre sprints (carried_from_id)
-- 2. Status detalhados para impedimentos (impediment_status)
-- 3. Status "pausado" para decisões

-- ================================================
-- 1. ADICIONAR COLUNA carried_from_id
-- ================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sprint_items' AND column_name = 'carried_from_id'
  ) THEN
    ALTER TABLE sprint_items
    ADD COLUMN carried_from_id UUID REFERENCES sprint_items(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN sprint_items.carried_from_id IS 'Referência ao item original de onde este foi copiado (carry-over)';
    
    RAISE NOTICE 'Coluna carried_from_id adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna carried_from_id já existe';
  END IF;
END $$;

-- ================================================
-- 2. ADICIONAR COLUNA impediment_status
-- ================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sprint_items' AND column_name = 'impediment_status'
  ) THEN
    ALTER TABLE sprint_items
    ADD COLUMN impediment_status TEXT CHECK (
      impediment_status IN ('aberto', 'bloqueado', 'em_risco', 'resolvido')
    ) DEFAULT 'aberto';
    
    COMMENT ON COLUMN sprint_items.impediment_status IS 'Status específico para impedimentos: aberto, bloqueado, em_risco, resolvido';
    
    RAISE NOTICE 'Coluna impediment_status adicionada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna impediment_status já existe';
  END IF;
END $$;

-- ================================================
-- 3. ATUALIZAR CONSTRAINT de decision_status
-- ================================================

DO $$
BEGIN
  -- Remover constraint antiga (se existir)
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'sprint_items' AND constraint_name LIKE '%decision_status%'
  ) THEN
    ALTER TABLE sprint_items DROP CONSTRAINT IF EXISTS sprint_items_decision_status_check;
    RAISE NOTICE 'Constraint antiga de decision_status removida';
  END IF;

  -- Adicionar nova constraint com "pausado"
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'sprint_items_decision_status_check'
    AND check_clause LIKE '%pausado%'
  ) THEN
    ALTER TABLE sprint_items
    ADD CONSTRAINT sprint_items_decision_status_check
    CHECK (decision_status IN ('decidido', 'em_execucao', 'pausado', 'cancelado', 'concluido'));
    
    RAISE NOTICE 'Nova constraint de decision_status adicionada com "pausado"';
  ELSE
    RAISE NOTICE 'Constraint de decision_status já está atualizada';
  END IF;
END $$;

-- ================================================
-- 4. CRIAR ÍNDICE para carried_from_id
-- ================================================

CREATE INDEX IF NOT EXISTS idx_sprint_items_carried_from_id
ON sprint_items(carried_from_id)
WHERE carried_from_id IS NOT NULL;

-- ================================================
-- 5. FUNÇÃO HELPER: Validar carry-over
-- ================================================

CREATE OR REPLACE FUNCTION validate_carry_over()
RETURNS TRIGGER AS $$
BEGIN
  -- Se is_carry_over é TRUE, deve ter carried_from_id
  IF NEW.is_carry_over = TRUE AND NEW.carried_from_id IS NULL THEN
    RAISE WARNING 'Item marcado como carry-over mas sem referência ao item original';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 6. TRIGGER para validação
-- ================================================

DROP TRIGGER IF EXISTS trg_validate_carry_over ON sprint_items;

CREATE TRIGGER trg_validate_carry_over
BEFORE INSERT OR UPDATE ON sprint_items
FOR EACH ROW
EXECUTE FUNCTION validate_carry_over();

-- ================================================
-- RESUMO
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Script de Carry-over e Status Detalhados executado com sucesso!';
  RAISE NOTICE 'Colunas adicionadas:';
  RAISE NOTICE '  - carried_from_id (UUID nullable)';
  RAISE NOTICE '  - impediment_status (TEXT com check constraint)';
  RAISE NOTICE 'Constraint atualizada:';
  RAISE NOTICE '  - decision_status agora inclui "pausado"';
END $$;
