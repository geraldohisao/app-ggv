-- ============================================
-- CORRIGIR: workspace_sync_user COM FOTOS
-- Drop de todas as versões + Recriação
-- ============================================

-- PASSO 1: Dropar TODAS as versões da função
DROP FUNCTION IF EXISTS workspace_sync_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB);
DROP FUNCTION IF EXISTS workspace_sync_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS workspace_sync_user(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS workspace_sync_user CASCADE;

-- PASSO 2: Recriar com suporte a avatar_url
CREATE FUNCTION workspace_sync_user(
  p_google_id TEXT,
  p_email TEXT,
  p_name TEXT,
  p_cargo TEXT,
  p_department TEXT,
  p_organizational_unit TEXT,
  p_is_active BOOLEAN,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile RECORD;
  result_action TEXT;
  result_id UUID;
BEGIN
  -- Verificar se usuário já existe
  SELECT * INTO existing_profile
  FROM profiles
  WHERE email = p_email OR google_id = p_google_id
  LIMIT 1;

  IF existing_profile IS NOT NULL THEN
    -- ATUALIZAR usuário existente
    UPDATE profiles
    SET
      name = p_name,
      cargo = p_cargo,
      department = p_department,
      organizational_unit = p_organizational_unit,
      is_active = p_is_active,
      google_id = p_google_id,
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      last_synced_at = NOW(),
      updated_at = NOW()
    WHERE id = existing_profile.id;
    
    result_action := 'updated';
    result_id := existing_profile.id;
    
  ELSE
    -- CRIAR novo usuário
    INSERT INTO profiles (
      email,
      name,
      cargo,
      department,
      organizational_unit,
      google_id,
      avatar_url,
      role,
      is_active,
      last_synced_at
    )
    VALUES (
      p_email,
      p_name,
      p_cargo,
      p_department,
      p_organizational_unit,
      p_google_id,
      p_avatar_url,
      'USER',
      p_is_active,
      NOW()
    )
    RETURNING id INTO result_id;
    
    result_action := 'created';
  END IF;

  -- Log da sincronização
  INSERT INTO workspace_sync_log (
    google_id,
    email,
    action,
    success,
    sync_data
  )
  VALUES (
    p_google_id,
    p_email,
    result_action,
    TRUE,
    jsonb_build_object(
      'name', p_name,
      'cargo', p_cargo,
      'department', p_department,
      'has_photo', p_avatar_url IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'action', result_action,
    'user_id', result_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Log de erro
  INSERT INTO workspace_sync_log (
    google_id,
    email,
    action,
    success,
    error_message
  )
  VALUES (
    p_google_id,
    p_email,
    'error',
    FALSE,
    SQLERRM
  );
  
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION workspace_sync_user TO authenticated, service_role;

COMMENT ON FUNCTION workspace_sync_user IS 'Importa/atualiza usuário do Google Workspace (com foto do perfil)';

-- VERIFICAÇÃO
SELECT 
  proname as funcao,
  pg_get_function_arguments(oid) as parametros
FROM pg_proc
WHERE proname = 'workspace_sync_user';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ workspace_sync_user recriada com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📸 Agora suporta avatar_url (foto do Google)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximo passo:';
  RAISE NOTICE '   Reimportar usuários do Google Workspace!';
  RAISE NOTICE '';
END $$;

