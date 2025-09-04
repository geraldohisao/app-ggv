-- ===================================================================
-- TESTAR FUNÇÃO GET_CALLS_WITH_FILTERS vs DADOS BRUTOS
-- ===================================================================

-- 1. Dados brutos da tabela calls - Top 10 maiores durações
SELECT 
    'DADOS BRUTOS - TOP 10 MAIORES DURAÇÕES' as source,
    id,
    deal_id,
    duration,
    ROUND(duration / 60.0, 1) as duracao_minutos,
    status_voip,
    agent_id,
    created_at
FROM calls 
WHERE duration IS NOT NULL AND duration > 0
ORDER BY duration DESC
LIMIT 10;

-- 2. Dados da função get_calls_with_filters - Top 10 maiores durações
SELECT 
    'FUNÇÃO GET_CALLS - TOP 10 MAIORES DURAÇÕES' as source,
    id,
    deal_id,
    duration,
    ROUND(duration / 60.0, 1) as duracao_minutos,
    status_voip_friendly,
    sdr_name,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0)
ORDER BY duration DESC
LIMIT 10;

-- 3. Comparar contagem total
SELECT 
    'COMPARAÇÃO TOTAL' as info,
    (SELECT COUNT(*) FROM calls WHERE duration > 100) as calls_brutos_over_100s,
    (SELECT COUNT(*) FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0) WHERE duration > 100) as calls_funcao_over_100s,
    (SELECT COUNT(*) FROM calls) as total_calls_brutos,
    (SELECT COUNT(*) FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0)) as total_calls_funcao;

-- 4. Verificar se há diferença na ordenação padrão da função
SELECT 
    'ORDENAÇÃO PADRÃO DA FUNÇÃO' as info,
    id,
    deal_id,
    duration,
    created_at
FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0)
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verificar chamadas com transcrição
SELECT 
    'CHAMADAS COM TRANSCRIÇÃO' as info,
    COUNT(*) as total_com_transcricao,
    AVG(duration) as duracao_media_com_transcricao,
    MAX(duration) as duracao_maxima_com_transcricao
FROM calls 
WHERE transcription IS NOT NULL 
    AND TRIM(transcription) != '';

-- 6. Verificar chamadas com áudio
SELECT 
    'CHAMADAS COM ÁUDIO' as info,
    COUNT(CASE WHEN recording_url IS NOT NULL AND TRIM(recording_url) != '' THEN 1 END) as com_recording_url,
    COUNT(CASE WHEN audio_path IS NOT NULL AND TRIM(audio_path) != '' THEN 1 END) as com_audio_path,
    COUNT(CASE WHEN audio_bucket IS NOT NULL AND TRIM(audio_bucket) != '' THEN 1 END) as com_audio_bucket
FROM calls;

-- 7. Ver exemplo de call com transcrição e áudio
SELECT 
    'EXEMPLO CALL COM MÍDIA' as info,
    id,
    deal_id,
    duration,
    LENGTH(transcription) as transcription_length,
    recording_url IS NOT NULL as has_recording_url,
    audio_path IS NOT NULL as has_audio_path,
    created_at
FROM calls 
WHERE (transcription IS NOT NULL AND TRIM(transcription) != '')
   OR (recording_url IS NOT NULL AND TRIM(recording_url) != '')
ORDER BY duration DESC
LIMIT 5;
