-- Atualiza lista de usuários de OKR para incluir avatar
CREATE OR REPLACE FUNCTION list_users_for_okr()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  cargo TEXT,
  department TEXT,
  role TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.cargo,
    p.department,
    p.role,
    p.avatar_url
  FROM profiles p
  WHERE p.is_active = TRUE
  ORDER BY
    CASE p.role
      WHEN 'SUPER_ADMIN' THEN 1
      WHEN 'ADMIN' THEN 2
      ELSE 3
    END,
    p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_users_for_okr() TO authenticated;

COMMENT ON FUNCTION list_users_for_okr IS 'Lista usuários ativos com avatar para OKRs';
