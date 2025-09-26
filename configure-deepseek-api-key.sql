-- Configurar chave da API do DeepSeek
-- Execute este script no Supabase para configurar a chave da API

-- 1. Configurar chave da API DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_api_key', '"sk-a6f8ed8b9eb24eb5b59aae512dc36c28"'::jsonb, 'Chave da API do DeepSeek'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_api_key'
);

-- 2. Atualizar se já existir
UPDATE public.app_settings 
SET value = '"sk-a6f8ed8b9eb24eb5b59aae512dc36c28"'::jsonb,
    updated_at = NOW()
WHERE key = 'deepseek_api_key';

-- 3. Configurar preferência de modelo para DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'ai_model_preference', '"deepseek"'::jsonb, 'Preferência de modelo de IA (deepseek, gemini)'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'ai_model_preference'
);

-- 4. Atualizar preferência se já existir
UPDATE public.app_settings 
SET value = '"deepseek"'::jsonb,
    updated_at = NOW()
WHERE key = 'ai_model_preference';

-- 5. Configurar modelo DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_model', '"deepseek-chat"'::jsonb, 'Modelo do DeepSeek a ser usado'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_model'
);

-- 6. Configurar temperatura do DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_temperature', '0.7'::jsonb, 'Temperatura do modelo DeepSeek (0.0-1.0)'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_temperature'
);

-- 7. Configurar streaming do DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_streaming', 'true'::jsonb, 'Habilitar streaming do DeepSeek'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_streaming'
);

-- 8. Configurar fallback para Gemini
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_fallback_gemini', 'true'::jsonb, 'Usar Gemini como fallback quando DeepSeek falhar'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_fallback_gemini'
);

-- Verificar configurações criadas/atualizadas
SELECT 
    key,
    value,
    description,
    created_at,
    updated_at
FROM public.app_settings 
WHERE key LIKE 'deepseek%' OR key = 'ai_model_preference'
ORDER BY key;
