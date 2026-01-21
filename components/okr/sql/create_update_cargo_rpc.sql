-- Criar RPC para atualizar cargo de usuário

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
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user_cargo(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_update_user_cargo IS 'Permite admins atualizarem o cargo de usuários';

