-- ===================================================================
-- TESTE SIMPLES CORRIGIDO - Verificar duração com GROUP BY correto
-- ===================================================================

-- 1. Verificar dados básicos
SELECT 
    'DADOS BÁSICOS' as teste,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN 1 END) as atendidas_com_duracao
FROM calls 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 2. Verificar duração média simples
SELECT 
    'DURAÇÃO MÉDIA SIMPLES' as teste,
    AVG(duration) as duracao_todas,
    AVG(CASE WHEN status_voip = 'normal_clearing' THEN duration END) as duracao_atendidas,
    AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration END) as duracao_atendidas_positiva
FROM calls 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 3. Testar função atual
SELECT 
    'FUNÇÃO ATUAL' as teste;

SELECT 
    sdr_name,
    total_calls,
    answered_calls,
    avg_duration,
    ROUND(avg_duration / 60, 1) as avg_minutes
FROM public.get_sdr_metrics(30) 
LIMIT 5;

-- 4. Teste manual por SDR com GROUP BY correto
SELECT 
    'TESTE MANUAL POR SDR' as teste;

WITH sdr_mapping AS (
    SELECT 
        agent_id,
        CASE 
            WHEN agent_id ILIKE '%mariana%' THEN 'Mariana Costa'
            WHEN agent_id ILIKE '%camila%' THEN 'Camila Ataliba'
            WHEN agent_id ILIKE '%andressa%' THEN 'Andressa Habinoski'
            WHEN agent_id ILIKE '%ruama%' THEN 'Lô-Ruama Oliveira'
            ELSE COALESCE(agent_id, 'Desconhecido')
        END as sdr_name,
        status_voip,
        duration
    FROM calls 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    AND agent_id IS NOT NULL
    AND agent_id != ''
)
SELECT 
    sdr_name,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as answered_calls,
    AVG(CASE 
        WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration::NUMERIC 
        ELSE NULL 
    END) as avg_duration_seconds,
    ROUND(AVG(CASE 
        WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration::NUMERIC 
        ELSE NULL 
    END) / 60, 1) as avg_duration_minutes
FROM sdr_mapping
GROUP BY sdr_name
HAVING COUNT(*) > 5  -- Só SDRs com mais de 5 chamadas
ORDER BY total_calls DESC;

-- 5. Verificar chamadas específicas da Mariana
SELECT 
    'CHAMADAS MARIANA DETALHADAS' as teste;

SELECT 
    agent_id,
    status_voip,
    duration,
    ROUND(duration / 60.0, 1) as duration_minutes,
    created_at::date as data_chamada
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND status_voip = 'normal_clearing'
AND duration > 0
AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY duration DESC
LIMIT 10;

-- 6. Resumo final
SELECT 
    'RESUMO FINAL' as teste;

SELECT 
    'Mariana Costa' as sdr,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN 1 END) as atendidas_com_duracao,
    AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration END) as duracao_media_segundos,
    ROUND(AVG(CASE WHEN status_voip = 'normal_clearing' AND duration > 0 THEN duration END) / 60, 1) as duracao_media_minutos
FROM calls 
WHERE agent_id ILIKE '%mariana%' 
AND created_at >= NOW() - INTERVAL '30 days';

SELECT 'TESTE COMPLETO - SEM ERROS DE GROUP BY' as status;
