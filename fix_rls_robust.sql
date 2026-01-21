-- =========================================================
-- CORREÇÃO ROBUSTA DE PERMISSÕES (GRANT + RLS)
-- =========================================================

-- 1. Garantir que RLS está ATIVO
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Conceder permissão de SELECT (muitas vezes o problema é falta de GRANT, não só RLS)
GRANT SELECT ON app_settings TO anon, authenticated, service_role;

-- 3. Limpar políticas antigas (para evitar erro "already exists")
DROP POLICY IF EXISTS "app_settings_read_policy" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON app_settings;
DROP POLICY IF EXISTS "app_settings_read_policy_debug" ON app_settings; -- <--- Remove a que deu erro antes

-- 4. CRIAR POLÍTICA PERMISSIVA (DEBUG)
CREATE POLICY "app_settings_read_policy_debug" ON app_settings
    FOR SELECT
    USING (true);

-- 5. Confirmação
SELECT 
    'Permissões aplicadas e política recriada com sucesso.' as status,
    tablename,
    policyname,
    roles
FROM pg_policies 
WHERE tablename = 'app_settings';
