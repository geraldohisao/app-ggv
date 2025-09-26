-- Script simples para verificar configurações do Gemini
SELECT key, value FROM public.app_settings WHERE key ILIKE '%gemini%' OR key ILIKE '%model%' OR key ILIKE '%llm%';
