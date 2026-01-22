-- =========================================
-- CRIAR TABELA personal_tasks
-- Tasks pessoais dos usuários (independentes de sprints)
-- =========================================

-- 1. Criar tabela personal_tasks
CREATE TABLE IF NOT EXISTS personal_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pendente' 
        CHECK (status IN ('pendente', 'em andamento', 'concluido')),
    priority TEXT DEFAULT 'media' 
        CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_personal_tasks_user_id ON personal_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_status ON personal_tasks(status);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_due_date ON personal_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_created_at ON personal_tasks(created_at);

-- 3. Habilitar RLS
ALTER TABLE personal_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS (permissivas para anon/autenticado)
-- Nota: O sistema usa autenticação customizada (ggv-user), então liberamos anon

DROP POLICY IF EXISTS "Usuário pode ver suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_read_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "anon_read_personal_tasks" ON personal_tasks;
CREATE POLICY "anon_read_personal_tasks"
    ON personal_tasks FOR SELECT
    TO anon, authenticated
    USING (true);  -- Leitura permitida (filtro é feito na aplicação)

DROP POLICY IF EXISTS "Usuário pode criar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_insert_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "anon_insert_personal_tasks" ON personal_tasks;
CREATE POLICY "anon_insert_personal_tasks"
    ON personal_tasks FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);  -- Inserção permitida para usuários autenticados

DROP POLICY IF EXISTS "Usuário pode atualizar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_update_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "anon_update_personal_tasks" ON personal_tasks;
CREATE POLICY "anon_update_personal_tasks"
    ON personal_tasks FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);  -- Atualização permitida

DROP POLICY IF EXISTS "Usuário pode deletar suas próprias tasks" ON personal_tasks;
DROP POLICY IF EXISTS "authenticated_delete_personal_tasks" ON personal_tasks;
DROP POLICY IF EXISTS "anon_delete_personal_tasks" ON personal_tasks;
CREATE POLICY "anon_delete_personal_tasks"
    ON personal_tasks FOR DELETE
    TO anon, authenticated
    USING (true);  -- Deleção permitida

-- 5. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_personal_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Se status mudou para concluido, preencher completed_at
    IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
        NEW.completed_at = NOW();
    END IF;
    -- Se status mudou de concluido para outro, limpar completed_at
    IF NEW.status != 'concluido' AND OLD.status = 'concluido' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_personal_tasks_updated_at ON personal_tasks;
CREATE TRIGGER trigger_personal_tasks_updated_at
    BEFORE UPDATE ON personal_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_personal_tasks_updated_at();

-- 6. Verificar criação
SELECT 
    'Tabela personal_tasks criada com sucesso!' as status,
    COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'personal_tasks';

-- ✅ Pronto! Tabela personal_tasks criada com RLS configurado!
