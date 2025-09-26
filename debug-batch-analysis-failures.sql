-- 🔍 DEBUG: Falhas na análise em lote
-- Script para verificar o que está causando as falhas na análise

-- 1. Verificar as 4 ligações que falharam
SELECT 'Ligações que falharam na análise:' as info;
SELECT 
    c.id,
    c.agent_id,
    c.call_type,
    c.status_voip,
    c.status_voip_friendly,
    c.duration,
    c.transcription,
    c.ai_status,
    c.created_at
FROM calls c
WHERE c.id IN (
    'c93ecf80-d038-4f1f-a7b9-1be42ff381b5',
    '85111b73-9fbb-4c9c-af09-c5607ca7e5db',
    'f494a8c7-78a4-4805-a32b-b55aa2ecda19',
    'a85dd561-4f08-4d41-9678-cece56a29089'
)
ORDER BY c.created_at DESC;

-- 2. Verificar se há análises existentes para essas ligações
SELECT 'Análises existentes para essas ligações:' as info;
SELECT 
    ca.id,
    ca.call_id,
    ca.final_grade,
    ca.general_feedback,
    ca.strengths,
    ca.improvements,
    ca.confidence,
    ca.created_at
FROM call_analysis ca
WHERE ca.call_id IN (
    'c93ecf80-d038-4f1f-a7b9-1be42ff381b5',
    '85111b73-9fbb-4c9c-af09-c5607ca7e5db',
    'f494a8c7-78a4-4805-a32b-b55aa2ecda19',
    'a85dd561-4f08-4d41-9678-cece56a29089'
)
ORDER BY ca.created_at DESC;

-- 3. Verificar se há entradas na fila de análise
SELECT 'Entradas na fila de análise:' as info;
SELECT 
    aq.id,
    aq.call_id,
    aq.status,
    aq.priority,
    aq.created_at
FROM analysis_queue aq
WHERE aq.call_id IN (
    'c93ecf80-d038-4f1f-a7b9-1be42ff381b5',
    '85111b73-9fbb-4c9c-af09-c5607ca7e5db',
    'f494a8c7-78a4-4805-a32b-b55aa2ecda19',
    'a85dd561-4f08-4d41-9678-cece56a29089'
)
ORDER BY aq.created_at DESC;

-- 4. Verificar configurações do sistema
SELECT 'Configurações do sistema:' as info;
SELECT 
    key,
    value
FROM app_settings
WHERE key IN (
    'gemini_api_key',
    'deepseek_api_key',
    'ai_router_priority',
    'ai_model_primary'
)
ORDER BY key;
