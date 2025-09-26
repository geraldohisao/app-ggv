-- Inverter prioridade: Gemini principal, DeepSeek fallback
-- Execute este script no Supabase para inverter a prioridade

-- 1. Configurar Gemini como principal
INSERT INTO public.app_settings(key, value) VALUES ('ai_model_preference', '"gemini"'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '"gemini"'::jsonb, updated_at = NOW();

-- 2. Configurar DeepSeek como fallback
INSERT INTO public.app_settings(key, value) VALUES ('gemini_fallback_deepseek', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = NOW();

-- 3. Manter configurações do DeepSeek para fallback
INSERT INTO public.app_settings(key, value) VALUES ('deepseek_api_key', '"sk-a6f8ed8b9eb24eb5b59aae512dc36c28"'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '"sk-a6f8ed8b9eb24eb5b59aae512dc36c28"'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('deepseek_model', '"deepseek-chat"'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '"deepseek-chat"'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('deepseek_temperature', '0.7'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '0.7'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('deepseek_streaming', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = NOW();

-- 4. Configurar fallback do Gemini para DeepSeek
INSERT INTO public.app_settings(key, value) VALUES ('deepseek_fallback_gemini', 'false'::jsonb) ON CONFLICT (key) DO UPDATE SET value = 'false'::jsonb, updated_at = NOW();

-- 5. Configurar timeout para fallback
INSERT INTO public.app_settings(key, value) VALUES ('gemini_timeout_ms', '10000'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '10000'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('deepseek_timeout_ms', '15000'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '15000'::jsonb, updated_at = NOW();
