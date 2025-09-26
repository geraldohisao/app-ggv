-- Script para corrigir configurações de modelo Gemini
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar configurações existentes
SELECT 
    key, 
    value,
    created_at,
    updated_at
FROM public.app_settings 
WHERE key ILIKE '%gemini%' 
   OR key ILIKE '%model%' 
   OR key ILIKE '%llm%'
   OR value::text ILIKE '%flash-002%'
ORDER BY key;

-- 2. Remover configurações problemáticas se existirem
DELETE FROM public.app_settings 
WHERE key = 'gemini_model' 
   OR key = 'llm_model'
   OR key = 'ai_model'
   OR value::text ILIKE '%flash-002%';

-- 3. Garantir que não há configurações de modelo inválidas
DELETE FROM public.app_settings 
WHERE key ILIKE '%model%' 
   AND value::text ILIKE '%002%';

-- 4. Verificar se há configurações de Vertex AI
DELETE FROM public.app_settings 
WHERE value::text ILIKE '%vertex%'
   OR value::text ILIKE '%generativelanguage-ga%';

-- 5. Inserir configuração correta se não existir
INSERT INTO public.app_settings(key, value)
SELECT 'gemini_model', '"gemini-1.5-flash"'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'gemini_model'
);

-- 6. Verificar resultado final
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
