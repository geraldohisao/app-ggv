-- Script para verificar configurações de modelo Gemini no banco
-- Execute este script no SQL Editor do Supabase para diagnosticar o problema

-- 1. Verificar todas as configurações relacionadas ao Gemini
SELECT 
    key, 
    value,
    created_at,
    updated_at
FROM public.app_settings 
WHERE key ILIKE '%gemini%' 
   OR key ILIKE '%model%' 
   OR key ILIKE '%llm%'
ORDER BY key;

-- 2. Verificar se há configuração específica de modelo
SELECT 
    key, 
    value,
    created_at,
    updated_at
FROM public.app_settings 
WHERE key = 'gemini_model' 
   OR key = 'llm_model'
   OR key = 'ai_model';

-- 3. Verificar configurações de geração LLM
SELECT 
    key, 
    value,
    created_at,
    updated_at
FROM public.app_settings 
WHERE key = 'llm_generation_config';

-- 4. Verificar se há configuração que possa estar sobrescrevendo o modelo
SELECT 
    key, 
    value,
    created_at,
    updated_at
FROM public.app_settings 
WHERE value::text ILIKE '%gemini-1.5-flash-002%'
   OR value::text ILIKE '%flash-002%';

-- 5. Listar todas as configurações para análise geral
SELECT 
    key, 
    CASE 
        WHEN key ILIKE '%key%' OR key ILIKE '%token%' OR key ILIKE '%secret%' THEN '[REDACTED]'
        ELSE value::text
    END as value_preview,
    created_at,
    updated_at
FROM public.app_settings 
ORDER BY key;
