INSERT INTO public.app_settings(key, value, description) VALUES ('deepseek_api_key', '"sk-a6f8ed8b9eb24eb5b59aae512dc36c28"'::jsonb, 'Chave da API do DeepSeek') ON CONFLICT (key) DO UPDATE SET value = '"sk-a6f8ed8b9eb24eb5b59aae512dc36c28"'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value, description) VALUES ('ai_model_preference', '"deepseek"'::jsonb, 'Preferência de modelo de IA') ON CONFLICT (key) DO UPDATE SET value = '"deepseek"'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value, description) VALUES ('deepseek_model', '"deepseek-chat"'::jsonb, 'Modelo do DeepSeek') ON CONFLICT (key) DO UPDATE SET value = '"deepseek-chat"'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value, description) VALUES ('deepseek_temperature', '0.7'::jsonb, 'Temperatura do DeepSeek') ON CONFLICT (key) DO UPDATE SET value = '0.7'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value, description) VALUES ('deepseek_streaming', 'true'::jsonb, 'Streaming do DeepSeek') ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value, description) VALUES ('deepseek_fallback_gemini', 'true'::jsonb, 'Fallback para Gemini') ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = NOW();
