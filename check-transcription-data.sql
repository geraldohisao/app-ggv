-- 🔍 VERIFICAR: Dados de Transcrição
-- Este script verifica se existem transcrições válidas no banco

-- 1. Verificar ligações com transcrição
SELECT '1. Ligações com transcrição válida:' as info;
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN transcription IS NOT NULL AND LENGTH(transcription) > 0 THEN 1 END) as calls_with_transcription,
    COUNT(CASE WHEN transcription IS NOT NULL AND LENGTH(transcription) > 20 THEN 1 END) as calls_with_good_transcription,
    COUNT(CASE WHEN transcription IS NOT NULL AND LENGTH(transcription) > 100 THEN 1 END) as calls_with_excellent_transcription
FROM calls;

-- 2. Exemplos de transcrições (primeiras 5)
SELECT '2. Exemplos de transcrições:' as info;
SELECT 
    id,
    LENGTH(transcription) as transcription_length,
    LEFT(transcription, 100) as transcription_preview,
    status_voip,
    duration
FROM calls 
WHERE transcription IS NOT NULL 
AND LENGTH(transcription) > 0
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar ligações sem transcrição
SELECT '3. Ligações sem transcrição:' as info;
SELECT 
    COUNT(*) as calls_without_transcription
FROM calls 
WHERE transcription IS NULL 
OR LENGTH(transcription) = 0;

-- 4. Verificar ligações com transcrição mas muito curta
SELECT '4. Ligações com transcrição curta (< 20 chars):' as info;
SELECT 
    COUNT(*) as calls_with_short_transcription
FROM calls 
WHERE transcription IS NOT NULL 
AND LENGTH(transcription) > 0 
AND LENGTH(transcription) <= 20;

-- 5. Verificar ligações com transcrição adequada (20-100 chars)
SELECT '5. Ligações com transcrição adequada (20-100 chars):' as info;
SELECT 
    COUNT(*) as calls_with_adequate_transcription
FROM calls 
WHERE transcription IS NOT NULL 
AND LENGTH(transcription) > 20 
AND LENGTH(transcription) <= 100;

-- 6. Verificar ligações com transcrição excelente (> 100 chars)
SELECT '6. Ligações com transcrição excelente (> 100 chars):' as info;
SELECT 
    COUNT(*) as calls_with_excellent_transcription
FROM calls 
WHERE transcription IS NOT NULL 
AND LENGTH(transcription) > 100;
