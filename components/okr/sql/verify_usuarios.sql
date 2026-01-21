-- Verificar dados de usuários (especialmente "Inovação Estratégica")

SELECT 
  name as "Nome",
  email as "Email",
  cargo as "Cargo",
  department as "Departamento",
  role as "Role",
  is_active as "Ativo"
FROM profiles
WHERE is_active = TRUE
ORDER BY name;

-- Ver cargos e níveis
SELECT 
  name as "Cargo",
  level as "Nível",
  description as "Descrição"
FROM cargos
WHERE is_active = TRUE
ORDER BY level, name;

