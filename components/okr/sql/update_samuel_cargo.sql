-- Atualizar cargo do Samuel para "Coordenador Comercial"

UPDATE profiles
SET cargo = 'Coordenador Comercial'
WHERE email = 'samuel.bueno@grupoggv.com';

-- Verificar
SELECT 
  name,
  email,
  cargo,
  department,
  role
FROM profiles
WHERE email = 'samuel.bueno@grupoggv.com';

