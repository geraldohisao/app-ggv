-- Corrige conflito 23505 em workspace_sync_user:
-- quando existe um profile com o email e outro com o google_id, o LIMIT 1 pode pegar o "errado"
-- e gerar violação da unique constraint profiles_google_id_key.
--
-- Estratégia:
-- 1) Preferir sempre o registro pelo email (fonte de verdade no app)
-- 2) Se existir outro registro com o mesmo google_id em id diferente, "soltar" o google_id desse duplicado (set NULL)
-- 3) Atualizar o registro do email com o google_id e demais campos
--
-- Importante: assinatura compatível com o frontend (8 params) + manager opcional no final.
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
  profile_by_email profiles%ROWTYPE;
  profile_by_google profiles%ROWTYPE;
  target_profile profiles%ROWTYPE;
  result_action TEXT;
  result_id UUID;
BEGIN
  SELECT * INTO profile_by_email
  FROM profiles
  WHERE email = p_email
  LIMIT 1;

  SELECT * INTO profile_by_google
  FROM profiles
  WHERE google_id = p_google_id
  LIMIT 1;

  -- Preferir registro pelo email; fallback pelo google_id
  IF profile_by_email IS NOT NULL THEN
    target_profile := profile_by_email;

    -- Se existir um outro registro com esse google_id, liberar para evitar conflito
    IF profile_by_google IS NOT NULL AND profile_by_google.id <> target_profile.id THEN
      UPDATE profiles
      SET google_id = NULL,
          updated_at = NOW()
      WHERE id = profile_by_google.id;
    END IF;
  ELSIF profile_by_google IS NOT NULL THEN
    target_profile := profile_by_google;
  END IF;

  IF target_profile IS NOT NULL THEN
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
    WHERE id = target_profile.id;

    result_action := 'updated';
    result_id := target_profile.id;
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

COMMENT ON FUNCTION public.workspace_sync_user IS 'Importa/atualiza usuário do Google Workspace (fix conflito google_id duplicado + regra avatar genérico)';
