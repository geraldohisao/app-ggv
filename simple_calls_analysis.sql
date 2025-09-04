-- ===================================================================
-- ANÁLISE SIMPLES DOS DADOS DE CHAMADAS
-- ===================================================================

-- 1. Contar total de chamadas
SELECT COUNT(*) as total_calls FROM calls;

-- 2. Verificar durações básicas
SELECT 
    MIN(duration) as min_duration,
    MAX(duration) as max_duration,
    AVG(duration) as avg_duration,
    COUNT(CASE WHEN duration > 100 THEN 1 END) as calls_over_100s
FROM calls;

-- 3. Ver 5 chamadas com maior duração
SELECT 
    id,
    deal_id,
    duration,
    status_voip,
    created_at
FROM calls 
WHERE duration IS NOT NULL
ORDER BY duration DESC
LIMIT 5;

-- 4. Ver distribuição básica de durações
SELECT 
    CASE 
        WHEN duration IS NULL THEN 'NULL'
        WHEN duration = 0 THEN '0 segundos'
        WHEN duration <= 60 THEN '1-60 segundos'
        WHEN duration <= 300 THEN '1-5 minutos'
        ELSE 'Mais de 5 minutos'
    END as faixa,
    COUNT(*) as quantidade
FROM calls
GROUP BY 
    CASE 
        WHEN duration IS NULL THEN 'NULL'
        WHEN duration = 0 THEN '0 segundos'
        WHEN duration <= 60 THEN '1-60 segundos'
        WHEN duration <= 300 THEN '1-5 minutos'
        ELSE 'Mais de 5 minutos'
    END;

-- 5. Verificar transcrições
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN transcription IS NOT NULL AND TRIM(transcription) != '' THEN 1 END) as com_transcricao,
    COUNT(CASE WHEN recording_url IS NOT NULL AND TRIM(recording_url) != '' THEN 1 END) as com_recording_url
FROM calls;

-- 6. Ver uma chamada completa de exemplo
SELECT * FROM calls ORDER BY created_at DESC LIMIT 1;
