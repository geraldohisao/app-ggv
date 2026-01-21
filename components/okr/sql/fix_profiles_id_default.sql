-- ============================================
-- CORRIGIR: Coluna ID sem DEFAULT
-- ============================================

-- Verificar se id tem default
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'id';

-- Adicionar DEFAULT gen_random_uuid() se não tiver
ALTER TABLE profiles 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verificar novamente
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'id';

-- Resumo
SELECT '✅ Coluna id agora tem DEFAULT gen_random_uuid()' as status;

-- ============================================
-- FIM
-- ============================================

/*
Agora a função workspace_sync_user() vai funcionar!
O id será gerado automaticamente quando criar novo usuário.
*/

