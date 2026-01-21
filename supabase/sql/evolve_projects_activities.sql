-- ============================================
-- Evolução: Projetos e Atividades (OKR/Sprint)
-- ============================================

-- 1. Criar a tabela de Projetos
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID REFERENCES okrs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'concluído', 'cancelado')),
  priority TEXT DEFAULT 'média' CHECK (priority IN ('baixa', 'média', 'alta', 'crítica')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Atualizar a tabela de sprint_items para suportar Projetos e novas Tipologias
ALTER TABLE sprint_items 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 3. Atualizar a constraint de CHECK de tipo para incluir 'atividade' e 'marco'
ALTER TABLE sprint_items 
DROP CONSTRAINT IF EXISTS sprint_items_type_check;

ALTER TABLE sprint_items 
ADD CONSTRAINT sprint_items_type_check 
CHECK (type IN ('iniciativa', 'impedimento', 'decisão', 'atividade', 'marco'));

-- 4. Comentários para documentação
COMMENT ON TABLE projects IS 'Projetos que agrupam iniciativas e atividades vinculadas a OKRs';
COMMENT ON COLUMN sprint_items.type IS 'Tipo do item: Iniciativa, Impedimento, Decisão, Atividade (Tarefa) ou Marco (Milestone)';
COMMENT ON COLUMN sprint_items.project_id IS 'Vínculo opcional com um projeto estruturado';

-- 5. Trigger para updated_at em projects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
