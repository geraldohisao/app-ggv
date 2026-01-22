-- =========================================
-- FIX: Permitir anon/autenticado em personal_tasks
-- O sistema usa auth custom (ggv-user)
-- =========================================

ALTER TABLE personal_tasks ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuário pode ver suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "Usuário pode criar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "Usuário pode atualizar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "Usuário pode deletar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_read_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_insert_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_update_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_delete_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "anon_read_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "anon_insert_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "anon_update_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "anon_delete_personal_tasks" ON personal_tasks;

-- Criar políticas permissivas para anon + authenticated
CREATE POLICY "anon_read_personal_tasks"
    ON personal_tasks FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "anon_insert_personal_tasks"
    ON personal_tasks FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "anon_update_personal_tasks"
    ON personal_tasks FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "anon_delete_personal_tasks"
    ON personal_tasks FOR DELETE
    TO anon, authenticated
    USING (true);

-- Verificar
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'personal_tasks'
ORDER BY policyname;
