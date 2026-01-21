-- ============================================
-- TESTAR A RPC MANUALMENTE
-- ============================================

-- 1. Ver seu user_id
SELECT id, name, email, department, user_function 
FROM profiles 
WHERE email = 'geraldo@grupoggv.com.br'; -- Ajuste com seu email

-- 2. Testar a RPC (cole o UUID do passo anterior)
SELECT admin_update_user_dept_and_function(
  '00000000-0000-0000-0000-000000000000'::uuid, -- COLE SEU UUID AQUI
  'comercial', -- Novo department
  'CEO' -- Novo function
);

-- 3. Verificar se salvou
SELECT id, name, email, department, user_function 
FROM profiles 
WHERE email = 'geraldo@grupoggv.com.br'; -- Ajuste com seu email

-- Se o passo 3 mostrar os valores atualizados, a RPC funciona!
-- Se não, há algo errado na RPC ou nas permissões.

