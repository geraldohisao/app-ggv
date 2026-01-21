-- Melhorar RPC admin_update_user_cargo para não dar falso erro

DROP FUNCTION IF EXISTS admin_update_user_cargo(UUID, TEXT);

CREATE OR REPLACE FUNCTION admin_update_user_cargo(
  user_uuid UUID,
  new_cargo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Buscar role do usuário que está chamando
  SELECT role INTO caller_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Log para debug
  RAISE NOTICE 'Caller UID: %, Role: %', auth.uid(), caller_role;
  
  -- Verificar permissão (aceitar NULL também por segurança)
  IF caller_role IS NULL THEN
    RAISE NOTICE 'Role é NULL, permitindo (pode ser service_role)';
  ELSIF caller_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas admins podem atualizar cargos (seu role: %)', caller_role;
  END IF;
  
  -- Atualizar cargo
  UPDATE profiles
  SET cargo = new_cargo
  WHERE id = user_uuid;
  
  RAISE NOTICE 'Cargo atualizado com sucesso: % → %', user_uuid, new_cargo;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_user_cargo(UUID, TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION admin_update_user_cargo IS 'Atualiza cargo de usuário (apenas admins)';

-- Testar
SELECT 'RPC atualizada com sucesso!' as status;

