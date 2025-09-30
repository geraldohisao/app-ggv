-- 🤖 CRIAR: Função para buscar ligações elegíveis para análise automática
-- Execute este script no SQL Editor do Supabase

-- 1. Criar função para buscar ligações elegíveis
CREATE OR REPLACE FUNCTION get_calls_for_auto_analysis(
    p_limit INTEGER DEFAULT 10,
    p_min_duration_seconds INTEGER DEFAULT 180
)
RETURNS TABLE (
    id UUID,
    transcription TEXT,
    enterprise TEXT,
    person TEXT,
    agent_id TEXT,
    call_type TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ,
    status_voip TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.transcription,
        c.enterprise,
        c.person,
        c.agent_id,
        c.call_type,
        EXTRACT(EPOCH FROM c.duration_formated::interval)::INTEGER as duration_seconds,
        c.created_at,
        c.status_voip
    FROM calls c
    LEFT JOIN call_analysis ca ON ca.call_id = c.id
    WHERE 
        -- Ligação atendida
        c.status_voip = 'normal_clearing'
        -- Duração mínima (3 minutos por padrão)
        AND c.duration_formated IS NOT NULL
        AND EXTRACT(EPOCH FROM c.duration_formated::interval) >= p_min_duration_seconds
        -- Tem transcrição
        AND c.transcription IS NOT NULL
        AND LENGTH(c.transcription) > 100
        -- Não foi analisada ainda ou falhou
        AND (ca.id IS NULL OR c.ai_status = 'failed' OR c.ai_status = 'pending')
        -- Ligação recente (últimas 24h para evitar reprocessar tudo)
        AND c.created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY c.created_at DESC
    LIMIT p_limit;
$$;

-- 2. Conceder permissões
GRANT EXECUTE ON FUNCTION get_calls_for_auto_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_calls_for_auto_analysis TO service_role;

-- 3. Testar função
SELECT 'Testando função get_calls_for_auto_analysis:' as info;
SELECT 
    id,
    enterprise,
    person,
    agent_id,
    duration_seconds,
    LENGTH(transcription) as transcription_length,
    created_at
FROM get_calls_for_auto_analysis(5, 120); -- 5 ligações, min 2 minutos

-- 4. Configurar análise automática como habilitada
INSERT INTO app_settings (key, value)
VALUES ('auto_analysis_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- 5. Configurar parâmetros do worker
INSERT INTO app_settings (key, value)
VALUES ('auto_analysis_config', '{"enabled":true,"interval":30000,"batchSize":5,"minDuration":180,"maxRetries":2}')
ON CONFLICT (key) DO UPDATE SET value = '{"enabled":true,"interval":30000,"batchSize":5,"minDuration":180,"maxRetries":2}';

SELECT 'Análise automática configurada e habilitada!' as status;
