-- Fallback de avatar: profiles.avatar_url -> auth.users.metadata
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
    COALESCE(NULLIF(p.avatar_url, ''), u.raw_user_meta_data->>'avatar_url') AS avatar_url
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.is_active = TRUE
  ORDER BY
    CASE p.role
      WHEN 'SUPER_ADMIN' THEN 1
      WHEN 'ADMIN' THEN 2
      ELSE 3
    END,
    p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION list_users_for_okr() TO authenticated;

COMMENT ON FUNCTION list_users_for_okr IS 'Lista usuários ativos com avatar (profiles + auth metadata)';
