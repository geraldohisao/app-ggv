-- =====================================================
-- CONFIGURAR CHAVE OPENAI DIRETO (SIMPLES)
-- =====================================================

-- 1️⃣ Verificar estrutura da tabela
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'app_settings'
ORDER BY ordinal_position;

-- 2️⃣ Ver configurações atuais
SELECT * FROM app_settings;

-- 3️⃣ INSERIR/ATUALIZAR chave OpenAI
-- Se value for JSON/JSONB, usar aspas duplas:
-- NUNCA commitar chaves reais. Use placeholder e configure em produção.
INSERT INTO app_settings (key, value)
VALUES ('openai_api_key', '"sk-proj-REPLACE_IN_PRODUCTION"'::jsonb)
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;

-- 4️⃣ Configurar modelo (opcional)
INSERT INTO app_settings (key, value)
VALUES ('openai_model', '"gpt-4o-mini"'::jsonb)
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;

-- 5️⃣ Verificar
SELECT 
    key,
    value,
    value::text as value_text
FROM app_settings
WHERE key LIKE '%openai%';

SELECT '✅ Chave OpenAI configurada! Recarregue a página de Chamadas.' as resultado;

