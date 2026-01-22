-- Adicionar campo de responsável aos Key Results
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna responsible_user_id (FK para auth.users)
ALTER TABLE key_results
ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de queries por responsável
CREATE INDEX IF NOT EXISTS idx_key_results_responsible 
ON key_results(responsible_user_id) 
WHERE responsible_user_id IS NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN key_results.responsible_user_id IS 'Usuário responsável pelo Key Result (1 por KR)';
