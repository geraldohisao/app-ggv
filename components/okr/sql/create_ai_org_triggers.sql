-- ============================================
-- TRIGGERS PARA ANÁLISE AUTOMÁTICA EM TEMPO REAL
-- Dispara análise da IA quando usuários são atualizados
-- ============================================

-- 📊 TABELA: org_analysis_queue (Fila de análises pendentes)
-- ============================================

CREATE TABLE IF NOT EXISTS org_analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Trigger que disparou
  trigger_source TEXT NOT NULL CHECK (trigger_source IN (
    'profile_update',
    'cargo_change', 
    'department_change',
    'reporting_line_change',
    'manual_request'
  )),
  
  -- Contexto da mudança
  affected_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  change_details JSONB,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),  -- 1 = maior prioridade
  
  -- Processamento
  processed_at TIMESTAMPTZ,
  processing_duration_ms INT,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- TTL: análises antigas são limpas
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON org_analysis_queue(status) 
  WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_analysis_queue_created ON org_analysis_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_priority ON org_analysis_queue(priority, created_at) 
  WHERE status = 'pending';

COMMENT ON TABLE org_analysis_queue IS 'Fila de análises organizacionais pendentes';

-- ============================================
-- FUNÇÃO: queue_org_analysis
-- Adiciona análise na fila (chamada pelos triggers)
-- ============================================

