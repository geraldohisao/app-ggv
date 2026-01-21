-- ============================================
-- Atualização dos Rituais de Sprint (OKR) - v2
-- ============================================

-- 1. Atualizar a constraint de CHECK para incluir 'semestral' e 'anual'
ALTER TABLE sprints 
DROP CONSTRAINT IF EXISTS sprints_type_check;

ALTER TABLE sprints 
ADD CONSTRAINT sprints_type_check 
CHECK (type IN ('semanal', 'mensal', 'trimestral', 'semestral', 'anual'));

-- 2. Adicionar coluna para agrupar instâncias do mesmo ritual (histórico)
ALTER TABLE sprints 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES sprints(id) ON DELETE SET NULL;

-- 3. Adicionar coluna para marcar itens que foram "carregados" do ritual anterior
ALTER TABLE sprint_items
ADD COLUMN IF NOT EXISTS is_carry_over BOOLEAN DEFAULT false;

-- 4. Atualizar comentários
COMMENT ON COLUMN sprints.type IS 'Tipo de sprint/ritual (semanal/mensal/trimestral/semestral/anual)';
COMMENT ON COLUMN sprints.parent_id IS 'Link para a instância anterior do ritual (permite rastrear histórico)';
COMMENT ON TABLE sprints IS 'Ritmos de Gestão OKR: Sprints semanais a Rituais anuais';

-- 5. Índices para performance no histórico
CREATE INDEX IF NOT EXISTS idx_sprints_parent_id ON sprints(parent_id);
