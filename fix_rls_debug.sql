-- =========================================================
-- SCRIPT DE LIBERAÇÃO TOTAL (DEBUG)
-- =========================================================
-- Use este script APENAS se o anterior não funcionou.
-- Ele libera leitura para qualquer um (inclusive anônimo) para testar se é problema de login.

-- 1. Remover políticas anteriores
DROP POLICY IF EXISTS "app_settings_read_policy" ON app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON app_settings;

-- 2. CRIAR POLÍTICA PERMISSIVA (DEBUG)
-- Permite leitura para 'anon' (anônimo) e 'authenticated' (logado)
CREATE POLICY "app_settings_read_policy_debug" ON app_settings
    FOR SELECT
    USING (true);  -- <--- ISSO LIBERA TUDO PARA LEITURA

-- 3. Confirmação
SELECT 'Leitura liberada globalmente para debug.' as status;
