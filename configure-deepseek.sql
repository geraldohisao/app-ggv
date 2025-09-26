-- Script para configurar DeepSeek no banco de dados
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar configurações existentes
SELECT 
    key, 
    value,
    created_at,
    updated_at
FROM public.app_settings 
WHERE key ILIKE '%deepseek%' 
   OR key ILIKE '%ai%'
   OR key ILIKE '%model%'
ORDER BY key;

-- 2. Inserir configuração do DeepSeek se não existir
INSERT INTO public.app_settings(key, value)
SELECT 'deepseek_api_key', '""'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_api_key'
);

-- 3. Configurar modelo preferido
INSERT INTO public.app_settings(key, value)
SELECT 'ai_model_preference', '"deepseek"'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'ai_model_preference'
);

-- 4. Verificar resultado
SELECT 
    key, 
    value,
    created_at,
    updated_at
FROM public.app_settings 
WHERE key ILIKE '%deepseek%' 
   OR key ILIKE '%ai%'
   OR key ILIKE '%model%'
ORDER BY key;
