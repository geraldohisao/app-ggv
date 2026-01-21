-- ============================================
-- VERIFICAR E RECRIAR workspace_sync_user
-- Com refresh do cache do Supabase
-- ============================================

-- Ver assinatura atual da função
SELECT 
  proname as "Função",
  oidvectortypes(proargtypes) as "Tipos dos Argumentos",
  pg_get_function_arguments(oid) as "Assinatura Completa"
FROM pg_proc
WHERE proname = 'workspace_sync_user';

-- Dropar TODAS as versões (força limpeza total)
DROP FUNCTION IF EXISTS workspace_sync_user CASCADE;

-- Recriar versão definitiva (parâmetros em ORDEM ALFABÉTICA = importante!)
CREATE FUNCTION workspace_sync_user(
  p_avatar_url TEXT,
  p_cargo TEXT,
  p_department TEXT,
  p_email TEXT,
  p_google_id TEXT,
  p_is_active BOOLEAN,
  p_name TEXT,
  p_organizational_unit TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row RECORD;
  upsert_row RECORD;
  result_action TEXT;
  result_id UUID;
BEGIN
  -- 1) Tenta atualizar por email ou google_id (caminho mais seguro p/ dados existentes)
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
  WHERE email = p_email OR google_id = p_google_id
  RETURNING id INTO updated_row;

  IF updated_row.id IS NOT NULL THEN
    result_action := 'updated';
    result_id := updated_row.id;
  ELSE
    -- 2) Upsert por google_id para evitar duplicates (409)
    WITH upsert AS (
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
      ON CONFLICT (google_id) DO UPDATE
      SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        cargo = EXCLUDED.cargo,
        department = EXCLUDED.department,
        organizational_unit = EXCLUDED.organizational_unit,
        is_active = EXCLUDED.is_active,
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        last_synced_at = NOW(),
        updated_at = NOW()
      RETURNING id, (xmax = 0) AS inserted
    )
    SELECT id, inserted INTO upsert_row FROM upsert;

    result_id := upsert_row.id;
    result_action := CASE WHEN upsert_row.inserted THEN 'created' ELSE 'updated' END;
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
      'has_photo', p_avatar_url IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'action', result_action,
    'user_id', result_id
  );

EXCEPTION WHEN OTHERS THEN
  INSERT INTO workspace_sync_log (google_id, email, action, success, error_message)
  VALUES (p_google_id, p_email, 'error', FALSE, SQLERRM);
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION workspace_sync_user TO authenticated, service_role;

-- Verificar que só existe UMA versão
SELECT COUNT(*) as "Total de Versões (deve ser 1)"
FROM pg_proc
WHERE proname = 'workspace_sync_user';

-- Ver assinatura final
SELECT pg_get_function_arguments(oid) as "Assinatura"
FROM pg_proc
WHERE proname = 'workspace_sync_user';

DO $$
BEGIN
  RAISE NOTICE '✅ workspace_sync_user recriada (ordem alfabética)!';
  RAISE NOTICE '📸 Suporta avatar_url (fotos do Google)';
  RAISE NOTICE '🔄 Aguarde 10 segundos para cache do Supabase atualizar';
  RAISE NOTICE '🚀 Depois: Ctrl+Shift+R e reimportar';
END $$;

