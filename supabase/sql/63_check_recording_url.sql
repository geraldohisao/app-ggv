-- ===================================================================
-- VERIFICAR DADOS COM RECORDING_URL
-- ===================================================================

-- 1. Verificar colunas da tabela calls
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name IN ('recording_url', 'duration_sec', 'duration', 'call_duration')
ORDER BY column_name;

-- 2. Verificar chamadas com recording_url
SELECT 
    id,
    enterprise,
    recording_url,
    duration,
    CASE 
        WHEN recording_url IS NOT NULL AND duration > 180 THEN 'DEVE MOSTRAR PLAYER'
        WHEN recording_url IS NOT NULL AND duration <= 180 THEN 'TEM ÁUDIO MAS < 3MIN'
        WHEN recording_url IS NULL THEN 'SEM ÁUDIO'
        ELSE 'OUTRO'
    END as status_player
FROM calls 
WHERE recording_url IS NOT NULL OR duration > 180
ORDER BY duration DESC
LIMIT 10;

-- 3. Estatísticas de áudio
SELECT 
    COUNT(*) as total_calls,
    COUNT(recording_url) as calls_with_recording,
    COUNT(CASE WHEN recording_url IS NOT NULL AND duration > 180 THEN 1 END) as should_show_player,
    ROUND(AVG(duration)) as avg_duration_sec
FROM calls;

-- 4. Mostrar algumas URLs de exemplo
SELECT 
    id,
    enterprise,
    recording_url,
    duration
FROM calls 
WHERE recording_url IS NOT NULL
LIMIT 5;
