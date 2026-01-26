-- Diagnóstico: verificar constraints atuais na tabela profiles
-- Execute esta query primeiro para ver o estado atual:
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'profiles'::regclass;

-- Garantir que existe uma UNIQUE constraint em email
-- (necessária para ON CONFLICT (email) funcionar)

-- #region agent log
DO $$
BEGIN
  -- Verificar se já existe constraint unique em email
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'profiles'::regclass 
      AND contype = 'u' 
      AND pg_get_constraintdef(oid) ILIKE '%email%'
  ) THEN
    -- #region agent log
    RAISE NOTICE '[LOG] profiles.email UNIQUE constraint missing, adding now';
    -- #endregion
    
    -- Adicionar constraint unique em email
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_email_key UNIQUE (email);
    
    RAISE NOTICE '[LOG] profiles.email UNIQUE constraint added successfully';
  ELSE
    RAISE NOTICE '[LOG] profiles.email UNIQUE constraint already exists';
  END IF;
END $$;

-- Verificar estado final
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass
ORDER BY contype, conname;

COMMENT ON CONSTRAINT profiles_email_key ON profiles IS 'Email deve ser único para permitir UPSERT em workspace_sync_user';
