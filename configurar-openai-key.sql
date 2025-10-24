-- =====================================================
-- CONFIGURAR API KEY DO OPENAI
-- =====================================================

-- 1️⃣ Verificar estrutura da tabela app_settings
SELECT 
    '1. Estrutura da tabela app_settings:' as etapa,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'app_settings'
ORDER BY ordinal_position;

-- 2️⃣ Verificar se já existe configuração OpenAI
SELECT 
    '2. Configurações OpenAI existentes:' as etapa,
    *
FROM app_settings
WHERE key LIKE '%openai%';

-- 3️⃣ INSERIR/ATUALIZAR chave OpenAI (SEM coluna description)
INSERT INTO app_settings (key, value, updated_at)
VALUES (
    'openai_api_key',
    'sk-proj-REPLACE_IN_PRODUCTION',
    NOW()
)
ON CONFLICT (key) DO UPDATE 
SET 
    value = EXCLUDED.value, 
    updated_at = NOW();

-- 4️⃣ Configurar modelo (opcional, padrão é gpt-4o-mini)
INSERT INTO app_settings (key, value, updated_at)
VALUES (
    'openai_model',
    'gpt-4o-mini',  -- ou 'gpt-4o' para mais qualidade (mais caro)
    NOW()
)
ON CONFLICT (key) DO UPDATE 
SET 
    value = EXCLUDED.value, 
    updated_at = NOW();

-- 5️⃣ Verificar configurações salvas
SELECT 
    '5. Configurações OpenAI salvas:' as etapa,
    key,
    CASE 
        WHEN key = 'openai_api_key' THEN 
            'sk-...' || RIGHT(value, 4)  -- Mostrar só últimos 4 caracteres
        ELSE value
    END as value_preview,
    updated_at
FROM app_settings
WHERE key LIKE '%openai%';

SELECT '
✅ CONFIGURAÇÃO CONCLUÍDA!

🔑 Próximo passo:
   1. Recarregue a página de Chamadas
   2. O painel "🤖 Análise IA Automática" deve aparecer
   3. Clique em "Analisar X Novas"

🔗 Obter chave OpenAI:
   https://platform.openai.com/api-keys

' as instrucoes;

