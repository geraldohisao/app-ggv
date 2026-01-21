-- =========================================================
-- DIAGNÓSTICO COMPLETO DE API KEYS E PERMISSÕES (RLS)
-- =========================================================

-- 1. Verificar se o RLS está ativo na tabela app_settings
SELECT 
    '1. Status do RLS' as etapa,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'app_settings';

-- 2. Listar TODAS as chaves disponíveis (apenas nomes, sem valores sensíveis)
-- Se esta query retornar vazio, as chaves não existem mesmo.
SELECT 
    '2. Lista de Chaves presentes' as etapa,
    key,
    updated_at
FROM app_settings
ORDER BY key;

-- 3. Listar Políticas de Segurança (Row Level Security) ativas
-- Verifica se existe política para SELECT (leitura)
SELECT 
    '3. Políticas de Segurança (RLS)' as etapa,
    pol.policyname,
    pol.cmd as operation,
    pol.roles,
    pol.qual as condicao_using
FROM pg_policies pol
WHERE pol.tablename = 'app_settings';

-- 4. Teste de Leitura Simulado (como usuário autenticado)
-- Tenta contar registros simulando um usuário logado (se possível no contexto)
-- Nota: No editor SQL você é superusuário (postgres), então sempre vê tudo.
-- Mas as queries acima (pg_policies) mostram se os outros podem ver.

-- 5. Verificar se há chaves com nomes incorretos ou espaços
SELECT 
    '5. Verificação de Typos' as etapa,
    key, 
    length(key) as tamanho
FROM app_settings
WHERE key ILIKE '%openai%' OR key ILIKE '%gemini%';

-- Crie/Insira as chaves se não existirem (apenas placeholders se estiver vazio)
-- Descomente as linhas abaixo para forçar criação se a etapa 2 retornar vazio
/*
INSERT INTO app_settings (key, value)
VALUES 
    ('openai_api_key', 'sk-PLACEHOLDER-SUBSTITUA-PELA-SUA-CHAVE'),
    ('gemini_api_key', 'AIza-PLACEHOLDER-SUBSTITUA-PELA-SUA-CHAVE')
ON CONFLICT (key) DO NOTHING;
*/
