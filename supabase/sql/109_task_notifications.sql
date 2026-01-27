-- =========================================
-- Migration: Sistema de Notificações para Tasks
-- Notificações in-app para lembretes de vencimento
-- =========================================

-- =============================================
-- PARTE 1: Tabela de Notificações
-- =============================================

CREATE TABLE IF NOT EXISTS task_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES personal_tasks(id) ON DELETE CASCADE,
    sprint_item_id UUID REFERENCES sprint_items(id) ON DELETE CASCADE,
    
    -- Tipo e conteúdo da notificação
    type TEXT NOT NULL, -- 'due_today', 'due_tomorrow', 'overdue', 'assigned', 'comment_added'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Estado
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir que pelo menos uma referência existe
    CONSTRAINT notification_has_task CHECK (task_id IS NOT NULL OR sprint_item_id IS NOT NULL OR type = 'assigned')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id 
ON task_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_task_notifications_user_unread 
ON task_notifications(user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_task_notifications_created_at 
ON task_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_notifications_task_id 
ON task_notifications(task_id) WHERE task_id IS NOT NULL;

-- Comentários para documentação
COMMENT ON TABLE task_notifications IS 
  'Notificações in-app para tarefas: lembretes de vencimento, atribuições, comentários';

COMMENT ON COLUMN task_notifications.type IS 
  'Tipo: due_today, due_tomorrow, overdue, assigned, comment_added';

-- RLS
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Ver apenas suas notificações
CREATE POLICY "Users can view their own notifications"
ON task_notifications FOR SELECT
USING (user_id = auth.uid());

-- Policy: Marcar como lida
CREATE POLICY "Users can update their own notifications"
ON task_notifications FOR UPDATE
USING (user_id = auth.uid());

-- Policy: Deletar suas notificações
CREATE POLICY "Users can delete their own notifications"
ON task_notifications FOR DELETE
USING (user_id = auth.uid());

-- Policy: Sistema pode criar notificações (via service role)
CREATE POLICY "System can insert notifications"
ON task_notifications FOR INSERT
WITH CHECK (true);

-- =============================================
-- PARTE 2: Função para criar notificações de vencimento
-- (Pode ser chamada por um cron job ou edge function)
-- =============================================

CREATE OR REPLACE FUNCTION create_due_date_notifications()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_task RECORD;
BEGIN
    -- Notificações para tasks que vencem HOJE
    FOR v_task IN 
        SELECT 
            pt.id as task_id,
            pt.user_id,
            pt.title,
            pt.due_date
        FROM personal_tasks pt
        WHERE pt.status != 'concluido'
          AND pt.due_date::date = CURRENT_DATE
          AND NOT EXISTS (
              SELECT 1 FROM task_notifications tn 
              WHERE tn.task_id = pt.id 
                AND tn.type = 'due_today'
                AND tn.created_at::date = CURRENT_DATE
          )
    LOOP
        INSERT INTO task_notifications (user_id, task_id, type, title, message)
        VALUES (
            v_task.user_id,
            v_task.task_id,
            'due_today',
            'Tarefa vence hoje!',
            format('A tarefa "%s" vence hoje.', v_task.title)
        );
        v_count := v_count + 1;
    END LOOP;

    -- Notificações para tasks que vencem AMANHÃ
    FOR v_task IN 
        SELECT 
            pt.id as task_id,
            pt.user_id,
            pt.title,
            pt.due_date
        FROM personal_tasks pt
        WHERE pt.status != 'concluido'
          AND pt.due_date::date = (CURRENT_DATE + INTERVAL '1 day')::date
          AND NOT EXISTS (
              SELECT 1 FROM task_notifications tn 
              WHERE tn.task_id = pt.id 
                AND tn.type = 'due_tomorrow'
                AND tn.created_at::date = CURRENT_DATE
          )
    LOOP
        INSERT INTO task_notifications (user_id, task_id, type, title, message)
        VALUES (
            v_task.user_id,
            v_task.task_id,
            'due_tomorrow',
            'Tarefa vence amanhã',
            format('A tarefa "%s" vence amanhã.', v_task.title)
        );
        v_count := v_count + 1;
    END LOOP;

    -- Notificações para tasks ATRASADAS (sem notificação nos últimos 3 dias)
    FOR v_task IN 
        SELECT 
            pt.id as task_id,
            pt.user_id,
            pt.title,
            pt.due_date
        FROM personal_tasks pt
        WHERE pt.status != 'concluido'
          AND pt.due_date::date < CURRENT_DATE
          AND NOT EXISTS (
              SELECT 1 FROM task_notifications tn 
              WHERE tn.task_id = pt.id 
                AND tn.type = 'overdue'
                AND tn.created_at > (NOW() - INTERVAL '3 days')
          )
    LOOP
        INSERT INTO task_notifications (user_id, task_id, type, title, message)
        VALUES (
            v_task.user_id,
            v_task.task_id,
            'overdue',
            'Tarefa atrasada!',
            format('A tarefa "%s" está atrasada desde %s.', v_task.title, to_char(v_task.due_date, 'DD/MM'))
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 3: RPC para buscar notificações do usuário
-- =============================================

CREATE OR REPLACE FUNCTION get_my_notifications(
    p_limit INTEGER DEFAULT 20,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    task_id UUID,
    sprint_item_id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN,
    read_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    task_title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tn.id,
        tn.task_id,
        tn.sprint_item_id,
        tn.type,
        tn.title,
        tn.message,
        tn.is_read,
        tn.read_at,
        tn.metadata,
        tn.created_at,
        COALESCE(pt.title, si.title) as task_title
    FROM task_notifications tn
    LEFT JOIN personal_tasks pt ON pt.id = tn.task_id
    LEFT JOIN sprint_items si ON si.id = tn.sprint_item_id
    WHERE tn.user_id = auth.uid()
      AND (NOT p_unread_only OR tn.is_read = false)
    ORDER BY tn.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 4: RPC para contar notificações não lidas
-- =============================================

CREATE OR REPLACE FUNCTION count_unread_notifications()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM task_notifications
        WHERE user_id = auth.uid()
          AND is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 5: RPC para marcar notificações como lidas
-- =============================================

CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE task_notifications
    SET is_read = true, read_at = NOW()
    WHERE id = ANY(p_notification_ids)
      AND user_id = auth.uid()
      AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar todas como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE task_notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = auth.uid()
      AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTE 6: Verificação
-- =============================================

SELECT 'task_notifications' as table_name, count(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'task_notifications';

-- ✅ Pronto! Sistema de notificações criado
-- Para ativar lembretes automáticos, configure um cron job para chamar:
-- SELECT create_due_date_notifications();
-- Recomendado: executar 1x por dia (ex: 8h da manhã)
