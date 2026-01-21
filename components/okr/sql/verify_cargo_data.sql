-- ============================================
-- VERIFICAÇÃO: Dados de cargo no banco
-- ============================================

-- 1. Verificar se os dados estão corretos NO BANCO
SELECT 
  name as "Nome",
  email as "Email",
  cargo as "Cargo (Banco)",
  department as "Department (Banco)",
  role as "Role"
FROM profiles
WHERE name IN ('César Intrieri', 'Dev Team', 'Djiovane Santos', 'Eduardo Espindola')
ORDER BY name;

-- 2. Testar a RPC que o frontend usa
SELECT * FROM list_all_profiles()
WHERE name IN ('César Intrieri', 'Dev Team', 'Djiovane Santos', 'Eduardo Espindola')
ORDER BY name;

-- 3. Verificar se a RPC retorna o campo 'cargo'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('cargo', 'department', 'user_function')
ORDER BY column_name;

