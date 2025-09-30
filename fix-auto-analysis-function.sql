-- 🔧 CORRIGIR FUNÇÃO get_calls_for_auto_analysis
-- Execute cada comando separadamente no SQL Editor

-- Comando 1: Remover função existente
DROP FUNCTION IF EXISTS get_calls_for_auto_analysis(integer, integer);

-- Comando 2: Criar função correta
CREATE OR REPLACE FUNCTION get_calls_for_auto_analysis(
    p_limit INTEGER DEFAULT 10,
    p_min_duration_seconds INTEGER DEFAULT 180
)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    transcription TEXT,
    agent_id TEXT,
    enterprise TEXT,
    person TEXT,
    duration_formated TEXT,
    created_at TIMESTAMPTZ,
    ai_status TEXT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        c.provider_call_id,
        c.transcription,
        c.agent_id,
        c.enterprise,
        c.person,
        c.duration_formated,
        c.created_at,
        c.ai_status
    FROM calls c
    LEFT JOIN call_analysis ca ON ca.call_id = c.id
    WHERE 
        c.status_voip = 'normal_clearing'
        AND EXTRACT(EPOCH FROM c.duration_formated::interval) >= p_min_duration_seconds
        AND LENGTH(c.transcription) > 100
        AND ca.id IS NULL
        AND c.created_at >= NOW() - INTERVAL '7 days'
    ORDER BY c.created_at ASC
    LIMIT p_limit;
$$;

-- Comando 3: Habilitar análise automática
INSERT INTO app_settings (key, value, description) 
VALUES ('auto_analysis_enabled', 'true', 'Habilitar análise automática de chamadas')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- Comando 4: Testar função
SELECT * FROM get_calls_for_auto_analysis(5, 180);
