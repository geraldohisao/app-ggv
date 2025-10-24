-- 🔍 INVESTIGAÇÃO: Inconsistências de Duração nas Chamadas
-- Analisando a chamada ID 65711 que mostra valores diferentes

-- 1. ESTRUTURA DA TABELA - Ver todos os campos de duração
SELECT '=== CAMPOS DE DURAÇÃO NA TABELA CALLS ===' as info;
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'calls'
AND column_name ILIKE '%duration%'
ORDER BY ordinal_position;

-- 2. VERIFICAR CHAMADA ESPECÍFICA (ID 65711)
SELECT '=== DADOS DA CHAMADA 65711 (LAN Solar) ===' as info;
SELECT 
    id,
    client_name,
    sdr_name,
    -- Campos de duração
    duration_sec,
    duration,
    -- Metadados da chamada
    call_status,
    audio_url,
    LENGTH(audio_url) as audio_url_length,
    -- Transcrição
    CASE 
        WHEN transcription IS NOT NULL THEN LENGTH(transcription)
        ELSE 0
    END as transcription_length,
    -- Timestamps
    created_at,
    started_at,
    answered_at,
    ended_at,
    -- Calcular duração real baseada em timestamps
    CASE 
        WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - answered_at))::int
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at))::int
        ELSE NULL
    END as calculated_duration_sec
FROM calls
WHERE id = 65711;

-- 3. VERIFICAR TODAS AS CHAMADAS COM INCONSISTÊNCIAS
SELECT '=== CHAMADAS COM INCONSISTÊNCIAS DE DURAÇÃO ===' as info;
SELECT 
    id,
    client_name,
    sdr_name,
    duration_sec as duration_sec_field,
    duration as duration_field,
    CASE 
        WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - answered_at))::int
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at))::int
        ELSE NULL
    END as calculated_from_timestamps,
    -- Diferença entre os campos
    ABS(
        duration_sec - 
        COALESCE(
            CASE 
                WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (ended_at - answered_at))::int
                ELSE NULL
            END,
            0
        )
    ) as difference_sec,
    created_at
FROM calls
WHERE duration_sec IS NOT NULL
AND (
    -- Casos onde há grande diferença
    ABS(
        duration_sec - 
        COALESCE(
            CASE 
                WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (ended_at - answered_at))::int
                ELSE 0
            END,
            0
        )
    ) > 60
    OR
    -- Ou onde duration_sec é muito diferente de duration
    (duration IS NOT NULL AND ABS(duration_sec - duration) > 60)
)
ORDER BY created_at DESC
LIMIT 20;

-- 4. ESTATÍSTICAS DE INCONSISTÊNCIAS
SELECT '=== ESTATÍSTICAS GERAIS ===' as info;
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration_sec IS NOT NULL THEN 1 END) as with_duration_sec,
    COUNT(CASE WHEN duration IS NOT NULL THEN 1 END) as with_duration,
    COUNT(CASE WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL THEN 1 END) as with_timestamps,
    -- Inconsistências
    COUNT(CASE 
        WHEN duration_sec IS NOT NULL 
        AND answered_at IS NOT NULL 
        AND ended_at IS NOT NULL
        AND ABS(
            duration_sec - EXTRACT(EPOCH FROM (ended_at - answered_at))::int
        ) > 60
        THEN 1 
    END) as inconsistent_calls,
    -- Porcentagem
    ROUND(
        COUNT(CASE 
            WHEN duration_sec IS NOT NULL 
            AND answered_at IS NOT NULL 
            AND ended_at IS NOT NULL
            AND ABS(
                duration_sec - EXTRACT(EPOCH FROM (ended_at - answered_at))::int
            ) > 60
            THEN 1 
        END)::numeric / NULLIF(COUNT(*), 0) * 100,
        2
    ) as inconsistency_percentage
FROM calls;

-- 5. VERIFICAR FUNÇÃO get_call_detail
SELECT '=== ANALISANDO FUNÇÃO get_call_detail ===' as info;
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_call_detail'
AND routine_type = 'FUNCTION';

-- 6. ANÁLISE DE ORIGEM DOS DADOS
SELECT '=== POSSÍVEIS CAUSAS ===' as info;
SELECT 
    '1. duration_sec pode estar vindo de fonte diferente (webhook, API)' as causa_1,
    '2. Timestamps podem estar incorretos ou não sincronizados' as causa_2,
    '3. Campo duration pode ser calculado incorretamente' as causa_3,
    '4. Áudio pode ter duração real diferente dos metadados' as causa_4;

-- 7. EXEMPLO DE CÁLCULO CORRETO
SELECT '=== COMO DEVERIA SER ===' as info;
SELECT 
    '1. Duração REAL deve vir do arquivo de áudio (authoritative)' as passo_1,
    '2. duration_sec deve ser atualizado quando áudio é processado' as passo_2,
    '3. Timestamps são auxiliares mas podem estar dessincronizados' as passo_3,
    '4. Frontend deve usar APENAS duration_sec para exibição' as passo_4;

