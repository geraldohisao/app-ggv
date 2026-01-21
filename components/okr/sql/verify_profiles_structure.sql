-- Verificar estrutura da tabela profiles

-- 1. Ver todas as colunas
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Verificar especificamente os campos que vamos usar
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('email', 'name', 'cargo', 'department', 'role', 'is_active')
ORDER BY column_name;

-- 3. Ver se role é enum ou text
SELECT 
  column_name,
  data_type,
  udt_name,
  CASE 
    WHEN data_type = 'USER-DEFINED' THEN '⚠️ É ENUM - precisa cast'
    WHEN data_type = 'text' THEN '✅ É TEXT - ok direto'
    ELSE '❓ Verificar tipo'
  END as status
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

