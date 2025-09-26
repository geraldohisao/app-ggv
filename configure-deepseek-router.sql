-- Configuração do Router DeepSeek
-- Execute este script no Supabase para configurar o DeepSeek

-- 1. Configurar preferência de modelo para DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'ai_model_preference', '"deepseek"'::jsonb, 'Preferência de modelo de IA (deepseek, gemini)'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'ai_model_preference'
);

-- 2. Configurar chave da API DeepSeek (opcional - pode usar env vars)
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_api_key', '""'::jsonb, 'Chave da API do DeepSeek (opcional se configurada via env vars)'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_api_key'
);

-- 3. Configurar modelo DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_model', '"deepseek-chat"'::jsonb, 'Modelo do DeepSeek a ser usado'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_model'
);

-- 4. Configurar temperatura do DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_temperature', '0.7'::jsonb, 'Temperatura do modelo DeepSeek (0.0-1.0)'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_temperature'
);

-- 5. Configurar max tokens do DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_max_tokens', '4000'::jsonb, 'Máximo de tokens para resposta do DeepSeek'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_max_tokens'
);

-- 6. Configurar streaming do DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_streaming', 'true'::jsonb, 'Habilitar streaming do DeepSeek'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_streaming'
);

-- 7. Configurar timeout do DeepSeek
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_timeout', '30000'::jsonb, 'Timeout em ms para requisições do DeepSeek'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_timeout'
);

-- 8. Configurar fallback para Gemini
INSERT INTO public.app_settings(key, value, description)
SELECT 'deepseek_fallback_gemini', 'true'::jsonb, 'Usar Gemini como fallback quando DeepSeek falhar'
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_fallback_gemini'
);

-- Verificar configurações criadas
SELECT 
    key,
    value,
    description,
    created_at
FROM public.app_settings 
WHERE key LIKE 'deepseek%' OR key = 'ai_model_preference'
ORDER BY key;

