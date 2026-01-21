-- ============================================
-- CORRIGIR PERMISSÕES: UPDATE de cargo
-- ============================================
-- Problema: RLS bloqueia UPDATE do campo cargo
-- Erro: "new row violates row-level security policy"
-- Solução: Criar/atualizar políticas RLS para permitir
-- ============================================

-- 1. Verificar políticas existentes
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
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. Criar/atualizar política para admins poderem UPDATE
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('SUPER_ADMIN', 'ADMIN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('SUPER_ADMIN', 'ADMIN')
  )
);

-- 3. Garantir que usuários podem atualizar próprio perfil (exceto role)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Criar RPC como alternativa (bypass RLS)
CREATE OR REPLACE FUNCTION admin_update_user_cargo(
  user_uuid UUID,
  new_cargo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se quem está chamando é admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('SUPER_ADMIN', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'Apenas admins podem atualizar cargos';
  END IF;

  -- Atualizar cargo
  UPDATE profiles
  SET cargo = new_cargo
  WHERE id = user_uuid;
  
  RAISE NOTICE 'Cargo atualizado com sucesso para user %', user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user_cargo(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_update_user_cargo IS 'Permite admins atualizarem cargo (bypass RLS)';

-- 5. Verificação
SELECT 
  'Políticas criadas com sucesso!' as status;

-- Testar update direto (deve funcionar agora)
-- UPDATE profiles SET cargo = 'Desenvolvedor' WHERE email = 'inovacao@grupoggv.com';

