-- ============================================
-- OKR v2 - Sistema Simplificado (2026)
-- ============================================
-- Data: 2026-01-07
-- Escopo: OKRs + Sprints (SEM IA, SEM PDF, SEM Reuniões)
-- ============================================

-- ============================================
-- 1. TABELA: okrs
-- ============================================

CREATE TABLE IF NOT EXISTS okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('estratégico', 'setorial')),
  department TEXT NOT NULL CHECK (department IN ('comercial', 'marketing', 'projetos', 'geral')),
  owner TEXT NOT NULL,
  objective TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  periodicity TEXT NOT NULL CHECK (periodicity IN ('mensal', 'trimestral')),
  status TEXT NOT NULL DEFAULT 'não iniciado' CHECK (status IN ('não iniciado', 'em andamento', 'concluído')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_okrs_user_id ON okrs(user_id);
CREATE INDEX IF NOT EXISTS idx_okrs_level ON okrs(level);
CREATE INDEX IF NOT EXISTS idx_okrs_department ON okrs(department);
CREATE INDEX IF NOT EXISTS idx_okrs_status ON okrs(status);
CREATE INDEX IF NOT EXISTS idx_okrs_dates ON okrs(start_date, end_date);

-- Comentários
COMMENT ON TABLE okrs IS 'OKRs estratégicos e setoriais (v2 - simplificado)';
COMMENT ON COLUMN okrs.level IS 'estratégico (CEO) ou setorial (heads)';
COMMENT ON COLUMN okrs.department IS 'geral (estratégico) ou comercial/marketing/projetos (setorial)';
COMMENT ON COLUMN okrs.owner IS 'Nome do responsável (texto livre)';

-- ============================================
-- 2. TABELA: key_results
-- ============================================

CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'vermelho' CHECK (status IN ('verde', 'amarelo', 'vermelho')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_key_results_okr_id ON key_results(okr_id);
CREATE INDEX IF NOT EXISTS idx_key_results_status ON key_results(status);

-- Comentários
COMMENT ON TABLE key_results IS 'Key Results dos OKRs (métricas numéricas)';
COMMENT ON COLUMN key_results.current_value IS 'Valor atual (atualizado manualmente)';
COMMENT ON COLUMN key_results.target_value IS 'Meta a ser atingida';
COMMENT ON COLUMN key_results.unit IS 'Unidade de medida (ex: %, R$, SQL)';
COMMENT ON COLUMN key_results.status IS 'Cor do indicador (verde/amarelo/vermelho)';

-- ============================================
-- 3. TABELA: sprints
-- ============================================

CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID REFERENCES okrs(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('semanal', 'mensal', 'trimestral')),
  department TEXT NOT NULL CHECK (department IN ('comercial', 'marketing', 'projetos', 'geral')),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada', 'em andamento', 'concluída', 'cancelada')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sprints_okr_id ON sprints(okr_id);
CREATE INDEX IF NOT EXISTS idx_sprints_type ON sprints(type);
CREATE INDEX IF NOT EXISTS idx_sprints_department ON sprints(department);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sprints_created_by ON sprints(created_by);

-- Comentários
COMMENT ON TABLE sprints IS 'Sprints semanais, mensais e trimestrais';
COMMENT ON COLUMN sprints.okr_id IS 'OKR vinculado (opcional)';
COMMENT ON COLUMN sprints.type IS 'Tipo de sprint (semanal/mensal/trimestral)';

-- ============================================
-- 4. TABELA: sprint_items
-- ============================================

CREATE TABLE IF NOT EXISTS sprint_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('iniciativa', 'impedimento', 'decisão')),
  title TEXT NOT NULL,
  description TEXT,
  responsible TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em andamento', 'concluído')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sprint_items_sprint_id ON sprint_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_items_type ON sprint_items(type);
CREATE INDEX IF NOT EXISTS idx_sprint_items_status ON sprint_items(status);

-- Comentários
COMMENT ON TABLE sprint_items IS 'Itens da sprint (iniciativas, impedimentos, decisões)';
COMMENT ON COLUMN sprint_items.type IS 'iniciativa/impedimento/decisão';
COMMENT ON COLUMN sprint_items.responsible IS 'Nome do responsável (texto livre)';

-- ============================================
-- 5. TRIGGER: updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas relevantes
DROP TRIGGER IF EXISTS update_okrs_updated_at ON okrs;
CREATE TRIGGER update_okrs_updated_at 
  BEFORE UPDATE ON okrs
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_key_results_updated_at ON key_results;
CREATE TRIGGER update_key_results_updated_at 
  BEFORE UPDATE ON key_results
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. PREPARAR TABELA profiles
-- ============================================

-- Adicionar coluna 'department' em 'profiles' se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='department'
  ) THEN
    ALTER TABLE profiles ADD COLUMN department TEXT 
      CHECK (department IN ('comercial', 'marketing', 'projetos', 'geral'));
    
    COMMENT ON COLUMN profiles.department IS 'Departamento do usuário (para permissões de HEAD)';
  END IF;
