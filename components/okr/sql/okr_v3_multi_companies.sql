-- ============================================
-- OKR v3.0 - MULTI-UNIDADES DE NEGÓCIO
-- ============================================
-- Suporte para Grupo GGV com múltiplas empresas
-- ============================================

-- ============================================
-- 1. TABELA DE EMPRESAS
-- ============================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  color TEXT DEFAULT '#5B5FF5',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

COMMENT ON TABLE companies IS 'Empresas do Grupo GGV';

-- Seeds das empresas do grupo
INSERT INTO companies (name, slug, description, color) VALUES
  ('GGV Inteligência em Vendas', 'ggv', 'Consultoria e inteligência comercial', '#5B5FF5'),
  ('Harpia Consultoria Empresarial', 'harpia-consultoria', 'Consultoria estratégica e empresarial', '#8B5CF6'),
  ('Harpia BPO', 'harpia-bpo', 'Terceirização de processos de negócio', '#10B981'),
  ('Sellbot', 'sellbot', 'Automação de vendas e chatbots inteligentes', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. ADICIONAR company_id NAS TABELAS
-- ============================================

-- 2.1. OKRs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='okrs' AND column_name='company_id'
  ) THEN
    ALTER TABLE okrs ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_okrs_company ON okrs(company_id);
    COMMENT ON COLUMN okrs.company_id IS 'Empresa à qual este OKR pertence';
    
    -- Preencher OKRs existentes com a empresa padrão (GGV)
    UPDATE okrs 
    SET company_id = (SELECT id FROM companies WHERE slug = 'ggv' LIMIT 1)
    WHERE company_id IS NULL;
  END IF;
END $$;

-- 2.2. Sprints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sprints' AND column_name='company_id'
  ) THEN
    ALTER TABLE sprints ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_sprints_company ON sprints(company_id);
    COMMENT ON COLUMN sprints.company_id IS 'Empresa à qual esta Sprint pertence';
    
    -- Preencher Sprints existentes com a empresa padrão (GGV)
    UPDATE sprints 
    SET company_id = (SELECT id FROM companies WHERE slug = 'ggv' LIMIT 1)
    WHERE company_id IS NULL;
  END IF;
END $$;

-- 2.3. Profiles (empresa principal do usuário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='company_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);
    CREATE INDEX idx_profiles_company ON profiles(company_id);
    COMMENT ON COLUMN profiles.company_id IS 'Empresa principal do usuário';
    
    -- Preencher profiles existentes com a empresa padrão (GGV)
    UPDATE profiles 
    SET company_id = (SELECT id FROM companies WHERE slug = 'ggv' LIMIT 1)
    WHERE company_id IS NULL;
  END IF;
END $$;

-- ============================================
-- 3. ACESSO MULTI-EMPRESA (usuário pode acessar várias)
-- ============================================

CREATE TABLE IF NOT EXISTS user_company_access (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'VIEWER' CHECK (role IN ('OWNER', 'ADMIN', 'VIEWER')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_company_user ON user_company_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_company ON user_company_access(company_id);

COMMENT ON TABLE user_company_access IS 'Controle de acesso de usuários a múltiplas empresas';
COMMENT ON COLUMN user_company_access.role IS 'OWNER (dono), ADMIN (gerencia), VIEWER (visualiza)';

-- Dar acesso de OWNER para todos os SuperAdmins em todas as empresas
INSERT INTO user_company_access (user_id, company_id, role)
SELECT p.id, c.id, 'OWNER'
FROM profiles p
CROSS JOIN companies c
WHERE p.role = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. RLS ATUALIZADA (considerar company_id)
-- ============================================

-- OKRs: usuário só vê OKRs das empresas que tem acesso
DROP POLICY IF EXISTS "okrs_company_access" ON okrs;
CREATE POLICY "okrs_company_access" ON okrs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM user_company_access 
      WHERE user_id = auth.uid()
    )
  );

-- Para criar/editar OKRs: precisa ser ADMIN ou OWNER da empresa
DROP POLICY IF EXISTS "okrs_company_write" ON okrs;
CREATE POLICY "okrs_company_write" ON okrs
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM user_company_access 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================
-- 5. FUNÇÕES HELPER
-- ============================================

-- Listar empresas que o usuário tem acesso
CREATE OR REPLACE FUNCTION list_my_companies()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  logo_url TEXT,
  color TEXT,
  my_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.description,
    c.logo_url,
    c.color,
    uca.role AS my_role
  FROM companies c
  JOIN user_company_access uca ON uca.company_id = c.id
  WHERE uca.user_id = auth.uid()
  AND c.is_active = TRUE
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_my_companies() TO authenticated;

-- Verificar se usuário tem acesso a uma empresa
CREATE OR REPLACE FUNCTION can_access_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_company_access
    WHERE user_id = auth.uid()
    AND company_id = company_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_access_company TO authenticated;

-- Dashboard consolidado do grupo (só para OWNERs)
CREATE OR REPLACE FUNCTION get_group_dashboard()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Verificar se é OWNER de pelo menos uma empresa
  IF NOT EXISTS (
    SELECT 1 FROM user_company_access
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
  ) THEN
    RAISE EXCEPTION 'Apenas owners podem ver dashboard do grupo';
  END IF;

  SELECT json_build_object(
    'companies', (
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'total_okrs', (SELECT COUNT(*) FROM okrs WHERE company_id = c.id AND archived = FALSE),
          'avg_progress', (SELECT ROUND(AVG(calculate_okr_progress(id))) FROM okrs WHERE company_id = c.id AND archived = FALSE),
          'overdue', (SELECT COUNT(*) FROM okrs WHERE company_id = c.id AND end_date < CURRENT_DATE AND status != 'concluído')
        )
      )
      FROM companies c
      WHERE c.is_active = TRUE
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_group_dashboard() TO authenticated;

-- ============================================
-- FIM
-- ============================================

-- RESUMO:
-- ✅ Tabela 'companies' criada com seeds (GGV, Harpia, Sellbot)
-- ✅ company_id adicionado em okrs, sprints, profiles
-- ✅ Tabela 'user_company_access' para controle de acesso
-- ✅ RLS atualizada para respeitar company_id
-- ✅ Funções list_my_companies(), can_access_company(), get_group_dashboard()
-- ✅ SuperAdmins têm acesso OWNER a todas as empresas
-- ✅ Dados existentes associados à GGV (empresa padrão)

