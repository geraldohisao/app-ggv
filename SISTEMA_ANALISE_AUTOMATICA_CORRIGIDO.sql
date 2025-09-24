-- 🤖 SISTEMA DE ANÁLISE AUTOMÁTICA - VERSÃO CORRIGIDA
-- Ajustado para usar priority como INTEGER

-- ===============================================================
-- ETAPA 1: VERIFICAR ESTRUTURA EXISTENTE DA TABELA
-- ===============================================================

SELECT 
    'ESTRUTURA ATUAL DA analysis_queue' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'analysis_queue'
ORDER BY ordinal_position;

-- ===============================================================
-- ETAPA 2: AJUSTAR PARA USAR PRIORITY COMO INTEGER
-- ===============================================================

-- Se priority é INTEGER, usar valores numéricos:
-- 1 = urgent, 2 = high, 3 = normal, 4 = low

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
        
        -- Determinar prioridade como INTEGER
        DECLARE
            call_priority INTEGER := 3; -- normal
        BEGIN
            IF NEW.duration >= 600 OR NEW.call_type = 'demo' THEN
                call_priority := 2; -- high
            ELSIF NEW.duration >= 300 THEN
                call_priority := 3; -- normal
            ELSE
                call_priority := 4; -- low
            END IF;
            
            -- Inserir na fila
            INSERT INTO analysis_queue (call_id, priority, created_at) 
            VALUES (NEW.id, call_priority, NOW())
            ON CONFLICT (call_id) DO UPDATE SET
                priority = EXCLUDED.priority,
                updated_at = NOW();
                
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar erros para não quebrar inserção da chamada
            NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- ETAPA 3: RECRIAR TRIGGER
-- ===============================================================

DROP TRIGGER IF EXISTS auto_analysis_trigger ON calls;
CREATE TRIGGER auto_analysis_trigger
    AFTER INSERT OR UPDATE OF transcription, duration, duration_formated ON calls
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_analysis();

-- ===============================================================
-- ETAPA 4: FUNÇÃO PARA BUSCAR PRÓXIMO LOTE (PRIORITY INTEGER)
-- ===============================================================

CREATE OR REPLACE FUNCTION get_next_analysis_batch(batch_size INTEGER DEFAULT 3)
RETURNS TABLE (
    queue_id UUID,
    call_id UUID,
    priority INTEGER,
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
        ORDER BY aq.priority ASC, aq.created_at ASC  -- 1=urgent primeiro
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

-- ===============================================================
-- ETAPA 5: POPULAR FILA COM CHAMADAS EXISTENTES (PRIORITY INTEGER)
-- ===============================================================

INSERT INTO analysis_queue (call_id, priority, created_at)
SELECT 
    c.id,
    CASE 
        WHEN c.duration >= 600 THEN 2  -- high
        WHEN c.duration >= 300 THEN 3  -- normal
        ELSE 4                         -- low
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
-- ETAPA 6: VERIFICAÇÃO FINAL
-- ===============================================================

SELECT 
    'SISTEMA AUTOMÁTICO CONFIGURADO!' as status,
    (SELECT COUNT(*) FROM analysis_queue WHERE status = 'pending') as fila_pendente,
    (SELECT COUNT(*) FROM analysis_queue WHERE status = 'completed') as ja_analisadas;

-- ===============================================================
-- COMANDOS ÚTEIS:
-- ===============================================================

-- Ver próximo lote para processar:
-- SELECT * FROM get_next_analysis_batch(5);

-- Marcar análise como concluída:
-- SELECT complete_analysis('[queue_id]'::uuid, true);

-- Ver estatísticas:
-- SELECT status, priority, COUNT(*) FROM analysis_queue GROUP BY status, priority;