END $$;

-- ============================================
-- 7. RLS (Row Level Security) - POLÍTICAS
-- ============================================

-- Ativar RLS
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7.1. POLÍTICAS: okrs
-- ============================================

-- CEO (SUPER_ADMIN): acesso total
DROP POLICY IF EXISTS "ceo_full_access_okrs" ON okrs;
CREATE POLICY "ceo_full_access_okrs" ON okrs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- HEAD (ADMIN): leitura de estratégico + seu dept
DROP POLICY IF EXISTS "head_read_strategic_and_own_dept_okrs" ON okrs;
CREATE POLICY "head_read_strategic_and_own_dept_okrs" ON okrs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
      AND (
        okrs.level = 'estratégico'
        OR okrs.department = profiles.department
      )
    )
  );

-- HEAD (ADMIN): escrita apenas no seu dept
DROP POLICY IF EXISTS "head_write_own_dept_okrs" ON okrs;
CREATE POLICY "head_write_own_dept_okrs" ON okrs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
      AND okrs.department = profiles.department
    )
  );

DROP POLICY IF EXISTS "head_update_own_dept_okrs" ON okrs;
CREATE POLICY "head_update_own_dept_okrs" ON okrs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
      AND okrs.department = profiles.department
    )
  );

DROP POLICY IF EXISTS "head_delete_own_dept_okrs" ON okrs;
CREATE POLICY "head_delete_own_dept_okrs" ON okrs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
      AND okrs.department = profiles.department
    )
  );

-- OPERATIONAL (USER): apenas leitura
DROP POLICY IF EXISTS "operational_read_only_okrs" ON okrs;
CREATE POLICY "operational_read_only_okrs" ON okrs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'USER'
    )
  );

-- ============================================
-- 7.2. POLÍTICAS: key_results (herda do OKR)
-- ============================================

DROP POLICY IF EXISTS "key_results_access" ON key_results;
CREATE POLICY "key_results_access" ON key_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM okrs
      WHERE okrs.id = key_results.okr_id
    )
  );

-- ============================================
-- 7.3. POLÍTICAS: sprints
-- ============================================

-- CEO: acesso total
DROP POLICY IF EXISTS "ceo_full_access_sprints" ON sprints;
CREATE POLICY "ceo_full_access_sprints" ON sprints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'SUPER_ADMIN'
    )
  );

-- HEAD: leitura de geral + seu dept
DROP POLICY IF EXISTS "head_read_general_and_own_dept_sprints" ON sprints;
CREATE POLICY "head_read_general_and_own_dept_sprints" ON sprints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
      AND (
        sprints.department = 'geral'
        OR sprints.department = profiles.department
      )
    )
  );

-- HEAD: escrita apenas no seu dept
DROP POLICY IF EXISTS "head_write_own_dept_sprints" ON sprints;
CREATE POLICY "head_write_own_dept_sprints" ON sprints
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
      AND sprints.department = profiles.department
    )
  );

DROP POLICY IF EXISTS "head_update_own_dept_sprints" ON sprints;
CREATE POLICY "head_update_own_dept_sprints" ON sprints
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
      AND sprints.department = profiles.department
    )
  );

