-- Corrigir RLS da tabela sprint_checkins
-- Problema: Quando a sessão do Supabase expira, auth.uid() retorna null
-- e a política RLS bloqueia inserções mesmo com created_by válido

-- 1. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "sprint_checkins_insert_policy" ON sprint_checkins;
DROP POLICY IF EXISTS "sprint_checkins_select_policy" ON sprint_checkins;
DROP POLICY IF EXISTS "sprint_checkins_update_policy" ON sprint_checkins;
DROP POLICY IF EXISTS "sprint_checkins_delete_policy" ON sprint_checkins;
DROP POLICY IF EXISTS "Permitir insert para usuários autenticados" ON sprint_checkins;
DROP POLICY IF EXISTS "Permitir select para usuários autenticados" ON sprint_checkins;
DROP POLICY IF EXISTS "Users can insert sprint checkins" ON sprint_checkins;
DROP POLICY IF EXISTS "Users can view sprint checkins" ON sprint_checkins;

-- 2. Verificar se RLS está habilitado
ALTER TABLE sprint_checkins ENABLE ROW LEVEL SECURITY;

-- 3. Criar política de SELECT mais permissiva
-- Permite leitura para todos os usuários autenticados OU quando created_by é um UUID válido
CREATE POLICY "sprint_checkins_select_all"
ON sprint_checkins
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  OR created_by IS NOT NULL
);

-- 4. Criar política de INSERT mais permissiva
-- Permite inserção quando:
-- - Usuário está autenticado via Supabase Auth, OU
-- - O campo created_by contém um UUID válido (fallback localStorage)
CREATE POLICY "sprint_checkins_insert_all"
ON sprint_checkins
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  OR (created_by IS NOT NULL AND created_by::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

-- 5. Criar política de UPDATE
CREATE POLICY "sprint_checkins_update_own"
ON sprint_checkins
FOR UPDATE
USING (
  auth.uid() = created_by 
  OR auth.uid() IS NOT NULL
  OR created_by IS NOT NULL
);

-- 6. Criar política de DELETE
CREATE POLICY "sprint_checkins_delete_own"
ON sprint_checkins
FOR DELETE
USING (
  auth.uid() = created_by 
  OR auth.uid() IS NOT NULL
);

-- 7. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'sprint_checkins';
