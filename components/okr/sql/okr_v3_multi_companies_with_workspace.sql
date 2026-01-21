-- ============================================
-- OKR v3.0 - MULTI-UNIDADES + GOOGLE WORKSPACE
-- ============================================
-- Integrado com sincronização Google Workspace
-- Usa organizationalUnit do Google para determinar empresa
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
  -- Mapeamento com Google Workspace
  google_org_unit_path TEXT, -- Ex: /GGV, /Harpia, /Sellbot
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que as colunas cruciais existem mesmo se a tabela já existia antes
DO $$
BEGIN
  -- active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'active'
  ) THEN
    ALTER TABLE companies ADD COLUMN active BOOLEAN DEFAULT TRUE;
    UPDATE companies SET active = TRUE WHERE active IS NULL;
  END IF;

  -- slug
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'slug'
  ) THEN
    ALTER TABLE companies ADD COLUMN slug TEXT;
  END IF;

  -- google_org_unit_path
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'google_org_unit_path'
  ) THEN
    ALTER TABLE companies ADD COLUMN google_org_unit_path TEXT;
  END IF;

  -- description (para seeds e compatibilidade com inserts)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'description'
  ) THEN
    ALTER TABLE companies ADD COLUMN description TEXT;
  END IF;

  -- color (para seeds)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'color'
  ) THEN
    ALTER TABLE companies ADD COLUMN color TEXT DEFAULT '#5B5FF5';
  END IF;
END $$;

-- Preencher slug para linhas legadas (tabela já existente sem slug)
DO $$
BEGIN
  UPDATE companies
  SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
  WHERE slug IS NULL;

  -- Garantir unicidade caso haja nomes iguais: sufixo com hash curto
  UPDATE companies c
  SET slug = c.slug || '-' || substring(md5(c.id::text) for 6)
  FROM (
    SELECT slug, COUNT(*) AS qty
    FROM companies
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) d
  WHERE c.slug = d.slug;

  -- slug não pode ficar NULL
  UPDATE companies
  SET slug = 'company-' || substring(md5(id::text) for 8)
  WHERE slug IS NULL OR slug = '';
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(active);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_google_ou ON companies(google_org_unit_path);

COMMENT ON TABLE companies IS 'Empresas do Grupo GGV (sincronizadas com Google Workspace OUs)';
COMMENT ON COLUMN companies.google_org_unit_path IS 'Caminho da Organizational Unit no Google Workspace';

-- Seeds das empresas do grupo (com mapeamento Google Workspace)
INSERT INTO companies (name, slug, description, color, google_org_unit_path) VALUES
  ('GGV Inteligência em Vendas', 'ggv', 'Consultoria e inteligência comercial', '#5B5FF5', '/GGV'),
  ('Harpia Consultoria Empresarial', 'harpia-consultoria', 'Consultoria estratégica e empresarial', '#8B5CF6', '/Harpia/Consultoria'),
  ('Harpia BPO', 'harpia-bpo', 'Terceirização de processos de negócio', '#10B981', '/Harpia/BPO'),
  ('Sellbot', 'sellbot', 'Automação de vendas e chatbots inteligentes', '#F59E0B', '/Sellbot')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. ADICIONAR company_id NAS TABELAS
-- ============================================

-- OKRs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='okrs' AND column_name='company_id') THEN
    ALTER TABLE okrs ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_okrs_company ON okrs(company_id);
    
    -- Preencher com empresa padrão (GGV)
    UPDATE okrs SET company_id = (SELECT id FROM companies WHERE slug = 'ggv' LIMIT 1) WHERE company_id IS NULL;
  END IF;
END $$;

-- Sprints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sprints' AND column_name='company_id') THEN
    ALTER TABLE sprints ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_sprints_company ON sprints(company_id);
    
    UPDATE sprints SET company_id = (SELECT id FROM companies WHERE slug = 'ggv' LIMIT 1) WHERE company_id IS NULL;
  END IF;
END $$;

-- Profiles (empresa principal do usuário - sincronizada com Google OU)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='company_id') THEN
    ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);
    CREATE INDEX idx_profiles_company ON profiles(company_id);
    
    UPDATE profiles SET company_id = (SELECT id FROM companies WHERE slug = 'ggv' LIMIT 1) WHERE company_id IS NULL;
  END IF;
END $$;

-- ============================================
-- 3. FUNÇÃO PARA MAPEAR OU GOOGLE → EMPRESA
-- ============================================

CREATE OR REPLACE FUNCTION get_company_from_google_ou(ou_path TEXT)
RETURNS UUID AS $$
DECLARE
  company_uuid UUID;
