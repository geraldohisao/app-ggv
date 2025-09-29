-- 🔍 VERIFICAR: Dados de Transcrição (Versão Simples)
-- Execute este script no SQL Editor do Supabase

-- 1. Estatísticas básicas
SELECT 
    'Estatísticas de Transcrição' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN "transcription" IS NOT NULL AND LENGTH("transcription") > 0 THEN 1 END) as calls_with_transcription,
    COUNT(CASE WHEN "transcription" IS NOT NULL AND LENGTH("transcription") > 20 THEN 1 END) as calls_with_good_transcription,
    COUNT(CASE WHEN "transcription" IS NOT NULL AND LENGTH("transcription") > 100 THEN 1 END) as calls_with_excellent_transcription;

-- 2. Exemplos de transcrições (primeiras 3)
SELECT 
    'Exemplos de Transcrições' as info,
    id,
    LENGTH("transcription") as transcription_length,
    LEFT("transcription", 100) as transcription_preview,
    status_voip,
    duration
FROM calls 
WHERE "transcription" IS NOT NULL 
AND LENGTH("transcription") > 0
ORDER BY created_at DESC
LIMIT 3;

-- 3. Verificar ligações sem transcrição
SELECT 
    'Ligações sem Transcrição' as info,
    COUNT(*) as calls_without_transcription
FROM calls 
WHERE "transcription" IS NULL 
OR LENGTH("transcription") = 0;

-- 4. Verificar ligações com transcrição mas muito curta
SELECT 
    'Ligações com Transcrição Curta (< 20 chars)' as info,
    COUNT(*) as calls_with_short_transcription
FROM calls 
WHERE "transcription" IS NOT NULL 
AND LENGTH("transcription") > 0 
AND LENGTH("transcription") <= 20;

-- 5. Verificar ligações com transcrição adequada (20-100 chars)
SELECT 
    'Ligações com Transcrição Adequada (20-100 chars)' as info,
    COUNT(*) as calls_with_adequate_transcription
FROM calls 
WHERE "transcription" IS NOT NULL 
AND LENGTH("transcription") > 20 
AND LENGTH("transcription") <= 100;

-- 6. Verificar ligações com transcrição excelente (> 100 chars)
SELECT 
    'Ligações com Transcrição Excelente (> 100 chars)' as info,
    COUNT(*) as calls_with_excellent_transcription
FROM calls 
WHERE "transcription" IS NOT NULL 
AND LENGTH("transcription") > 100;
