INSERT INTO public.app_settings(key, value) VALUES ('deepseek_api_key', '"sk-a6f8ed8b9eb24eb5b59aae512dc36c28"'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '"sk-a6f8ed8b9eb24eb5b59aae512dc36c28"'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('ai_model_preference', '"deepseek"'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '"deepseek"'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('deepseek_model', '"deepseek-chat"'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '"deepseek-chat"'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('deepseek_temperature', '0.7'::jsonb) ON CONFLICT (key) DO UPDATE SET value = '0.7'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('deepseek_streaming', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = NOW();

INSERT INTO public.app_settings(key, value) VALUES ('deepseek_fallback_gemini', 'true'::jsonb) ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = NOW();
