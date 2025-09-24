-- 🤖 SISTEMA DE ANÁLISE AUTOMÁTICA - VERSÃO SEGURA
-- Execute este script (verifica se já existe antes de criar)

-- ===============================================================
-- ETAPA 1: CRIAR FILA DE ANÁLISE (SE NÃO EXISTIR)
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

-- Criar índices apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analysis_queue_status_priority') THEN
        CREATE INDEX idx_analysis_queue_status_priority ON analysis_queue(status, priority DESC, created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analysis_queue_call_id') THEN
        CREATE INDEX idx_analysis_queue_call_id ON analysis_queue(call_id);
    END IF;
END $$;

-- ===============================================================
-- ETAPA 2: TRIGGER AUTOMÁTICO (SUBSTITUIR SE EXISTIR)
-- ===============================================================

CREATE OR REPLACE FUNCTION trigger_auto_analysis()
RETURNS TRIGGER AS $$
BEGIN
    -- Critérios para análise automática
    IF (NEW.duration >= 180 OR 
        (NEW.duration_formated ~ '^00:0[3-9]:[0-9]{2}$' OR 
         NEW.duration_formated ~ '^00:[1-9][0-9]:[0-9]{2}$' OR
         NEW.duration_formated ~ '^[0-9]{2}:[0-9]{2}:[0-9]{2}$'))
       AND NEW.transcription IS NOT NULL 
       AND LENGTH(TRIM(NEW.transcription)) > 50
       AND NOT EXISTS (
           SELECT 1 FROM call_analysis WHERE call_id = NEW.id
       ) THEN
        
        -- Determinar prioridade
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
            
            -- Inserir na fila (evitar duplicatas)
            INSERT INTO analysis_queue (call_id, priority, created_at) 
            VALUES (NEW.id, call_priority, NOW())
            ON CONFLICT (call_id) DO UPDATE SET
                priority = EXCLUDED.priority,
                updated_at = NOW();
                
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar erros para não quebrar a inserção da chamada
            NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS auto_analysis_trigger ON calls;
CREATE TRIGGER auto_analysis_trigger
    AFTER INSERT OR UPDATE OF transcription, duration, duration_formated ON calls
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_analysis();

-- ===============================================================
-- ETAPA 3: FUNÇÕES DE PROCESSAMENTO
-- ===============================================================

CREATE OR REPLACE FUNCTION get_next_analysis_batch(batch_size INTEGER DEFAULT 3)
RETURNS TABLE (
    queue_id UUID,
    call_id UUID,
    priority TEXT,
    call_duration INTEGER,
    transcription TEXT,
    sdr_name TEXT,
    person_name TEXT,
    enterprise TEXT
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
          AND aq.attempts < 3
        ORDER BY 
            CASE aq.priority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2  
                WHEN 'normal' THEN 3
                ELSE 4 
            END,
            aq.created_at ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
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
        COALESCE(c.insights->>'sdr_name', c.agent_id, 'SDR') as sdr_name,
        COALESCE(c.person, c.insights->>'person', 'Cliente') as person_name,
        COALESCE(c.enterprise, c.insights->>'enterprise', 'Empresa') as enterprise
    FROM selected_items si
    JOIN calls c ON c.id = si.call_id
    WHERE si.queue_id IN (SELECT queue_id FROM marked_processing);
END;
$$ LANGUAGE plpgsql;

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
-- ETAPA 4: POPULAR COM CHAMADAS EXISTENTES
-- ===============================================================

-- Adicionar chamadas recentes à fila
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
  AND c.created_at >= NOW() - INTERVAL '3 days'
  AND NOT EXISTS (
      SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM analysis_queue aq WHERE aq.call_id = c.id
  )
ORDER BY c.created_at DESC
LIMIT 50
ON CONFLICT (call_id) DO NOTHING;

-- ===============================================================
-- ETAPA 5: VERIFICAÇÃO DO SISTEMA
-- ===============================================================

SELECT 
    'SISTEMA DE ANÁLISE AUTOMÁTICA ATIVO!' as status,
    (SELECT COUNT(*) FROM analysis_queue WHERE status = 'pending') as fila_pendente,
    (SELECT COUNT(*) FROM analysis_queue WHERE status = 'completed') as ja_analisadas,
    (SELECT COUNT(*) FROM calls WHERE transcription IS NOT NULL AND duration >= 180) as chamadas_elegiveis;

-- ===============================================================
-- PRÓXIMOS PASSOS:
-- ===============================================================
-- 1. Execute este script no Supabase
-- 2. Crie o worker JavaScript que processa a fila
-- 3. Configure para rodar a cada 30-60 segundos
-- 4. Monitore via analysis_queue_stats

