-- =====================================================
-- ALTERNATIVA: Se value for TEXT (não JSON)
-- =====================================================

-- Opção 1: Se value é JSONB (com aspas duplas)
-- NUNCA commitar chaves reais. Use placeholder e configure em produção.
UPDATE app_settings 
SET value = '"sk-proj-REPLACE_IN_PRODUCTION"'::jsonb
WHERE key = 'openai_api_key';

-- Se não atualizou nenhuma linha (não existe), inserir:
INSERT INTO app_settings (key, value)
SELECT 'openai_api_key', '"sk-proj-REPLACE_IN_PRODUCTION"'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'openai_api_key');

-- Configurar modelo
UPDATE app_settings SET value = '"gpt-4o-mini"'::jsonb WHERE key = 'openai_model';
INSERT INTO app_settings (key, value)
SELECT 'openai_model', '"gpt-4o-mini"'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'openai_model');

-- Verificar resultado
SELECT * FROM app_settings WHERE key LIKE '%openai%';

