-- =====================================================
-- CORREÇÃO RLS: Permitir leitura para autenticação customizada
-- =====================================================
-- O sistema usa autenticação customizada (ggv-user no localStorage)
-- em vez de Supabase Auth. Isso faz com que auth.uid() retorne NULL
-- e as políticas RLS bloqueiem todas as queries.
--
-- Esta correção adiciona políticas de leitura permissivas para
-- permitir que o frontend funcione com a autenticação customizada.
-- =====================================================

-- 1. Política de leitura para OKRs
DROP POLICY IF EXISTS "anon_read_okrs" ON okrs;
CREATE POLICY "anon_read_okrs" ON okrs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Política de leitura para Key Results
DROP POLICY IF EXISTS "anon_read_key_results" ON key_results;
CREATE POLICY "anon_read_key_results" ON key_results
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Política de leitura para Sprints
DROP POLICY IF EXISTS "anon_read_sprints" ON sprints;
CREATE POLICY "anon_read_sprints" ON sprints
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Política de leitura para Sprint Items
DROP POLICY IF EXISTS "anon_read_sprint_items" ON sprint_items;
CREATE POLICY "anon_read_sprint_items" ON sprint_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Política de leitura para Sprint Checkins (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sprint_checkins') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_read_sprint_checkins" ON sprint_checkins';
    EXECUTE 'CREATE POLICY "anon_read_sprint_checkins" ON sprint_checkins FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 6. Política de leitura para KR Checkins (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kr_checkins') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_read_kr_checkins" ON kr_checkins';
    EXECUTE 'CREATE POLICY "anon_read_kr_checkins" ON kr_checkins FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 7. Política de leitura para Sprint OKRs (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sprint_okrs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_read_sprint_okrs" ON sprint_okrs';
    EXECUTE 'CREATE POLICY "anon_read_sprint_okrs" ON sprint_okrs FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;

-- =====================================================
-- POLÍTICAS DE ESCRITA (INSERT, UPDATE, DELETE)
-- =====================================================
-- Para escrita, também precisamos permitir já que a autenticação
-- é gerenciada pelo frontend com ggv-user

-- INSERT para OKRs
DROP POLICY IF EXISTS "anon_insert_okrs" ON okrs;
CREATE POLICY "anon_insert_okrs" ON okrs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE para OKRs
DROP POLICY IF EXISTS "anon_update_okrs" ON okrs;
CREATE POLICY "anon_update_okrs" ON okrs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE para OKRs
DROP POLICY IF EXISTS "anon_delete_okrs" ON okrs;
CREATE POLICY "anon_delete_okrs" ON okrs
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- INSERT/UPDATE/DELETE para Key Results
DROP POLICY IF EXISTS "anon_insert_key_results" ON key_results;
CREATE POLICY "anon_insert_key_results" ON key_results
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_key_results" ON key_results;
CREATE POLICY "anon_update_key_results" ON key_results
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_key_results" ON key_results;
CREATE POLICY "anon_delete_key_results" ON key_results
  FOR DELETE TO anon, authenticated USING (true);

-- INSERT/UPDATE/DELETE para Sprints
DROP POLICY IF EXISTS "anon_insert_sprints" ON sprints;
CREATE POLICY "anon_insert_sprints" ON sprints
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sprints" ON sprints;
CREATE POLICY "anon_update_sprints" ON sprints
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sprints" ON sprints;
CREATE POLICY "anon_delete_sprints" ON sprints
  FOR DELETE TO anon, authenticated USING (true);

-- INSERT/UPDATE/DELETE para Sprint Items
DROP POLICY IF EXISTS "anon_insert_sprint_items" ON sprint_items;
CREATE POLICY "anon_insert_sprint_items" ON sprint_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sprint_items" ON sprint_items;
CREATE POLICY "anon_update_sprint_items" ON sprint_items
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sprint_items" ON sprint_items;
CREATE POLICY "anon_delete_sprint_items" ON sprint_items
  FOR DELETE TO anon, authenticated USING (true);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('okrs', 'key_results', 'sprints', 'sprint_items')
  AND policyname LIKE 'anon_%'
ORDER BY tablename, cmd;
