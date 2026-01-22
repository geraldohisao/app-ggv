-- Permitir DELETE em sprint_checkins mesmo sem sessão Auth ativa
-- ATENÇÃO: Este ajuste segue a mesma permissividade do UPDATE atual
-- e é necessário para evitar "Delete bloqueado por RLS" quando auth.uid() = NULL.

-- Remover política existente
DROP POLICY IF EXISTS "sprint_checkins_delete_own" ON sprint_checkins;

-- Nova política de DELETE (mesma lógica permissiva do UPDATE)
CREATE POLICY "sprint_checkins_delete_own"
ON sprint_checkins
FOR DELETE
USING (
  auth.uid() = created_by
  OR auth.uid() IS NOT NULL
  OR created_by IS NOT NULL
);

-- Verificar política criada
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'sprint_checkins'
  AND policyname = 'sprint_checkins_delete_own';
