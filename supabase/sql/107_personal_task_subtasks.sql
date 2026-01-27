-- =========================================
-- Migration: Criar tabela personal_task_subtasks
-- Permite adicionar subtarefas/checklist a tarefas pessoais
-- =========================================

-- 1. Criar tabela de subtarefas
CREATE TABLE IF NOT EXISTS personal_task_subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES personal_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0, -- Para ordenação
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_personal_task_subtasks_task_id 
ON personal_task_subtasks(task_id);

CREATE INDEX IF NOT EXISTS idx_personal_task_subtasks_position 
ON personal_task_subtasks(task_id, position);

-- 3. Comentários para documentação
COMMENT ON TABLE personal_task_subtasks IS 
  'Subtarefas/checklist para tarefas pessoais';

COMMENT ON COLUMN personal_task_subtasks.task_id IS 
  'FK para personal_tasks. Subtarefas são deletadas em cascata.';

COMMENT ON COLUMN personal_task_subtasks.position IS 
  'Ordem de exibição da subtarefa dentro da tarefa pai';

-- 4. Trigger para atualizar completed_at quando is_completed muda
CREATE OR REPLACE FUNCTION update_subtask_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        NEW.completed_at = NOW();
    ELSIF NEW.is_completed = false AND OLD.is_completed = true THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subtask_completed_at ON personal_task_subtasks;
CREATE TRIGGER trigger_update_subtask_completed_at
    BEFORE UPDATE ON personal_task_subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_subtask_completed_at();

-- 5. RLS (Row Level Security) - Subtarefas herdam a visibilidade da tarefa pai
ALTER TABLE personal_task_subtasks ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário pode ver subtarefas das suas tarefas
CREATE POLICY "Users can view subtasks of their tasks"
ON personal_task_subtasks FOR SELECT
USING (
    task_id IN (
        SELECT id FROM personal_tasks WHERE user_id = auth.uid()
    )
);

-- Policy: Usuário pode inserir subtarefas nas suas tarefas
CREATE POLICY "Users can insert subtasks to their tasks"
ON personal_task_subtasks FOR INSERT
WITH CHECK (
    task_id IN (
        SELECT id FROM personal_tasks WHERE user_id = auth.uid()
    )
);

-- Policy: Usuário pode atualizar subtarefas das suas tarefas
CREATE POLICY "Users can update subtasks of their tasks"
ON personal_task_subtasks FOR UPDATE
USING (
    task_id IN (
        SELECT id FROM personal_tasks WHERE user_id = auth.uid()
    )
);

-- Policy: Usuário pode deletar subtarefas das suas tarefas
CREATE POLICY "Users can delete subtasks of their tasks"
ON personal_task_subtasks FOR DELETE
USING (
    task_id IN (
        SELECT id FROM personal_tasks WHERE user_id = auth.uid()
    )
);

-- 6. Verificar que a tabela foi criada
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'personal_task_subtasks'
ORDER BY ordinal_position;

-- ✅ Pronto! Tabela personal_task_subtasks criada com RLS
