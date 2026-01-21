-- ============================================
-- CORRIGIR: Foreign Key Constraint profiles → users
-- ============================================

-- Ver as constraints atuais
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Remover a constraint profiles_id_fkey (se existir)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Verificar que foi removida
SELECT
  tc.constraint_name,
  tc.table_name
FROM information_schema.table_constraints AS tc
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'profiles_id_fkey';

SELECT CASE 
  WHEN COUNT(*) = 0 THEN '✅ Constraint removida com sucesso!'
  ELSE '⚠️ Constraint ainda existe'
END as status
FROM information_schema.table_constraints
WHERE table_name = 'profiles'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name = 'profiles_id_fkey';

-- ============================================
-- EXPLICAÇÃO
-- ============================================

/*
POR QUE REMOVER?

A constraint profiles.id → users.id força que:
  - Todo profile precisa ter um user correspondente em auth.users
  - Mas queremos importar usuários do Google que NUNCA logaram
  - Eles não existem em auth.users ainda
  - Logo, a constraint bloqueia a importação

SEGURO REMOVER?

✅ SIM! Porque:
  - Profiles podem existir independentemente
  - Quando o usuário logar, o sistema vincula automaticamente
  - Não quebra nada (apenas remove a restrição)

PRÓXIMO PASSO:
Teste novamente a importação!
*/

