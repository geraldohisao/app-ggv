-- workspace_sync_user final: UPSERT por email + resolve conflito google_id + regras avatar
-- Fix: Todas as referências a tabelas devem ser FULLY QUALIFIED (public.profiles)
-- para garantir que ON CONFLICT encontre a constraint mesmo com search_path alterado

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
  existed_before BOOLEAN;
  result_id UUID;
  result_action TEXT;
BEGIN
  -- 1) Detectar se já existe pelo email (para action)
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = p_email) INTO existed_before;

  -- 2) Garantir unicidade do google_id: se estiver associado a outro email, soltar
  UPDATE public.profiles
  SET google_id = NULL,
      updated_at = NOW()
  WHERE google_id = p_google_id
    AND email <> p_email;

  -- 3) UPSERT pelo email (fonte de verdade no app)
  INSERT INTO public.profiles (
    email,
    name,
    cargo,
    department,
    organizational_unit,
    google_id,
    avatar_url,
    role,
    is_active,
    last_synced_at,
    updated_at
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
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    name = EXCLUDED.name,
    cargo = EXCLUDED.cargo,
    department = EXCLUDED.department,
    organizational_unit = EXCLUDED.organizational_unit,
    is_active = EXCLUDED.is_active,
    google_id = EXCLUDED.google_id,
    avatar_url = CASE
      WHEN EXCLUDED.avatar_url IS NULL OR EXCLUDED.avatar_url = '' THEN public.profiles.avatar_url
      WHEN EXCLUDED.avatar_url ~* 'lh3\.google\.com/ao/' THEN
        CASE
          WHEN public.profiles.avatar_url IS NULL OR public.profiles.avatar_url = '' OR public.profiles.avatar_url ~* 'lh3\.google\.com/ao/' THEN EXCLUDED.avatar_url
          ELSE public.profiles.avatar_url
        END
      ELSE EXCLUDED.avatar_url
    END,
    last_synced_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO result_id;

  result_action := CASE WHEN existed_before THEN 'updated' ELSE 'created' END;

  INSERT INTO public.workspace_sync_log (
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
  INSERT INTO public.workspace_sync_log (
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.workspace_sync_user TO authenticated, service_role;

COMMENT ON FUNCTION public.workspace_sync_user IS 'Importa/atualiza usuário do Google Workspace (upsert por email + resolve conflito google_id + protege avatar real)';
