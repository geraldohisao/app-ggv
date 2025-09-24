-- 🤖 SISTEMA DE ANÁLISE AUTOMÁTICA OTIMIZADO
-- Execute este script para implementar análise automática eficiente

-- ===============================================================
-- ETAPA 1: CRIAR FILA DE ANÁLISE ASSÍNCRONA
-- ===============================================================

CREATE TABLE IF NOT EXISTS analysis_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_analysis_queue_status_priority ON analysis_queue(status, priority DESC, created_at);
CREATE INDEX idx_analysis_queue_call_id ON analysis_queue(call_id);

-- ===============================================================
-- ETAPA 2: TRIGGER AUTOMÁTICO PARA NOVAS CHAMADAS
-- ===============================================================

CREATE OR REPLACE FUNCTION trigger_auto_analysis()
RETURNS TRIGGER AS $$
BEGIN
    -- Critérios para análise automática:
    -- 1. Chamada tem duração >= 3 minutos
    -- 2. Tem transcrição válida
    -- 3. Não foi analisada ainda
    IF (NEW.duration >= 180 OR 
        (NEW.duration_formated ~ '^00:0[3-9]:[0-9]{2}$' OR 
         NEW.duration_formated ~ '^00:[1-9][0-9]:[0-9]{2}$' OR
         NEW.duration_formated ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$'))
       AND NEW.transcription IS NOT NULL 
       AND LENGTH(TRIM(NEW.transcription)) > 50
       AND NOT EXISTS (
           SELECT 1 FROM call_analysis WHERE call_id = NEW.id
       ) THEN
        
        -- Determinar prioridade baseada na duração e tipo
        DECLARE
            call_priority TEXT := 'normal';
        BEGIN
            IF NEW.duration >= 600 OR NEW.call_type = 'demo' THEN
                call_priority := 'high';
            ELSIF NEW.duration >= 300 THEN
                call_priority := 'normal';
            ELSE
                call_priority := 'low';
            END IF;
            
            -- Inserir na fila (sem duplicatas)
            INSERT INTO analysis_queue (call_id, priority, created_at) 
            VALUES (NEW.id, call_priority, NOW())
            ON CONFLICT (call_id) DO NOTHING;
            
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS auto_analysis_trigger ON calls;
CREATE TRIGGER auto_analysis_trigger
    AFTER INSERT OR UPDATE OF transcription, duration, duration_formated ON calls
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_analysis();

-- ===============================================================
-- ETAPA 3: FUNÇÃO PARA BUSCAR PRÓXIMA CHAMADA DA FILA
-- ===============================================================

CREATE OR REPLACE FUNCTION get_next_analysis_batch(batch_size INTEGER DEFAULT 3)
RETURNS TABLE (
    queue_id UUID,
    call_id UUID,
    priority TEXT,
    call_duration INTEGER,
    transcription TEXT,
    sdr_name TEXT,
    person_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH selected_items AS (
        SELECT 
            aq.id as queue_id,
            aq.call_id,
            aq.priority
        FROM analysis_queue aq
        WHERE aq.status = 'pending'
          AND aq.attempts < 3  -- Máx 3 tentativas
        ORDER BY 
            CASE aq.priority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2  
                WHEN 'normal' THEN 3
                ELSE 4 
            END,
            aq.created_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED  -- Evitar lock entre workers
    ),
    marked_processing AS (
        UPDATE analysis_queue 
        SET status = 'processing', updated_at = NOW()
        WHERE id IN (SELECT queue_id FROM selected_items)
        RETURNING id as queue_id
    )
    SELECT 
        si.queue_id,
        si.call_id,
        si.priority,
        c.duration as call_duration,
        c.transcription,
        COALESCE(c.insights->>'sdr_name', c.agent_id) as sdr_name,
        COALESCE(c.person, c.insights->>'person', 'Cliente') as person_name
    FROM selected_items si
    JOIN calls c ON c.id = si.call_id
    WHERE si.queue_id IN (SELECT queue_id FROM marked_processing);
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- ETAPA 4: FUNÇÃO PARA MARCAR ANÁLISE COMO CONCLUÍDA
-- ===============================================================

CREATE OR REPLACE FUNCTION complete_analysis(
    p_queue_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF p_success THEN
        UPDATE analysis_queue 
        SET status = 'completed', 
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_queue_id;
    ELSE
        UPDATE analysis_queue 
        SET status = 'failed',
            attempts = attempts + 1,
            error_message = p_error_message,
            updated_at = NOW()
        WHERE id = p_queue_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- ETAPA 5: MONITORAMENTO DA FILA
-- ===============================================================

CREATE OR REPLACE VIEW analysis_queue_stats AS
SELECT 
    status,
    priority,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM analysis_queue 
GROUP BY status, priority
ORDER BY status, priority;

-- ===============================================================
-- ETAPA 6: LIMPEZA AUTOMÁTICA (manter histórico por 7 dias)
-- ===============================================================

CREATE OR REPLACE FUNCTION cleanup_analysis_queue()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analysis_queue 
    WHERE status IN ('completed', 'failed')
      AND updated_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- ETAPA 7: POPULAR FILA COM CHAMADAS EXISTENTES (OPCIONAL)
-- ===============================================================

-- Analisar chamadas recentes que ainda não foram processadas
INSERT INTO analysis_queue (call_id, priority, created_at)
SELECT 
    c.id,
    CASE 
        WHEN c.duration >= 600 THEN 'high'
        WHEN c.duration >= 300 THEN 'normal' 
        ELSE 'low'
    END,
    c.created_at
FROM calls c
WHERE c.duration >= 180
  AND c.transcription IS NOT NULL
  AND LENGTH(TRIM(c.transcription)) > 50
  AND c.created_at >= NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
      SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM analysis_queue aq WHERE aq.call_id = c.id
  )
ORDER BY c.created_at DESC
LIMIT 100;

-- ===============================================================
-- ✅ SISTEMA PRONTO!
-- ===============================================================

SELECT 
    'Sistema de análise automática configurado!' as status,
    (SELECT COUNT(*) FROM analysis_queue WHERE status = 'pending') as chamadas_na_fila;

-- ===============================================================
-- COMANDOS ÚTEIS PARA MONITORAMENTO:
-- ===============================================================

-- Ver estatísticas da fila:
-- SELECT * FROM analysis_queue_stats;

-- Processar próximo lote:
-- SELECT * FROM get_next_analysis_batch(5);

-- Marcar como concluída:
-- SELECT complete_analysis('[queue_id]', true);

-- Limpar fila antiga:
-- SELECT cleanup_analysis_queue();