-- =========================================
-- Migration: Adicionar responsible_user_id em personal_tasks
-- Permite que admins (CEO/HEAD/SUPER_ADMIN) atribuam tarefas para outros usuários
-- =========================================

-- 1. Adicionar coluna responsible_user_id (nullable, referencia profiles)
ALTER TABLE personal_tasks
ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Criar índice para performance em queries por responsável
CREATE INDEX IF NOT EXISTS idx_personal_tasks_responsible_user_id 
ON personal_tasks(responsible_user_id);

-- 3. Comentário na coluna para documentação
COMMENT ON COLUMN personal_tasks.responsible_user_id IS 
  'ID do usuário responsável pela tarefa (quando diferente do criador). Apenas admins podem atribuir.';

-- 4. Verificar que a coluna foi criada
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'personal_tasks'
  AND column_name = 'responsible_user_id';

-- ✅ Pronto! Coluna responsible_user_id adicionada à tabela personal_tasks
