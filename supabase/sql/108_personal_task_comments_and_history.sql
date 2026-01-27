-- =========================================
-- Migration: Criar tabelas de comentários e histórico para personal_tasks
-- Permite adicionar comentários e rastrear mudanças em tarefas pessoais
-- =========================================

-- =============================================
-- PARTE 1: Tabela de Comentários
-- =============================================

CREATE TABLE IF NOT EXISTS personal_task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES personal_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_personal_task_comments_task_id 
ON personal_task_comments(task_id);

CREATE INDEX IF NOT EXISTS idx_personal_task_comments_created_at 
ON personal_task_comments(created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE personal_task_comments IS 
  'Comentários em tarefas pessoais. Deletados em cascata quando a tarefa é deletada.';

-- RLS para comentários
ALTER TABLE personal_task_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Ver comentários das suas tarefas
CREATE POLICY "Users can view comments of their tasks"
ON personal_task_comments FOR SELECT
USING (
    task_id IN (
        SELECT id FROM personal_tasks WHERE user_id = auth.uid()
    )
);

-- Policy: Criar comentários nas suas tarefas
CREATE POLICY "Users can create comments on their tasks"
ON personal_task_comments FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    task_id IN (
        SELECT id FROM personal_tasks WHERE user_id = auth.uid()
    )
);

-- Policy: Editar seus próprios comentários
CREATE POLICY "Users can update their own comments"
ON personal_task_comments FOR UPDATE
USING (user_id = auth.uid());

-- Policy: Deletar seus próprios comentários
CREATE POLICY "Users can delete their own comments"
ON personal_task_comments FOR DELETE
USING (user_id = auth.uid());

-- =============================================
-- PARTE 2: Tabela de Histórico/Activity Log
-- =============================================

CREATE TABLE IF NOT EXISTS personal_task_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES personal_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'created', 'status_changed', 'priority_changed', 'due_date_changed', 'title_changed', 'responsible_changed', 'subtask_added', 'subtask_completed', etc.
    old_value TEXT, -- Valor anterior (para mudanças)
    new_value TEXT, -- Novo valor
    metadata JSONB, -- Dados extras (ex: subtask_id, etc)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_personal_task_activity_log_task_id 
ON personal_task_activity_log(task_id);

CREATE INDEX IF NOT EXISTS idx_personal_task_activity_log_created_at 
ON personal_task_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_task_activity_log_action_type 
ON personal_task_activity_log(action_type);

-- Comentários para documentação
COMMENT ON TABLE personal_task_activity_log IS 
  'Histórico de atividades/mudanças em tarefas pessoais. Deletado em cascata quando a tarefa é deletada.';

COMMENT ON COLUMN personal_task_activity_log.action_type IS 
  'Tipo de ação: created, status_changed, priority_changed, due_date_changed, title_changed, responsible_changed, subtask_added, subtask_completed, comment_added';

-- RLS para activity log
ALTER TABLE personal_task_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Ver histórico das suas tarefas
CREATE POLICY "Users can view activity log of their tasks"
ON personal_task_activity_log FOR SELECT
USING (
    task_id IN (
        SELECT id FROM personal_tasks WHERE user_id = auth.uid()
    )
);

-- Policy: Criar entradas no log das suas tarefas
CREATE POLICY "Users can create activity log entries"
ON personal_task_activity_log FOR INSERT
WITH CHECK (
    task_id IN (
        SELECT id FROM personal_tasks WHERE user_id = auth.uid()
    )
);

-- =============================================
-- PARTE 3: Triggers para log automático
-- =============================================

-- Função para logar mudanças em personal_tasks
CREATE OR REPLACE FUNCTION log_personal_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Tentar obter user_id do contexto de autenticação
    v_user_id := auth.uid();
    
    -- Se não conseguir, usar o user_id da tarefa
    IF v_user_id IS NULL THEN
        v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    END IF;

    -- Logar mudança de status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO personal_task_activity_log (task_id, user_id, action_type, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'status_changed', OLD.status, NEW.status);
    END IF;

    -- Logar mudança de prioridade
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO personal_task_activity_log (task_id, user_id, action_type, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'priority_changed', OLD.priority::TEXT, NEW.priority::TEXT);
    END IF;

    -- Logar mudança de due_date
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
        INSERT INTO personal_task_activity_log (task_id, user_id, action_type, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'due_date_changed', OLD.due_date::TEXT, NEW.due_date::TEXT);
    END IF;

    -- Logar mudança de título
    IF OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO personal_task_activity_log (task_id, user_id, action_type, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'title_changed', OLD.title, NEW.title);
    END IF;

    -- Logar mudança de responsável
    IF OLD.responsible_user_id IS DISTINCT FROM NEW.responsible_user_id THEN
        INSERT INTO personal_task_activity_log (task_id, user_id, action_type, old_value, new_value)
        VALUES (NEW.id, v_user_id, 'responsible_changed', OLD.responsible_user_id::TEXT, NEW.responsible_user_id::TEXT);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para mudanças em personal_tasks
DROP TRIGGER IF EXISTS trigger_log_personal_task_changes ON personal_tasks;
CREATE TRIGGER trigger_log_personal_task_changes
    AFTER UPDATE ON personal_tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_personal_task_changes();

-- Função para logar criação de task
CREATE OR REPLACE FUNCTION log_personal_task_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO personal_task_activity_log (task_id, user_id, action_type, new_value)
    VALUES (NEW.id, NEW.user_id, 'created', NEW.title);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criação de task
DROP TRIGGER IF EXISTS trigger_log_personal_task_created ON personal_tasks;
CREATE TRIGGER trigger_log_personal_task_created
    AFTER INSERT ON personal_tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_personal_task_created();

-- =============================================
-- PARTE 4: Verificação
-- =============================================

SELECT 'personal_task_comments' as table_name, count(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'personal_task_comments'
UNION ALL
SELECT 'personal_task_activity_log' as table_name, count(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'personal_task_activity_log';

-- ✅ Pronto! Tabelas de comentários e histórico criadas com RLS e triggers