CREATE OR REPLACE FUNCTION queue_org_analysis(
  p_trigger_source TEXT,
  p_affected_user_id UUID DEFAULT NULL,
  p_change_details JSONB DEFAULT '{}'::JSONB,
  p_priority INT DEFAULT 5
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  queue_id UUID;
  recent_queue_exists BOOLEAN;
BEGIN
  -- Evitar duplicatas: verificar se já existe análise pendente recente (últimos 5 min)
  SELECT EXISTS (
    SELECT 1 FROM org_analysis_queue
    WHERE status IN ('pending', 'processing')
      AND created_at > NOW() - INTERVAL '5 minutes'
      AND trigger_source = p_trigger_source
      AND (affected_user_id = p_affected_user_id OR p_affected_user_id IS NULL)
  ) INTO recent_queue_exists;
  
  IF recent_queue_exists THEN
    RAISE NOTICE 'Análise já está na fila (últimos 5min), pulando duplicata';
    RETURN NULL;
  END IF;
  
  -- Inserir na fila
  INSERT INTO org_analysis_queue (
    trigger_source,
    affected_user_id,
    change_details,
    priority,
    status
  )
  VALUES (
    p_trigger_source,
    p_affected_user_id,
    p_change_details,
    p_priority,
    'pending'
  )
  RETURNING id INTO queue_id;
  
  RAISE NOTICE '✅ Análise organizacional enfileirada: % (ID: %)', p_trigger_source, queue_id;
  
  RETURN queue_id;
END;
$$;

GRANT EXECUTE ON FUNCTION queue_org_analysis(TEXT, UUID, JSONB, INT) TO authenticated;

-- ============================================
-- TRIGGER 1: Quando PROFILE é atualizado
-- ============================================

CREATE OR REPLACE FUNCTION trigger_org_analysis_on_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_significant_change BOOLEAN := FALSE;
  change_details JSONB;
BEGIN
  -- Verificar se houve mudança significativa (cargo, departamento, status)
  IF (OLD.cargo IS DISTINCT FROM NEW.cargo) OR
     (OLD.department IS DISTINCT FROM NEW.department) OR
     (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    has_significant_change := TRUE;
  END IF;
  
  -- Se não houve mudança significativa, não disparar análise
  IF NOT has_significant_change THEN
    RETURN NEW;
  END IF;
  
  -- Preparar detalhes da mudança
  change_details := jsonb_build_object(
    'user_id', NEW.id,
    'user_name', NEW.name,
    'changes', jsonb_build_object(
      'cargo', jsonb_build_object('from', OLD.cargo, 'to', NEW.cargo),
      'department', jsonb_build_object('from', OLD.department, 'to', NEW.department),
      'is_active', jsonb_build_object('from', OLD.is_active, 'to', NEW.is_active)
    )
  );
  
  -- Enfileirar análise (prioridade 5 = normal)
  PERFORM queue_org_analysis(
    CASE 
      WHEN OLD.cargo IS DISTINCT FROM NEW.cargo THEN 'cargo_change'
      WHEN OLD.department IS DISTINCT FROM NEW.department THEN 'department_change'
      ELSE 'profile_update'
    END,
    NEW.id,
    change_details,
    5
  );
  
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir e recriar
DROP TRIGGER IF EXISTS trg_org_analysis_profile_update ON profiles;

CREATE TRIGGER trg_org_analysis_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_org_analysis_on_profile_update();

COMMENT ON TRIGGER trg_org_analysis_profile_update ON profiles IS 
  'Dispara análise organizacional quando usuário é atualizado (cargo, dept, status)';

-- ============================================
-- TRIGGER 2: Quando REPORTING_LINE é criada/alterada
-- ============================================

CREATE OR REPLACE FUNCTION trigger_org_analysis_on_reporting_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change_details JSONB;
  operation_type TEXT;
BEGIN
  -- Determinar tipo de operação
  IF TG_OP = 'INSERT' THEN
    operation_type := 'reporting_line_created';
    change_details := jsonb_build_object(
      'subordinate_id', NEW.subordinate_id,
      'manager_id', NEW.manager_id,
      'relationship_type', NEW.relationship_type
    );
    
    -- Enfileirar com prioridade média-alta (3)
    PERFORM queue_org_analysis(
      'reporting_line_change',
      NEW.subordinate_id,
      change_details,
      3
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Só disparar se mudou manager ou status
    IF (OLD.manager_id IS DISTINCT FROM NEW.manager_id) OR
       (OLD.effective_until IS DISTINCT FROM NEW.effective_until) THEN
      operation_type := 'reporting_line_updated';
      change_details := jsonb_build_object(
        'subordinate_id', NEW.subordinate_id,
        'old_manager_id', OLD.manager_id,
        'new_manager_id', NEW.manager_id,
        'ended', NEW.effective_until IS NOT NULL
      );
      
      PERFORM queue_org_analysis(
        'reporting_line_change',
        NEW.subordinate_id,
        change_details,
        3
      );
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    operation_type := 'reporting_line_deleted';
    change_details := jsonb_build_object(
      'subordinate_id', OLD.subordinate_id,
      'manager_id', OLD.manager_id
    );
    
    PERFORM queue_org_analysis(
      'reporting_line_change',
      OLD.subordinate_id,
      change_details,
      3
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_analysis_reporting_change ON reporting_lines;

CREATE TRIGGER trg_org_analysis_reporting_change
  AFTER INSERT OR UPDATE OR DELETE ON reporting_lines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_org_analysis_on_reporting_change();

COMMENT ON TRIGGER trg_org_analysis_reporting_change ON reporting_lines IS 
  'Dispara análise quando linha de reporte é criada/alterada/removida';

-- ============================================
-- RPC: process_analysis_queue
-- Processa análises pendentes (chamado pela Edge Function)
-- ============================================

CREATE OR REPLACE FUNCTION process_analysis_queue(
  batch_size INT DEFAULT 10
)
RETURNS TABLE (
  queue_id UUID,
  trigger_source TEXT,
  affected_user_id UUID,
  change_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marcar como "processing" e retornar próximos N itens da fila
  RETURN QUERY
  UPDATE org_analysis_queue
  SET status = 'processing',
      processed_at = NOW()
  WHERE id IN (
    SELECT id 
    FROM org_analysis_queue
    WHERE status = 'pending'
    ORDER BY priority ASC, created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED  -- Evitar race condition
  )
  RETURNING id, trigger_source, affected_user_id, change_details;
END;
$$;

GRANT EXECUTE ON FUNCTION process_analysis_queue(INT) TO service_role;

-- ============================================
-- RPC: mark_analysis_completed
-- Marca análise como concluída
-- ============================================

CREATE OR REPLACE FUNCTION mark_analysis_completed(
  p_queue_id UUID,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL,
  p_duration_ms INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE org_analysis_queue
  SET 
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    error_message = p_error_message,
    processing_duration_ms = p_duration_ms
  WHERE id = p_queue_id;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_analysis_completed(UUID, BOOLEAN, TEXT, INT) TO service_role;

-- ============================================
-- LIMPEZA AUTOMÁTICA: Remover análises antigas
-- (Executar via cron ou manualmente)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_analysis_queue()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Remover análises completadas com mais de 7 dias
  DELETE FROM org_analysis_queue
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '🧹 Limpeza: % análises antigas removidas', deleted_count;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_analysis_queue() TO service_role;

-- ============================================
-- VIEW: Estatísticas da fila de análise
-- ============================================

CREATE OR REPLACE VIEW v_analysis_queue_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_day_count,
  AVG(processing_duration_ms) FILTER (WHERE status = 'completed') as avg_duration_ms,
  MAX(created_at) as last_queued_at
FROM org_analysis_queue;

COMMENT ON VIEW v_analysis_queue_stats IS 'Estatísticas em tempo real da fila de análise organizacional';

-- ============================================
-- SEED: Análise inicial (opcional)
-- ============================================

-- Enfileirar análise completa inicial
DO $$
DECLARE
  queue_id UUID;
BEGIN
  SELECT queue_org_analysis(
    'manual_request',
    NULL,
    jsonb_build_object('reason', 'Análise inicial do sistema'),
    1  -- Prioridade alta
  ) INTO queue_id;
  
  IF queue_id IS NOT NULL THEN
    RAISE NOTICE '📊 Análise inicial enfileirada com ID: %', queue_id;
  END IF;
END $$;

-- ============================================
-- ✅ FINALIZAÇÃO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de Análise em Tempo Real configurado com sucesso!';
  RAISE NOTICE '🔔 Triggers ativos em: profiles, reporting_lines';
  RAISE NOTICE '📊 Análises serão disparadas automaticamente a cada atualização';
  RAISE NOTICE '⚡ Fila: org_analysis_queue';
  RAISE NOTICE '📈 Stats: SELECT * FROM v_analysis_queue_stats;';
END $$;

