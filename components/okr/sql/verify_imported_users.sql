-- ============================================
-- VERIFICAR USUÁRIOS IMPORTADOS
-- ============================================

-- 1. Total de usuários
SELECT 
  COUNT(*) as "Total de usuários",
  COUNT(*) FILTER (WHERE is_active = true) as "Ativos",
  COUNT(*) FILTER (WHERE is_active = false) as "Inativos",
  COUNT(*) FILTER (WHERE google_id IS NOT NULL) as "Sincronizados com Google",
  COUNT(*) FILTER (WHERE google_id IS NULL) as "Sem vínculo Google"
FROM profiles;

-- 2. Usuários importados do Google (têm google_id)
SELECT 
  COUNT(*) as "Importados do Google (total)",
  COUNT(*) FILTER (WHERE is_active = true) as "Importados Ativos",
  COUNT(*) FILTER (WHERE is_active = false) as "Importados Inativos"
FROM profiles
WHERE google_id IS NOT NULL;

-- 3. Ver usuários inativos (se houver)
SELECT 
  name,
  email,
  cargo,
  department,
  is_active,
  google_id
FROM profiles
WHERE is_active = false
ORDER BY name;

-- 4. Todos os usuários (resumo)
SELECT 
  name,
  email,
  cargo,
  department,
  organizational_unit,
  role,
  is_active
FROM profiles
ORDER BY is_active DESC, name
LIMIT 50;

-- ============================================
-- FIM
-- ============================================

