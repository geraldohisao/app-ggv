-- CORREÇÃO DE POLÍTICAS RLS PARA TABELA APP_SETTINGS
-- Objetivo: Permitir que usuários autenticados leiam as configurações (necessário para o frontend buscar chaves)

-- 1. Habilitar RLS (caso não esteja)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON app_settings;
DROP POLICY IF EXISTS "Service role can manage app_settings" ON app_settings;
DROP POLICY IF EXISTS "app_settings_read_policy" ON app_settings;

-- 3. CRIAR política de LEITURA (SELECT) para usuários autenticados
-- Isso permite que o frontend (via supabase client) leia as chaves
CREATE POLICY "app_settings_read_policy" ON app_settings
    FOR SELECT
    USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

-- 4. CRIAR política de ESCRITA (INSERT/UPDATE/DELETE) apenas para service_role (backend/admin)
-- Usuários normais NÃO podem alterar chaves
CREATE POLICY "app_settings_write_policy" ON app_settings
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 5. Confirmação
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'app_settings' AND schemaname = 'public';
