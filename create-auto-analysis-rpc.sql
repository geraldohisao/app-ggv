-- 🤖 CRIAR FUNÇÃO RPC PARA ANÁLISE AUTOMÁTICA
-- Execute este script no SQL Editor do Supabase

-- 1. Criar função get_calls_for_auto_analysis
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
        c.status_voip = 'normal_clearing' -- Apenas chamadas atendidas
        AND EXTRACT(EPOCH FROM c.duration_formated::interval) >= p_min_duration_seconds -- Duração mínima
        AND LENGTH(c.transcription) > 100 -- Transcrição com conteúdo
        AND ca.id IS NULL -- Sem análise ainda
        AND c.created_at >= NOW() - INTERVAL '7 days' -- Apenas últimos 7 dias
    ORDER BY c.created_at ASC -- Processar as mais antigas primeiro
    LIMIT p_limit;
$$;

-- 2. Conceder permissões
GRANT EXECUTE ON FUNCTION get_calls_for_auto_analysis(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_calls_for_auto_analysis(INTEGER, INTEGER) TO service_role;

-- 3. Criar configuração de análise automática
INSERT INTO app_settings (key, value, description) 
VALUES ('auto_analysis_enabled', 'true', 'Habilitar análise automática de chamadas')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- 4. Testar a função
SELECT 'Testando get_calls_for_auto_analysis:' as info;
SELECT 
    id,
    agent_id,
    enterprise,
    LENGTH(transcription) as transcription_length,
    duration_formated,
    ai_status
FROM get_calls_for_auto_analysis(5, 180);

-- 5. Verificar configurações
SELECT 'Configurações atuais:' as info;
SELECT key, value, description 
FROM app_settings 
WHERE key LIKE '%auto_analysis%';
