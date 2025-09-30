-- 🔧 CORRIGIR AI_STATUS E ATIVAR WORKER AUTOMÁTICO
-- Execute este script no SQL Editor do Supabase

-- 1. Marcar chamadas elegíveis como 'pending' para análise
UPDATE calls 
SET ai_status = 'pending'
WHERE 
    status_voip = 'normal_clearing'
    AND EXTRACT(EPOCH FROM duration_formated::interval) >= 180
    AND LENGTH(transcription) > 100
    AND ai_status IS NULL
    AND created_at >= NOW() - INTERVAL '7 days'
    AND id NOT IN (SELECT call_id FROM call_analysis WHERE call_id IS NOT NULL);

-- 2. Verificar quantas foram marcadas
SELECT 'CHAMADAS MARCADAS COMO PENDING:' as info;
SELECT 
    ai_status,
    COUNT(*) as count
FROM calls 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY ai_status
ORDER BY count DESC;

-- 3. Criar função melhorada que busca chamadas 'pending'
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
    WHERE 
        c.ai_status = 'pending' -- Buscar apenas chamadas marcadas como pending
        AND c.status_voip = 'normal_clearing'
        AND EXTRACT(EPOCH FROM c.duration_formated::interval) >= p_min_duration_seconds
        AND LENGTH(c.transcription) > 100
        AND c.created_at >= NOW() - INTERVAL '7 days'
    ORDER BY c.created_at ASC
    LIMIT p_limit;
$$;

-- 4. Testar nova função
SELECT 'CHAMADAS PENDING PARA ANÁLISE:' as info;
SELECT COUNT(*) as pending_calls FROM get_calls_for_auto_analysis(50, 180);

-- 5. Habilitar análise automática
INSERT INTO app_settings (key, value) 
VALUES ('auto_analysis_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

SELECT 'CONFIGURAÇÃO FINAL:' as info;
SELECT key, value FROM app_settings WHERE key = 'auto_analysis_enabled';
