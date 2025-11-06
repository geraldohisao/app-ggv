-- 🔍 DEBUG: Chamada de 36 segundos com análise
-- ID: 565b53ea-a28c-42a6-9a8c-012a4edde8a6

-- 1. Verificar dados da chamada
SELECT 
    id,
    duration,
    duration_formated,
    duration_seconds,
    transcription IS NOT NULL as has_transcription,
    LENGTH(transcription) as transcription_length,
    created_at,
    answered_at,
    ended_at,
    EXTRACT(EPOCH FROM (ended_at - answered_at))::int as calculated_duration
FROM calls 
WHERE id = '565b53ea-a28c-42a6-9a8c-012a4edde8a6';

-- 2. Verificar se tem análise
SELECT 
    id,
    call_id,
    final_grade,
    overall_score,
    max_possible_score,
    created_at as analysis_created_at,
    processing_time_ms
FROM call_analysis 
WHERE call_id = '565b53ea-a28c-42a6-9a8c-012a4edde8a6';

-- 3. Verificar histórico de análises (se houver tabela de auditoria)
SELECT 
    *
FROM call_analysis 
WHERE call_id = '565b53ea-a28c-42a6-9a8c-012a4edde8a6'
ORDER BY created_at DESC;

-- 4. Verificar transcrição
SELECT 
    transcription,
    LENGTH(transcription) as length
FROM calls 
WHERE id = '565b53ea-a28c-42a6-9a8c-012a4edde8a6';

-- 5. PROBLEMA IDENTIFICADO:
-- Esta chamada tem apenas 36 segundos mas TEM análise no banco
-- Isso significa que:
-- A) A análise foi feita quando tinha duração diferente (bug de duração)
-- B) A análise foi feita sem validação (bug de validação)
-- C) A duração foi alterada DEPOIS da análise

-- 6. VERIFICAR OUTRAS CHAMADAS CURTAS COM ANÁLISE
SELECT 
    c.id,
    c.duration,
    c.duration_formated,
    ca.final_grade,
    ca.created_at as analysis_date
FROM calls c
INNER JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.duration < 60  -- Chamadas com menos de 1 minuto
ORDER BY ca.created_at DESC
LIMIT 20;

-- 7. SOLUÇÃO RECOMENDADA:
-- Adicionar validação na hora de CARREGAR análise existente
-- NÃO apenas na hora de CRIAR nova análise

