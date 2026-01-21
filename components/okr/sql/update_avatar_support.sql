-- ============================================
-- ATUALIZAÇÃO DE AVATAR NO FLUXO DE OKR
-- ============================================

-- 1. Atualizar list_users_for_okr para retornar avatar_url
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

-- 2. Atualizar view okrs_with_progress para incluir avatar do owner
DROP VIEW IF EXISTS okrs_with_progress CASCADE;
CREATE OR REPLACE VIEW okrs_with_progress AS
SELECT 
  okrs.*,
  calculate_okr_progress(okrs.id) AS progress,
  COUNT(key_results.id) AS total_key_results,
  SUM(CASE WHEN key_results.status = 'verde' THEN 1 ELSE 0 END) AS green_krs,
  SUM(CASE WHEN key_results.status = 'amarelo' THEN 1 ELSE 0 END) AS yellow_krs,
  SUM(CASE WHEN key_results.status = 'vermelho' THEN 1 ELSE 0 END) AS red_krs,
  CASE 
    WHEN okrs.end_date < CURRENT_DATE AND okrs.status != 'concluído' THEN true
    ELSE false
  END AS is_overdue,
  -- Tenta achar o avatar pelo nome (owner) na tabela profiles
  (
    SELECT p.avatar_url 
    FROM profiles p 
    WHERE p.name = okrs.owner 
    LIMIT 1
  ) AS owner_avatar_url
FROM okrs
LEFT JOIN key_results ON key_results.okr_id = okrs.id
GROUP BY okrs.id;

COMMENT ON VIEW okrs_with_progress IS 'OKRs com progresso, flags e avatar do responsável';

