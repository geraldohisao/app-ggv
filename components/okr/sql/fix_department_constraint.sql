-- ============================================
-- REMOVER CONSTRAINT DE DEPARTMENT
-- ============================================
-- Problema: profiles.department tem CHECK constraint
-- que só permite valores fixos (comercial, marketing, projetos, geral)
-- Solução: Remover constraint para aceitar departamentos customizáveis
-- ============================================

-- 1. Remover a constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_department_check;

-- 2. Permitir NULL
ALTER TABLE profiles 
ALTER COLUMN department DROP NOT NULL;

-- 3. Comentário atualizado
COMMENT ON COLUMN profiles.department IS 'Departamento do usuário (texto livre, sincronizado com tabela departments)';

-- ============================================
-- FIM
-- ============================================

-- Agora department aceita qualquer texto
-- Incluindo departamentos customizáveis da tabela 'departments'

