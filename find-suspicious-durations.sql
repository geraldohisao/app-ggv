-- 🔍 ENCONTRAR: Chamadas com duração suspeita
-- Procurando por chamadas que podem ter duration incorreto no banco

SELECT
    id,
    person,
    enterprise,
    created_at,
    duration,
    duration_formated,
    CASE
        WHEN recording_url IS NOT NULL THEN '✅ Tem áudio'
        ELSE '❌ Sem áudio'
    END as audio_status
FROM calls
WHERE
    duration IS NOT NULL
    AND duration > 0
    AND duration <= 30  -- Duração suspeita: 30 segundos ou menos
    AND recording_url IS NOT NULL  -- Mas tem áudio (então pode ser incorreto)
ORDER BY created_at DESC
LIMIT 20;

-- 📊 Estatísticas gerais
SELECT
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN duration <= 10 THEN 1 END) as duracao_menor_10s,
    COUNT(CASE WHEN duration <= 30 THEN 1 END) as duracao_menor_30s,
    COUNT(CASE WHEN duration <= 60 THEN 1 END) as duracao_menor_1min,
    AVG(duration) as duracao_media_segundos,
    MIN(duration) as duracao_minima,
    MAX(duration) as duracao_maxima
FROM calls
WHERE duration > 0;
