-- ============================================
-- LISTAS CUSTOMIZÁVEIS - DEPARTAMENTOS E CARGOS
-- ============================================
-- Permite criar/editar/deletar departamentos e cargos
-- ao invés de usar listas fixas no código
-- ============================================

-- ============================================
-- 1. TABELA DE DEPARTAMENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#5B5FF5', -- Cor para UI
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);

COMMENT ON TABLE departments IS 'Departamentos customizáveis do sistema';
COMMENT ON COLUMN departments.color IS 'Cor hexadecimal para identificação visual';

-- Seeds padrão de departamentos
INSERT INTO departments (name, description, color) VALUES
  ('Geral', 'Departamento geral/estratégico', '#64748B'),
  ('Comercial', 'Departamento de vendas e comercial', '#3B82F6'),
  ('Marketing', 'Departamento de marketing e geração de leads', '#8B5CF6'),
  ('Projetos', 'Departamento de projetos e operações', '#10B981')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. TABELA DE CARGOS
-- ============================================

CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  level INTEGER DEFAULT 5, -- Hierarquia: 1=CEO, 2=Diretoria, 3=Head, 4=Gerente, 5=Operacional
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cargos_level ON cargos(level);
CREATE INDEX IF NOT EXISTS idx_cargos_active ON cargos(is_active);

COMMENT ON TABLE cargos IS 'Cargos customizáveis do sistema';
COMMENT ON COLUMN cargos.level IS 'Nível hierárquico (1=mais alto, 5=mais baixo)';

-- Seeds padrão de cargos
INSERT INTO cargos (name, description, level) VALUES
  ('CEO', 'Chief Executive Officer', 1),
  ('Diretor', 'Diretoria executiva', 2),
  ('Head Comercial', 'Head do departamento comercial', 3),
  ('Head Marketing', 'Head do departamento de marketing', 3),
  ('Head Projetos', 'Head do departamento de projetos', 3),
  ('Gerente', 'Gerente de área', 4),
  ('Coordenador', 'Coordenador de equipe', 4),
  ('SDR', 'Sales Development Representative', 5),
  ('Closer', 'Closer de vendas', 5),
  ('Analista', 'Analista operacional', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. RLS POLICIES
-- ============================================

-- Departamentos: todos podem ler, só admin pode editar
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_read_all" ON departments;
CREATE POLICY "departments_read_all" ON departments
  FOR SELECT
  USING (true); -- Todos podem ler

DROP POLICY IF EXISTS "departments_write_admin" ON departments;
CREATE POLICY "departments_write_admin" ON departments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Cargos: todos podem ler, só admin pode editar
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cargos_read_all" ON cargos;
CREATE POLICY "cargos_read_all" ON cargos
  FOR SELECT
  USING (true); -- Todos podem ler

DROP POLICY IF EXISTS "cargos_write_admin" ON cargos;
CREATE POLICY "cargos_write_admin" ON cargos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ============================================
-- 4. FUNÇÕES HELPER
-- ============================================

-- Listar departamentos ativos
CREATE OR REPLACE FUNCTION list_active_departments()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.name, d.description, d.color
  FROM departments d
  WHERE d.is_active = TRUE
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_active_departments() TO authenticated;

-- Listar cargos ativos
CREATE OR REPLACE FUNCTION list_active_cargos()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.description, c.level
  FROM cargos c
  WHERE c.is_active = TRUE
  ORDER BY c.level, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_active_cargos() TO authenticated;

-- ============================================
-- 5. TRIGGERS DE UPDATED_AT
-- ============================================

CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cargos_updated_at 
  BEFORE UPDATE ON cargos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIM
-- ============================================

-- RESUMO:
-- ✅ Tabela 'departments' com seeds padrão
-- ✅ Tabela 'cargos' com seeds padrão
-- ✅ RLS policies (todos lêem, só admin edita)
-- ✅ Funções list_active_departments() e list_active_cargos()
-- ✅ Triggers de updated_at

-- PRÓXIMO PASSO:
-- Criar interface de CRUD no SettingsPage para admin gerenciar essas listas

