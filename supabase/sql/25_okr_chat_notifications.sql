-- =========================================
-- OKR GOOGLE CHAT NOTIFICATIONS
-- Sistema de notificações via Google Chat (DM) para OKR
-- =========================================
-- 
-- Este script cria:
-- 1. Tabela para cache de DM spaces do Google Chat
-- 2. Tabela outbox para fila de notificações
-- 3. Triggers para enfileirar eventos automaticamente
-- =========================================

-- =========================================
-- 1. TABELA: google_chat_dm_spaces
-- Cache de DM spaces para evitar chamadas repetidas à API
-- =========================================

CREATE TABLE IF NOT EXISTS google_chat_dm_spaces (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    space_name TEXT NOT NULL,  -- e.g., "spaces/AAAA..."
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por email (caso precise)
CREATE INDEX IF NOT EXISTS idx_google_chat_dm_spaces_email 
    ON google_chat_dm_spaces(email);

-- Comentário na tabela
COMMENT ON TABLE google_chat_dm_spaces IS 
    'Cache de DM spaces do Google Chat por usuário para otimizar envio de notificações';

-- =========================================
-- 2. TABELA: okr_notification_outbox
-- Fila de notificações para processamento assíncrono
-- =========================================

-- Tipo enum para status da notificação
DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tipo enum para tipos de notificação
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'task_assigned',      -- Nova tarefa atribuída
        'sprint_reminder_48h', -- Lembrete 48h antes do fim da sprint
        'task_overdue',       -- Tarefa atrasada
        'sprint_started',     -- Sprint iniciada (opcional)
        'task_completed'      -- Tarefa concluída (opcional)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS okr_notification_outbox (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Tipo e destinatário
    type notification_type NOT NULL,
    recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Entidade relacionada (para tracking e deduplicação)
    entity_table TEXT NOT NULL,  -- 'personal_tasks', 'sprint_items', 'sprints'
    entity_id UUID NOT NULL,
    
    -- Payload da mensagem (título, descrição, links, etc.)
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Agendamento e controle
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    status notification_status DEFAULT 'pending',
    
    -- Tracking de envio
    sent_at TIMESTAMPTZ,
    fail_reason TEXT,
    retry_count INT DEFAULT 0,
    
    -- Chave de deduplicação (evita enviar mesma notificação múltiplas vezes)
    -- Formato: {type}:{entity_table}:{entity_id}:{date_key}
    dedupe_key TEXT UNIQUE,
    
    -- Metadados
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_okr_notification_outbox_status 
    ON okr_notification_outbox(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_okr_notification_outbox_scheduled 
    ON okr_notification_outbox(scheduled_for) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_okr_notification_outbox_recipient 
    ON okr_notification_outbox(recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_okr_notification_outbox_type 
    ON okr_notification_outbox(type);

CREATE INDEX IF NOT EXISTS idx_okr_notification_outbox_entity 
    ON okr_notification_outbox(entity_table, entity_id);

-- Comentário na tabela
COMMENT ON TABLE okr_notification_outbox IS 
    'Fila de notificações OKR para envio via Google Chat. Processada por função scheduled.';

-- =========================================
-- 3. FUNÇÃO: Enfileirar notificação de nova tarefa pessoal
-- =========================================

CREATE OR REPLACE FUNCTION fn_queue_personal_task_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
    v_user_name TEXT;
    v_dedupe_key TEXT;
BEGIN
    -- Só processa INSERT (nova tarefa)
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- Buscar dados do usuário
    SELECT email, COALESCE(full_name, name, email) INTO v_user_email, v_user_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Se não encontrou usuário, não notifica
    IF v_user_email IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Gerar chave de deduplicação
    v_dedupe_key := 'task_assigned:personal_tasks:' || NEW.id::TEXT || ':' || CURRENT_DATE::TEXT;
    
    -- Inserir na fila (ignora se já existe)
    INSERT INTO okr_notification_outbox (
        type,
        recipient_user_id,
        entity_table,
        entity_id,
        payload,
        dedupe_key
    ) VALUES (
        'task_assigned',
        NEW.user_id,
        'personal_tasks',
        NEW.id,
        jsonb_build_object(
            'title', NEW.title,
            'description', COALESCE(NEW.description, ''),
            'due_date', NEW.due_date,
            'priority', COALESCE(NEW.priority, 'media'),
            'recipient_name', v_user_name,
            'recipient_email', v_user_email,
            'deep_link', '/okr/atividades'
        ),
        v_dedupe_key
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para personal_tasks
DROP TRIGGER IF EXISTS trg_personal_task_notification ON personal_tasks;
CREATE TRIGGER trg_personal_task_notification
    AFTER INSERT ON personal_tasks
    FOR EACH ROW
    EXECUTE FUNCTION fn_queue_personal_task_notification();

-- =========================================
-- 4. FUNÇÃO: Enfileirar notificação de sprint item atribuído
-- =========================================

CREATE OR REPLACE FUNCTION fn_queue_sprint_item_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
    v_user_name TEXT;
    v_sprint_title TEXT;
    v_dedupe_key TEXT;
    v_should_notify BOOLEAN := FALSE;
BEGIN
    -- Determinar se deve notificar:
    -- INSERT com responsible_user_id definido
    -- UPDATE que define responsible_user_id (antes era NULL ou diferente)
    IF TG_OP = 'INSERT' THEN
        v_should_notify := NEW.responsible_user_id IS NOT NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_should_notify := NEW.responsible_user_id IS NOT NULL 
            AND (OLD.responsible_user_id IS NULL OR OLD.responsible_user_id != NEW.responsible_user_id);
    END IF;
    
    IF NOT v_should_notify THEN
        RETURN NEW;
    END IF;
    
    -- Buscar dados do usuário responsável
    SELECT email, COALESCE(full_name, name, email) INTO v_user_email, v_user_name
    FROM profiles
    WHERE id = NEW.responsible_user_id;
    
    -- Se não encontrou usuário, não notifica
    IF v_user_email IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Buscar título da sprint
    SELECT title INTO v_sprint_title
    FROM sprints
    WHERE id = NEW.sprint_id;
    
    -- Gerar chave de deduplicação
    v_dedupe_key := 'task_assigned:sprint_items:' || NEW.id::TEXT || ':' || CURRENT_DATE::TEXT;
    
    -- Inserir na fila (ignora se já existe)
    INSERT INTO okr_notification_outbox (
        type,
        recipient_user_id,
        entity_table,
        entity_id,
        payload,
        dedupe_key
    ) VALUES (
        'task_assigned',
        NEW.responsible_user_id,
        'sprint_items',
        NEW.id,
        jsonb_build_object(
            'title', NEW.title,
            'description', COALESCE(NEW.description, ''),
            'due_date', NEW.due_date,
            'item_type', NEW.type,
            'status', NEW.status,
            'sprint_id', NEW.sprint_id,
            'sprint_title', COALESCE(v_sprint_title, 'Sprint'),
            'recipient_name', v_user_name,
            'recipient_email', v_user_email,
            'deep_link', '/okr/sprints/' || NEW.sprint_id::TEXT
        ),
        v_dedupe_key
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para sprint_items
DROP TRIGGER IF EXISTS trg_sprint_item_notification ON sprint_items;
CREATE TRIGGER trg_sprint_item_notification
    AFTER INSERT OR UPDATE OF responsible_user_id ON sprint_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_queue_sprint_item_notification();

-- =========================================
-- 5. FUNÇÃO: Gerar lembretes de sprint (48h antes do fim)
-- Executada via cron job na aplicação
-- =========================================

CREATE OR REPLACE FUNCTION fn_generate_sprint_reminders()
RETURNS TABLE (
    notifications_created INT,
    sprints_processed INT
) AS $$
DECLARE
    v_created INT := 0;
    v_processed INT := 0;
    v_sprint RECORD;
    v_responsible_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_dedupe_key TEXT;
    v_reminder_date DATE;
BEGIN
    -- Data alvo: 48h antes = 2 dias antes
    v_reminder_date := CURRENT_DATE + INTERVAL '2 days';
    
    -- Buscar sprints que terminam em 48h e estão em andamento
    FOR v_sprint IN
        SELECT 
            s.id,
            s.title,
            s.end_date,
            s.department,
            s.responsible_user_id,
            s.status
        FROM sprints s
        WHERE s.status = 'em andamento'
          AND s.deleted_at IS NULL
          AND s.end_date = v_reminder_date
    LOOP
        v_processed := v_processed + 1;
        
        -- Determinar destinatário: responsible_user_id da sprint
        v_responsible_id := v_sprint.responsible_user_id;
        
        -- Se não tem responsável direto, pular (poderia buscar responsáveis dos itens)
        IF v_responsible_id IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Buscar dados do usuário
        SELECT email, COALESCE(full_name, name, email) INTO v_user_email, v_user_name
        FROM profiles
        WHERE id = v_responsible_id;
        
        IF v_user_email IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Gerar chave de deduplicação (1 lembrete por sprint por dia)
        v_dedupe_key := 'sprint_reminder_48h:sprints:' || v_sprint.id::TEXT || ':' || CURRENT_DATE::TEXT;
        
        -- Inserir notificação
        INSERT INTO okr_notification_outbox (
            type,
            recipient_user_id,
            entity_table,
            entity_id,
            payload,
            dedupe_key
        ) VALUES (
            'sprint_reminder_48h',
            v_responsible_id,
            'sprints',
            v_sprint.id,
            jsonb_build_object(
                'sprint_title', v_sprint.title,
                'end_date', v_sprint.end_date,
                'department', COALESCE(v_sprint.department, 'Geral'),
                'recipient_name', v_user_name,
                'recipient_email', v_user_email,
                'deep_link', '/okr/sprints/' || v_sprint.id::TEXT
            ),
            v_dedupe_key
        )
        ON CONFLICT (dedupe_key) DO NOTHING;
        
        -- Verificar se inseriu (não foi duplicado)
        IF FOUND THEN
            v_created := v_created + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_created, v_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =========================================
-- 6. FUNÇÃO: Gerar alertas de tarefas atrasadas
-- Executada via cron job na aplicação
-- =========================================

CREATE OR REPLACE FUNCTION fn_generate_overdue_alerts()
RETURNS TABLE (
    notifications_created INT,
    tasks_processed INT
) AS $$
DECLARE
    v_created INT := 0;
    v_processed INT := 0;
    v_task RECORD;
    v_user_email TEXT;
    v_user_name TEXT;
    v_dedupe_key TEXT;
BEGIN
    -- Processar personal_tasks atrasadas
    FOR v_task IN
        SELECT 
            pt.id,
            pt.user_id,
            pt.title,
            pt.due_date,
            pt.priority,
            'personal_tasks' as source_table
        FROM personal_tasks pt
        WHERE pt.status != 'concluido'
          AND pt.due_date < CURRENT_DATE
          AND pt.user_id IS NOT NULL
    LOOP
        v_processed := v_processed + 1;
        
        SELECT email, COALESCE(full_name, name, email) INTO v_user_email, v_user_name
        FROM profiles
        WHERE id = v_task.user_id;
        
        IF v_user_email IS NULL THEN
            CONTINUE;
        END IF;
        
        v_dedupe_key := 'task_overdue:personal_tasks:' || v_task.id::TEXT || ':' || CURRENT_DATE::TEXT;
        
        INSERT INTO okr_notification_outbox (
            type,
            recipient_user_id,
            entity_table,
            entity_id,
            payload,
            dedupe_key
        ) VALUES (
            'task_overdue',
            v_task.user_id,
            'personal_tasks',
            v_task.id,
            jsonb_build_object(
                'title', v_task.title,
                'due_date', v_task.due_date,
                'days_overdue', CURRENT_DATE - v_task.due_date,
                'priority', COALESCE(v_task.priority, 'media'),
                'recipient_name', v_user_name,
                'recipient_email', v_user_email,
                'deep_link', '/okr/atividades'
            ),
            v_dedupe_key
        )
        ON CONFLICT (dedupe_key) DO NOTHING;
        
        IF FOUND THEN
            v_created := v_created + 1;
        END IF;
    END LOOP;
    
    -- Processar sprint_items atrasados
    FOR v_task IN
        SELECT 
            si.id,
            si.responsible_user_id,
            si.title,
            si.due_date,
            si.type as item_type,
            si.sprint_id,
            s.title as sprint_title
        FROM sprint_items si
        JOIN sprints s ON s.id = si.sprint_id
        WHERE si.status != 'concluído'
          AND si.due_date < CURRENT_DATE
          AND si.responsible_user_id IS NOT NULL
          AND s.deleted_at IS NULL
    LOOP
        v_processed := v_processed + 1;
        
        SELECT email, COALESCE(full_name, name, email) INTO v_user_email, v_user_name
        FROM profiles
        WHERE id = v_task.responsible_user_id;
        
        IF v_user_email IS NULL THEN
            CONTINUE;
        END IF;
        
        v_dedupe_key := 'task_overdue:sprint_items:' || v_task.id::TEXT || ':' || CURRENT_DATE::TEXT;
        
        INSERT INTO okr_notification_outbox (
            type,
            recipient_user_id,
            entity_table,
            entity_id,
            payload,
            dedupe_key
        ) VALUES (
            'task_overdue',
            v_task.responsible_user_id,
            'sprint_items',
            v_task.id,
            jsonb_build_object(
                'title', v_task.title,
                'due_date', v_task.due_date,
                'days_overdue', CURRENT_DATE - v_task.due_date,
                'item_type', v_task.item_type,
                'sprint_id', v_task.sprint_id,
                'sprint_title', v_task.sprint_title,
                'recipient_name', v_user_name,
                'recipient_email', v_user_email,
                'deep_link', '/okr/sprints/' || v_task.sprint_id::TEXT
            ),
            v_dedupe_key
        )
        ON CONFLICT (dedupe_key) DO NOTHING;
        
        IF FOUND THEN
            v_created := v_created + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_created, v_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =========================================
-- 7. RLS POLICIES
-- =========================================

-- Habilitar RLS
ALTER TABLE google_chat_dm_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_notification_outbox ENABLE ROW LEVEL SECURITY;

-- google_chat_dm_spaces: service role only (backend)
DROP POLICY IF EXISTS "service_role_dm_spaces" ON google_chat_dm_spaces;
CREATE POLICY "service_role_dm_spaces"
    ON google_chat_dm_spaces
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- okr_notification_outbox: service role for full access, users can read own
DROP POLICY IF EXISTS "service_role_outbox" ON okr_notification_outbox;
CREATE POLICY "service_role_outbox"
    ON okr_notification_outbox
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Usuários podem ver suas próprias notificações (opcional, para debug/admin)
DROP POLICY IF EXISTS "users_read_own_notifications" ON okr_notification_outbox;
CREATE POLICY "users_read_own_notifications"
    ON okr_notification_outbox
    FOR SELECT
    TO anon, authenticated
    USING (true);  -- Filtro é feito na aplicação por user_id

-- =========================================
-- 8. TRIGGER para updated_at
-- =========================================

CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_google_chat_dm_spaces_updated_at ON google_chat_dm_spaces;
CREATE TRIGGER trg_google_chat_dm_spaces_updated_at
    BEFORE UPDATE ON google_chat_dm_spaces
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_updated_at();

DROP TRIGGER IF EXISTS trg_okr_notification_outbox_updated_at ON okr_notification_outbox;
CREATE TRIGGER trg_okr_notification_outbox_updated_at
    BEFORE UPDATE ON okr_notification_outbox
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_updated_at();

-- =========================================
-- 9. VERIFICAÇÃO FINAL
-- =========================================

SELECT 
    'Tabelas de notificação OKR criadas com sucesso!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'google_chat_dm_spaces') as dm_spaces_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'okr_notification_outbox') as outbox_table;

-- ✅ Pronto! Sistema de notificações OKR configurado!
-- 
-- Para testar:
-- 1. Criar uma personal_task para um usuário
-- 2. Verificar se foi inserida em okr_notification_outbox
-- 3. Executar: SELECT * FROM fn_generate_sprint_reminders();
-- 4. Executar: SELECT * FROM fn_generate_overdue_alerts();
