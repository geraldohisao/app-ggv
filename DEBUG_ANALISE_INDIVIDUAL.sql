-- 🔍 DEBUG ANÁLISE INDIVIDUAL - Verificar dados da chamada bd3dba7d-5623-4b96-8f2a-e64d22746b45
-- Execute para ver os dados completos da análise

-- ===============================================================
-- ETAPA 1: Verificar dados da chamada específica
-- ===============================================================

SELECT 
    'DADOS DA CHAMADA' as info,
    id,
    deal_id,
    enterprise,
    person,
    agent_id,
    duration,
    duration_formated,
    transcription IS NOT NULL as tem_transcricao,
    LENGTH(COALESCE(transcription, '')) as tamanho_transcricao,
    created_at
FROM calls 
WHERE id = 'bd3dba7d-5623-4b96-8f2a-e64d22746b45';

-- ===============================================================
-- ETAPA 2: Verificar se existe análise para esta chamada
-- ===============================================================

SELECT 
    'ANÁLISE EXISTENTE' as info,
    *
FROM call_analysis 
WHERE call_id = 'bd3dba7d-5623-4b96-8f2a-e64d22746b45';

-- ===============================================================
-- ETAPA 3: Testar a função get_call_analysis
-- ===============================================================

SELECT 
    'TESTE DA FUNÇÃO RPC' as info,
    *
FROM get_call_analysis('bd3dba7d-5623-4b96-8f2a-e64d22746b45');

-- ===============================================================
-- ETAPA 4: Verificar se está na fila de análise automática
-- ===============================================================

SELECT 
    'FILA DE ANÁLISE' as info,
    *
FROM analysis_queue 
WHERE call_id = 'bd3dba7d-5623-4b96-8f2a-e64d22746b45';

-- ===============================================================
-- ETAPA 5: Verificar estrutura da tabela call_analysis
-- ===============================================================

SELECT 
    'ESTRUTURA CALL_ANALYSIS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_analysis'
ORDER BY ordinal_position;

-- ===============================================================
-- ETAPA 6: Ver últimas análises criadas (para comparar)
-- ===============================================================

SELECT 
    'ÚLTIMAS ANÁLISES CRIADAS' as info,
    call_id,
    final_grade,
    general_feedback,
    strengths,
    improvements,
    criteria_analysis IS NOT NULL as tem_criterios,
    created_at
FROM call_analysis 
ORDER BY created_at DESC 
LIMIT 5;