BEGIN
  -- Tentar match exato primeiro
  SELECT id INTO company_uuid
  FROM companies
  WHERE google_org_unit_path = ou_path
  AND active = TRUE
  LIMIT 1;
  
  IF company_uuid IS NOT NULL THEN
    RETURN company_uuid;
  END IF;
  
  -- Tentar match parcial (ex: /GGV/Vendas → /GGV)
  SELECT id INTO company_uuid
  FROM companies
  WHERE ou_path LIKE google_org_unit_path || '%'
  AND active = TRUE
  ORDER BY LENGTH(google_org_unit_path) DESC
  LIMIT 1;
  
  IF company_uuid IS NOT NULL THEN
    RETURN company_uuid;
  END IF;
  
  -- Fallback: empresa padrão (GGV)
  SELECT id INTO company_uuid
  FROM companies
  WHERE slug = 'ggv'
  LIMIT 1;
  
  RETURN company_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_company_from_google_ou IS 'Mapeia Organizational Unit do Google para empresa no sistema';

-- ============================================
-- 4. SINCRONIZAR company_id COM GOOGLE OU
-- ============================================

-- Atualizar company_id dos profiles baseado no Google Workspace OU
UPDATE profiles p
SET company_id = get_company_from_google_ou(
  (SELECT (google_data->>'orgUnitPath')::TEXT 
   FROM workspace_user_mapping 
   WHERE profile_id = p.id)
)
WHERE EXISTS (
  SELECT 1 FROM workspace_user_mapping WHERE profile_id = p.id
)
AND company_id IS NULL;

-- ============================================
-- 5. ACESSO MULTI-EMPRESA
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

-- Dar acesso automático:
-- - Usuário acessa sua empresa principal (do Google OU)
-- - SuperAdmins acessam todas as empresas (OWNER)

INSERT INTO user_company_access (user_id, company_id, role)
SELECT p.id, p.company_id, 'ADMIN'
FROM profiles p
WHERE p.company_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_company_access WHERE user_id = p.id AND company_id = p.company_id
);

INSERT INTO user_company_access (user_id, company_id, role)
SELECT p.id, c.id, 'OWNER'
FROM profiles p
CROSS JOIN companies c
WHERE p.role = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. FUNÇÕES HELPER
-- ============================================

CREATE OR REPLACE FUNCTION list_my_companies()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  color TEXT,
  my_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.name, c.slug, c.description, c.color,
    uca.role AS my_role
  FROM companies c
  JOIN user_company_access uca ON uca.company_id = c.id
  WHERE uca.user_id = auth.uid()
  AND c.active = TRUE
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_my_companies() TO authenticated;

-- Dashboard consolidado do grupo
CREATE OR REPLACE FUNCTION get_group_dashboard()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'color', c.color,
        'total_okrs', (SELECT COUNT(*) FROM okrs WHERE company_id = c.id AND archived = FALSE),
        'avg_progress', COALESCE((SELECT ROUND(AVG(calculate_okr_progress(id))) FROM okrs WHERE company_id = c.id AND archived = FALSE), 0),
        'overdue', (SELECT COUNT(*) FROM okrs WHERE company_id = c.id AND end_date < CURRENT_DATE AND status != 'concluído' AND archived = FALSE),
        'users_count', (SELECT COUNT(*) FROM profiles WHERE company_id = c.id)
      )
    )
    FROM companies c
    WHERE c.id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
    AND c.active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_group_dashboard() TO authenticated;

-- ============================================
-- 7. ATUALIZAR RLS PARA CONSIDERAR EMPRESA
-- ============================================

-- OKRs: usuário vê apenas OKRs das empresas que tem acesso
DROP POLICY IF EXISTS "okrs_company_read" ON okrs;
CREATE POLICY "okrs_company_read" ON okrs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

-- Criar OKR: só em empresas onde é OWNER ou ADMIN
DROP POLICY IF EXISTS "okrs_company_insert" ON okrs;
CREATE POLICY "okrs_company_insert" ON okrs
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Similar para Sprints
DROP POLICY IF EXISTS "sprints_company_read" ON sprints;
CREATE POLICY "sprints_company_read" ON sprints
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- FIM
-- ============================================

-- RESUMO:
-- ✅ Tabela 'companies' com seeds (GGV, Harpia, Sellbot)
-- ✅ Mapeamento com Google Workspace OUs
-- ✅ company_id em okrs, sprints, profiles
-- ✅ Sync automático com Google OU → company
-- ✅ Acesso multi-empresa (user_company_access)
-- ✅ RLS atualizada para filtrar por empresa
-- ✅ Funções list_my_companies(), get_group_dashboard()
-- ✅ SuperAdmins acessam todas as empresas
-- ✅ Dados existentes vão para GGV (empresa padrão)

-- PRÓXIMO:
-- Implementar seletor de empresa no frontend

