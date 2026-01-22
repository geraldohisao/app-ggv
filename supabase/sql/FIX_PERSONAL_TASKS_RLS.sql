-- =========================================
-- FIX: Corrigir políticas RLS da tabela personal_tasks
-- Execute este script se as tasks não estão sendo criadas
-- =========================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuário pode ver suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "Usuário pode criar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "Usuário pode atualizar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "Usuário pode deletar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_read_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_insert_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_update_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_delete_personal_tasks" ON personal_tasks;

-- Criar novas políticas permissivas
CREATE POLICY "authenticated_read_personal_tasks"
    ON personal_tasks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "authenticated_insert_personal_tasks"
    ON personal_tasks FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated_update_personal_tasks"
    ON personal_tasks FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_delete_personal_tasks"
    ON personal_tasks FOR DELETE
    TO authenticated
    USING (true);

-- Verificar
SELECT 'Políticas RLS atualizadas com sucesso!' as status;

SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'personal_tasks';
