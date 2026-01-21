-- ============================================
-- RPC PARA ATUALIZAR DEPARTMENT E USER_FUNCTION
-- ============================================
-- Problema: RLS está bloqueando UPDATE em profiles
-- Solução: RPC com SECURITY DEFINER (bypass RLS controlado)
-- ============================================

CREATE OR REPLACE FUNCTION admin_update_user_dept_and_function(
  user_uuid UUID,
  new_department TEXT,
  new_function TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  calling_user_role TEXT;
BEGIN
  -- Verificar se quem está chamando é admin
  SELECT role INTO calling_user_role
  FROM profiles
  WHERE id = auth.uid();
  
  IF calling_user_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
    RAISE EXCEPTION 'Apenas admins podem atualizar usuários';
  END IF;
  
  -- Fazer update direto (SECURITY DEFINER bypassa RLS)
  UPDATE profiles
  SET 
    department = COALESCE(new_department, department),
    user_function = CASE 
      WHEN new_function = '-' THEN NULL
      ELSE COALESCE(new_function, user_function)
    END,
    updated_at = NOW()
  WHERE id = user_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_update_user_dept_and_function TO authenticated;

COMMENT ON FUNCTION admin_update_user_dept_and_function IS 'Permite admins atualizarem department e user_function de usuários (bypassa RLS de forma controlada)';

-- ============================================
-- FIM
-- ============================================

-- Agora o frontend pode chamar:
-- SELECT admin_update_user_dept_and_function(user_id, 'comercial', 'SDR');

