-- 🔍 ANÁLISE DETALHADA: Chamada 65711 (LAN Solar)
-- Investigando inconsistências de duração

-- 1. VER TODOS OS CAMPOS DE DURAÇÃO
SELECT '=== CAMPOS DA CHAMADA 65711 ===' as info;
SELECT 
    id,
    client_name,
    sdr_name,
    -- CAMPOS DE DURAÇÃO (todos)
    duration_sec,
    duration,
    duration_formated,
    duration_seconds,
    -- TIMESTAMPS
    created_at,
    started_at,
    answered_at,
    ended_at,
    -- CALCULAR DURAÇÃO REAL DOS TIMESTAMPS
    CASE 
        WHEN answered_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - answered_at))::int
        WHEN started_at IS NOT NULL AND ended_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ended_at - started_at))::int
        ELSE NULL
    END as calculated_from_timestamps_sec,
    -- ÁUDIO
    audio_url,
    recording_url,
    -- TRANSCRIÇÃO
    CASE 
        WHEN transcription IS NOT NULL THEN LENGTH(transcription)
        ELSE 0
    END as transcription_length,
    -- STATUS
    call_status,
    status_voip_friendly
FROM calls
WHERE id = 65711;

-- 2. VERIFICAR ESTRUTURA DA TABELA
SELECT '=== TODOS OS CAMPOS DE DURAÇÃO NA TABELA ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'calls'
AND column_name ILIKE '%duration%'
ORDER BY ordinal_position;

-- 3. CONVERSÃO DOS VALORES
SELECT '=== CONVERTENDO VALORES PARA ANÁLISE ===' as info;
SELECT 
    id,
    -- Campo duration_formated como string
    duration_formated as duration_formated_string,
    -- Conversão de duration_formated para segundos
    CASE 
        WHEN duration_formated IS NOT NULL THEN
            EXTRACT(EPOCH FROM duration_formated::interval)::int
        ELSE NULL
    END as duration_formated_in_seconds,
    -- Campo duration_sec
    duration_sec,
    -- Qual campo está "mais correto"?
    CASE 
        WHEN duration_sec IS NOT NULL 
        AND duration_formated IS NOT NULL
        AND ABS(
            duration_sec - EXTRACT(EPOCH FROM duration_formated::interval)::int
        ) > 60
        THEN '⚠️ INCONSISTÊNCIA DETECTADA!'
        ELSE '✅ Valores consistentes'
    END as status_consistency
FROM calls
WHERE id = 65711;

-- 4. BUSCAR CHAMADAS SIMILARES COM INCONSISTÊNCIAS
SELECT '=== OUTRAS CHAMADAS COM INCONSISTÊNCIAS ===' as info;
SELECT 
    id,
    client_name,
    sdr_name,
    duration_formated,
    duration_sec,
    EXTRACT(EPOCH FROM duration_formated::interval)::int as formated_in_sec,
    ABS(
        duration_sec - EXTRACT(EPOCH FROM duration_formated::interval)::int
    ) as difference_sec,
    created_at::date as call_date
FROM calls
WHERE duration_formated IS NOT NULL
AND duration_sec IS NOT NULL
AND ABS(
    duration_sec - EXTRACT(EPOCH FROM duration_formated::interval)::int
) > 60  -- Diferença maior que 1 minuto
ORDER BY created_at DESC
LIMIT 10;

-- 5. ESTATÍSTICAS GERAIS
SELECT '=== ESTATÍSTICAS DE INCONSISTÊNCIAS ===' as info;
SELECT 
    COUNT(*) as total_calls,
    COUNT(CASE WHEN duration_formated IS NOT NULL THEN 1 END) as with_duration_formated,
    COUNT(CASE WHEN duration_sec IS NOT NULL THEN 1 END) as with_duration_sec,
    COUNT(CASE 
        WHEN duration_formated IS NOT NULL 
        AND duration_sec IS NOT NULL
        AND ABS(
            duration_sec - EXTRACT(EPOCH FROM duration_formated::interval)::int
        ) > 60
        THEN 1 
    END) as inconsistent_calls,
    ROUND(
        COUNT(CASE 
            WHEN duration_formated IS NOT NULL 
            AND duration_sec IS NOT NULL
            AND ABS(
                duration_sec - EXTRACT(EPOCH FROM duration_formated::interval)::int
            ) > 60
            THEN 1 
        END)::numeric / NULLIF(COUNT(*), 0) * 100,
        2
    ) as inconsistency_percentage
FROM calls
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 6. VERIFICAR QUAL É A FONTE CONFIÁVEL
SELECT '=== ANÁLISE: QUAL CAMPO USAR? ===' as info;
SELECT 
    'duration_formated' as campo,
    '✅ Parece vir do sistema de telefonia (API4COM)' as fonte,
    '✅ Mais confiável para duração real da chamada' as confiabilidade,
    '⚠️ Formato: 00:09:37 (interval)' as formato
UNION ALL
SELECT 
    'duration_sec' as campo,
    '⚠️ Pode ser calculado ou preenchido manualmente' as fonte,
    '❌ Menos confiável, pode estar desatualizado' as confiabilidade,
    '⚠️ Formato: número inteiro (segundos)' as formato;

-- 7. RECOMENDAÇÃO
SELECT '
🎯 RECOMENDAÇÃO:

1. USAR duration_formated como fonte primária
   - Vem direto do sistema de telefonia
   - Reflete duração real da chamada
   
2. PADRONIZAR no frontend:
   - CallsPage.tsx: usar formatDurationDisplay()
   - CallDetailPage.tsx: usar formatDurationDisplay()
   - Ambos devem usar a mesma lógica
   
3. CORRIGIR getRealDuration():
   - Priorizar duration_formated
   - Depois duration_sec
   - Último: duration
   
4. SINCRONIZAR valores:
   - Atualizar duration_sec baseado em duration_formated
   - Manter consistência entre campos

📊 PARA A CHAMADA 65711:
   - duration_formated: 00:09:37 (577 segundos) ✅ CORRETO
   - duration_sec: 10 (10 segundos) ❌ ERRADO
   - Áudio no player: 1:12 (?? precisa verificar)
   
' as recomendacao;

