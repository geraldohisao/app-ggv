-- ============================================
-- REMOVER CONSTRAINT DE user_function
-- ============================================
-- Problema: profiles.user_function tem CHECK constraint
-- que só permite: SDR, Closer, Gestor, Analista de Marketing
-- Solução: Remover constraint para aceitar qualquer cargo
-- ============================================

-- 1. Verificar qual constraint existe
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname LIKE '%user_function%';

-- 2. Remover a constraint (ajustar o nome se for diferente)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_user_function_check;

-- 3. Permitir NULL em user_function (se ainda não permitir)
ALTER TABLE profiles 
ALTER COLUMN user_function DROP NOT NULL;

-- 4. Adicionar índice para performance (opcional)
CREATE INDEX IF NOT EXISTS idx_profiles_user_function 
ON profiles(user_function) 
WHERE user_function IS NOT NULL;

-- 5. Comentário atualizado
COMMENT ON COLUMN profiles.user_function IS 'Cargo do usuário (texto livre, sincronizado com tabela cargos)';

-- ============================================
-- FIM
-- ============================================

-- Agora user_function aceita qualquer texto
-- Incluindo os cargos customizáveis da tabela 'cargos'

