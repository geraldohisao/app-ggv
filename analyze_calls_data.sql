-- ===================================================================
-- ANÁLISE DOS DADOS DE CHAMADAS - Verificar durações e dados
-- ===================================================================

-- 1. Estatísticas gerais da tabela calls
SELECT 
    '=== ESTATÍSTICAS GERAIS ===' as info;

SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration IS NOT NULL AND duration > 0 THEN 1 END) as calls_com_duracao,
    COUNT(CASE WHEN duration > 100 THEN 1 END) as calls_mais_100_segundos,
    COUNT(CASE WHEN duration > 300 THEN 1 END) as calls_mais_5_minutos,
    COUNT(CASE WHEN transcription IS NOT NULL AND TRIM(transcription) != '' THEN 1 END) as calls_com_transcricao,
    COUNT(CASE WHEN recording_url IS NOT NULL AND TRIM(recording_url) != '' THEN 1 END) as calls_com_audio_url,
    COUNT(CASE WHEN audio_path IS NOT NULL AND TRIM(audio_path) != '' THEN 1 END) as calls_com_audio_path,
    MIN(duration) as min_duration,
    MAX(duration) as max_duration,
    AVG(duration) as avg_duration,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_duration
FROM calls;

-- 2. Distribuição de durações
SELECT 
    '=== DISTRIBUIÇÃO DE DURAÇÕES ===' as info;

SELECT 
    CASE 
        WHEN duration IS NULL THEN 'NULL'
        WHEN duration = 0 THEN '0 segundos'
        WHEN duration BETWEEN 1 AND 30 THEN '1-30 segundos'
        WHEN duration BETWEEN 31 AND 60 THEN '31-60 segundos'
        WHEN duration BETWEEN 61 AND 120 THEN '1-2 minutos'
        WHEN duration BETWEEN 121 AND 300 THEN '2-5 minutos'
        WHEN duration BETWEEN 301 AND 600 THEN '5-10 minutos'
        WHEN duration > 600 THEN 'Mais de 10 minutos'
    END as faixa_duracao,
    COUNT(*) as quantidade,
    ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM calls)), 1) as percentual
FROM calls
GROUP BY 
    CASE 
        WHEN duration IS NULL THEN 'NULL'
        WHEN duration = 0 THEN '0 segundos'
        WHEN duration BETWEEN 1 AND 30 THEN '1-30 segundos'
        WHEN duration BETWEEN 31 AND 60 THEN '31-60 segundos'
        WHEN duration BETWEEN 61 AND 120 THEN '1-2 minutos'
        WHEN duration BETWEEN 121 AND 300 THEN '2-5 minutos'
        WHEN duration BETWEEN 301 AND 600 THEN '5-10 minutos'
        WHEN duration > 600 THEN 'Mais de 10 minutos'
    END
ORDER BY quantidade DESC;

-- 3. Exemplos de chamadas com maior duração
SELECT 
    '=== TOP 10 CHAMADAS COM MAIOR DURAÇÃO ===' as info;

SELECT 
    id,
    deal_id,
    agent_id,
    duration,
    ROUND(duration / 60.0, 1) as duracao_minutos,
    status_voip,
    CASE 
        WHEN transcription IS NOT NULL AND TRIM(transcription) != '' THEN 'TEM TRANSCRIÇÃO'
        ELSE 'SEM TRANSCRIÇÃO'
    END as tem_transcricao,
    CASE 
        WHEN recording_url IS NOT NULL AND TRIM(recording_url) != '' THEN 'TEM AUDIO URL'
        WHEN audio_path IS NOT NULL AND TRIM(audio_path) != '' THEN 'TEM AUDIO PATH'
        ELSE 'SEM ÁUDIO'
    END as tem_audio,
    created_at
FROM calls 
WHERE duration IS NOT NULL
ORDER BY duration DESC
LIMIT 10;

-- 4. Verificar dados de áudio e transcrição
SELECT 
    '=== ANÁLISE DE ÁUDIO E TRANSCRIÇÃO ===' as info;

SELECT 
    status_voip,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN recording_url IS NOT NULL AND TRIM(recording_url) != '' THEN 1 END) as com_recording_url,
    COUNT(CASE WHEN audio_path IS NOT NULL AND TRIM(audio_path) != '' THEN 1 END) as com_audio_path,
    COUNT(CASE WHEN transcription IS NOT NULL AND TRIM(transcription) != '' THEN 1 END) as com_transcricao,
    ROUND(AVG(duration), 1) as duracao_media
FROM calls
GROUP BY status_voip
ORDER BY total_calls DESC;

-- 5. Verificar chamadas específicas com transcrição
SELECT 
    '=== EXEMPLOS DE CHAMADAS COM TRANSCRIÇÃO ===' as info;

SELECT 
    id,
    deal_id,
    agent_id,
    duration,
    status_voip,
    LENGTH(transcription) as tamanho_transcricao,
    LEFT(transcription, 100) || '...' as preview_transcricao,
    recording_url IS NOT NULL as tem_recording_url,
    audio_path IS NOT NULL as tem_audio_path,
    created_at
FROM calls 
WHERE transcription IS NOT NULL 
    AND TRIM(transcription) != ''
ORDER BY created_at DESC
LIMIT 5;

-- 6. Verificar estrutura completa de uma call
SELECT 
    '=== ESTRUTURA COMPLETA DE UMA CALL RECENTE ===' as info;

SELECT 
    id,
    provider_call_id,
    from_number,
    to_number,
    agent_id,
    sdr_id,
    deal_id,
    call_type,
    direction,
    status,
    status_voip,
    duration,
    recording_url,
    audio_bucket,
    audio_path,
    transcript_status,
    ai_status,
    CASE WHEN transcription IS NOT NULL THEN LENGTH(transcription) ELSE NULL END as transcription_length,
    CASE WHEN insights IS NOT NULL THEN jsonb_pretty(insights) ELSE NULL END as insights_preview,
    CASE WHEN scorecard IS NOT NULL THEN jsonb_pretty(scorecard) ELSE NULL END as scorecard_preview,
    created_at,
    updated_at,
    processed_at
FROM calls 
ORDER BY created_at DESC
LIMIT 1;

-- 7. Comparar com função get_calls_with_filters
SELECT 
    '=== COMPARAÇÃO COM FUNÇÃO get_calls_with_filters ===' as comparacao;

SELECT 
    COUNT(*) as total_na_funcao,
    COUNT(CASE WHEN duration > 100 THEN 1 END) as mais_100s_na_funcao,
    AVG(duration) as duracao_media_na_funcao,
    MAX(duration) as duracao_maxima_na_funcao
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);

SELECT 'ANÁLISE DOS DADOS DE CHAMADAS CONCLUÍDA!' as status;