DROP POLICY IF EXISTS "head_delete_own_dept_sprints" ON sprints;
CREATE POLICY "head_delete_own_dept_sprints" ON sprints
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
      AND sprints.department = profiles.department
    )
  );

-- OPERATIONAL: apenas leitura
DROP POLICY IF EXISTS "operational_read_only_sprints" ON sprints;
CREATE POLICY "operational_read_only_sprints" ON sprints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'USER'
    )
  );

-- ============================================
-- 7.4. POLÍTICAS: sprint_items (herda da sprint)
-- ============================================

DROP POLICY IF EXISTS "sprint_items_access" ON sprint_items;
CREATE POLICY "sprint_items_access" ON sprint_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sprints
      WHERE sprints.id = sprint_items.sprint_id
    )
  );

-- ============================================
-- 8. FUNÇÃO AUXILIAR: Calcular progresso de OKR
-- ============================================

CREATE OR REPLACE FUNCTION calculate_okr_progress(okr_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_krs INTEGER;
  avg_progress NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_krs
  FROM key_results
  WHERE okr_id = okr_uuid;
  
  IF total_krs = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT AVG(
    CASE 
      WHEN target_value > 0 THEN (current_value / target_value) * 100
      ELSE 0
    END
  ) INTO avg_progress
  FROM key_results
  WHERE okr_id = okr_uuid;
  
  RETURN LEAST(ROUND(avg_progress), 100);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_okr_progress IS 'Calcula progresso médio (%) de um OKR baseado nos Key Results';

-- ============================================
-- 9. VIEW: okrs_with_progress
-- ============================================

CREATE OR REPLACE VIEW okrs_with_progress AS
SELECT 
  okrs.*,
  calculate_okr_progress(okrs.id) AS progress,
  COUNT(key_results.id) AS total_key_results,
  SUM(CASE WHEN key_results.status = 'verde' THEN 1 ELSE 0 END) AS green_krs,
  SUM(CASE WHEN key_results.status = 'amarelo' THEN 1 ELSE 0 END) AS yellow_krs,
  SUM(CASE WHEN key_results.status = 'vermelho' THEN 1 ELSE 0 END) AS red_krs,
  CASE 
    WHEN okrs.end_date < CURRENT_DATE AND okrs.status != 'concluído' THEN true
    ELSE false
  END AS is_overdue
FROM okrs
LEFT JOIN key_results ON key_results.okr_id = okrs.id
GROUP BY okrs.id;

COMMENT ON VIEW okrs_with_progress IS 'OKRs com progresso calculado e contagem de KRs por cor';

-- ============================================
-- 10. VIEW: sprints_with_metrics
-- ============================================

CREATE OR REPLACE VIEW sprints_with_metrics AS
SELECT 
  sprints.*,
  okrs.objective AS okr_title,
  COUNT(sprint_items.id) AS total_items,
  SUM(CASE WHEN sprint_items.type = 'iniciativa' THEN 1 ELSE 0 END) AS initiatives,
  SUM(CASE WHEN sprint_items.type = 'impedimento' THEN 1 ELSE 0 END) AS impediments,
  SUM(CASE WHEN sprint_items.type = 'decisão' THEN 1 ELSE 0 END) AS decisions,
  SUM(CASE WHEN sprint_items.status = 'concluído' THEN 1 ELSE 0 END) AS completed_items,
  CASE 
    WHEN COUNT(sprint_items.id) > 0 
    THEN ROUND((SUM(CASE WHEN sprint_items.status = 'concluído' THEN 1 ELSE 0 END)::NUMERIC / COUNT(sprint_items.id)) * 100)
    ELSE 0
  END AS completion_percentage
FROM sprints
LEFT JOIN okrs ON okrs.id = sprints.okr_id
LEFT JOIN sprint_items ON sprint_items.sprint_id = sprints.id
GROUP BY sprints.id, okrs.objective;

COMMENT ON VIEW sprints_with_metrics IS 'Sprints com métricas de itens e progresso';

-- ============================================
-- FIM DO SCHEMA
-- ============================================

-- Para testar:
-- SELECT * FROM okrs_with_progress;
-- SELECT * FROM sprints_with_metrics;

