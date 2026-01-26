-- Atualiza workspace_sync_user para lidar com avatar genérico do Google
-- Importante: PostgREST retorna 404 quando não encontra um overload compatível
-- com os parâmetros enviados. O frontend chama com 8 params (sem manager_email),
-- então mantemos a assinatura compatível e deixamos manager_email opcional no final.
DROP FUNCTION IF EXISTS public.workspace_sync_user CASCADE;

CREATE FUNCTION public.workspace_sync_user(
  p_google_id TEXT,
  p_email TEXT,
  p_name TEXT,
  p_cargo TEXT,
  p_department TEXT,
  p_organizational_unit TEXT,
  p_is_active BOOLEAN,
  p_avatar_url TEXT,
  p_manager_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  existing_profile profiles%ROWTYPE;
  result_action TEXT;
  result_id UUID;
BEGIN
  SELECT * INTO existing_profile
  FROM profiles
  WHERE email = p_email OR google_id = p_google_id
  LIMIT 1;

  IF existing_profile IS NOT NULL THEN
    UPDATE profiles
    SET
      name = p_name,
      cargo = p_cargo,
      department = p_department,
      organizational_unit = p_organizational_unit,
      is_active = p_is_active,
      google_id = p_google_id,
      avatar_url = CASE
        WHEN p_avatar_url IS NULL OR p_avatar_url = '' THEN avatar_url
        WHEN p_avatar_url ~* 'lh3\.google\.com/ao/' THEN
          CASE
            WHEN avatar_url IS NULL OR avatar_url = '' OR avatar_url ~* 'lh3\.google\.com/ao/' THEN p_avatar_url
            ELSE avatar_url
          END
        ELSE p_avatar_url
      END,
      last_synced_at = NOW(),
      updated_at = NOW()
    WHERE id = existing_profile.id;

    result_action := 'updated';
    result_id := existing_profile.id;
  ELSE
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.workspace_sync_user TO authenticated, service_role;

COMMENT ON FUNCTION public.workspace_sync_user IS 'Importa/atualiza usuário do Google Workspace (com regra de avatar genérico)';
