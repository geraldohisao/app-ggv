-- ============================================
-- REMOVER LIMITE DE 25 DA RPC list_all_profiles
-- ============================================

-- Ver RPCs atuais que listam profiles
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%list%profile%'
  AND routine_schema = 'public';

-- Atualizar list_all_profiles (remover LIMIT padrão)
CREATE OR REPLACE FUNCTION list_all_profiles()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  department TEXT,
  cargo TEXT,
  organizational_unit TEXT,
  google_id TEXT,
  last_synced_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.email,
    p.role,
    p.is_active,
    p.department,
    p.cargo,
    p.organizational_unit,
    p.google_id,
    p.last_synced_at
  FROM profiles p
  ORDER BY p.name;
  -- ✅ SEM LIMIT - retorna TODOS
END;
$$;

-- Atualizar list_active_profiles (se existir)
CREATE OR REPLACE FUNCTION list_active_profiles()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  department TEXT,
  cargo TEXT,
  organizational_unit TEXT,
  google_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.email,
    p.role,
    p.is_active,
    p.department,
    p.cargo,
    p.organizational_unit,
    p.google_id
  FROM profiles p
  WHERE p.is_active = true
  ORDER BY p.name;
  -- ✅ SEM LIMIT - retorna TODOS os ativos
END;
$$;

-- Verificação
SELECT '✅ RPCs atualizadas - agora retornam TODOS os usuários (sem limite de 25)' as status;

-- ============================================
-- FIM
-- ============================================

