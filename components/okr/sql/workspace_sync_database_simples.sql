-- ============================================
-- WORKSPACE SYNC: BANCO DE DADOS SIMPLIFICADO
-- ============================================
-- Google importa: email, nome, cargo, department, status
-- Role: gerenciado 100% no sistema GGV (nunca toca)
-- ============================================

-- ============================================
-- PARTE 1: ADICIONAR CAMPOS EM PROFILES
-- ============================================

-- Campo para armazenar Google User ID
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Campo para última sincronização
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Campo para Unidade Organizacional
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organizational_unit TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON profiles(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_synced ON profiles(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_profiles_org_unit ON profiles(organizational_unit);

-- Comentários
COMMENT ON COLUMN profiles.google_id IS 'ID do usuário no Google Workspace (único)';
COMMENT ON COLUMN profiles.last_synced_at IS 'Data da última sincronização com Google Workspace';
COMMENT ON COLUMN profiles.organizational_unit IS 'Unidade Organizacional do Google Workspace (ex: Grupo GGV, Harpia, etc)';

-- ============================================
-- PARTE 2: TABELA DE LOG
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  users_imported INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_skipped INTEGER DEFAULT 0,
  users_deactivated INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES profiles(id),
  summary JSONB,
  errors JSONB,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_workspace_sync_log_date ON workspace_sync_log(synced_at DESC);

COMMENT ON TABLE workspace_sync_log IS 'Log de sincronizações com Google Workspace';

-- ============================================
-- PARTE 3: TABELA DE MAPEAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_user_mapping (
  google_id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  first_imported_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  google_data JSONB,
  UNIQUE(profile_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_mapping_profile ON workspace_user_mapping(profile_id);
CREATE INDEX IF NOT EXISTS idx_workspace_mapping_email ON workspace_user_mapping(google_email);

COMMENT ON TABLE workspace_user_mapping IS 'Mapeamento Google ↔ GGV';

-- ============================================
-- PARTE 4: TABELA DE UNIDADES ORGANIZACIONAIS
-- ============================================

CREATE TABLE IF NOT EXISTS organizational_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- Nome normalizado (ex: "Grupo GGV", "Harpia")
  google_ou_path TEXT UNIQUE, -- Path do Google (ex: "/", "/Harpia Consultoria Empresarial")
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_units_active ON organizational_units(is_active);

COMMENT ON TABLE organizational_units IS 'Unidades organizacionais importadas do Google Workspace';

-- Seeds padrão
INSERT INTO organizational_units (name, google_ou_path, description) VALUES
  ('Grupo GGV', '/', 'Unidade principal do Grupo GGV'),
  ('Harpia', '/Harpia Consultoria Empresarial', 'Harpia Consultoria Empresarial'),
  ('GGV Inteligência', '/GGV Inteligência em Vendas', 'GGV Inteligência em Vendas')
ON CONFLICT (google_ou_path) DO NOTHING;

-- ============================================
-- PARTE 5: FUNÇÃO DE SYNC SIMPLIFICADA
-- ============================================

CREATE OR REPLACE FUNCTION workspace_sync_user(
  p_google_id TEXT,
  p_email TEXT,
  p_name TEXT,
  p_cargo TEXT,
  p_department TEXT,
  p_org_unit TEXT,
  p_is_active BOOLEAN,
  p_google_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Verificar se usuário já existe (por email ou google_id)
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE email = p_email OR google_id = p_google_id
  LIMIT 1;
  
  -- Se usuário já existe, atualizar
  IF v_profile_id IS NOT NULL THEN
    UPDATE profiles SET
      name = p_name,
      cargo = p_cargo,
      department = p_department,
      organizational_unit = p_org_unit,
      is_active = p_is_active,
      google_id = p_google_id,
      last_synced_at = NOW()
      -- ⚠️ NÃO toca no role (preserva o que está no sistema)
    WHERE id = v_profile_id;
    
    -- Atualizar mapeamento
    INSERT INTO workspace_user_mapping (google_id, profile_id, google_email, google_data, last_synced_at)
    VALUES (p_google_id, v_profile_id, p_email, p_google_data, NOW())
    ON CONFLICT (google_id) DO UPDATE SET
      last_synced_at = NOW(),
      google_data = p_google_data;
    
    RETURN v_profile_id;
  END IF;
  
  -- Se não existe, criar novo com role padrão 'USER'
  INSERT INTO profiles (email, name, cargo, department, organizational_unit, role, is_active, google_id, last_synced_at)
  VALUES (p_email, p_name, p_cargo, p_department, p_org_unit, 'USER', p_is_active, p_google_id, NOW())
  RETURNING id INTO v_profile_id;
  
  -- Criar mapeamento
  INSERT INTO workspace_user_mapping (google_id, profile_id, google_email, google_data, last_synced_at)
  VALUES (p_google_id, v_profile_id, p_email, p_google_data, NOW());
  
  RETURN v_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION workspace_sync_user TO authenticated, service_role;

COMMENT ON FUNCTION workspace_sync_user IS 
'Importa/atualiza usuário do Google Workspace.
NUNCA altera role (preserva gestão manual no sistema).
Importa: email, nome, cargo, department, organizational_unit, is_active.
Novos usuários são criados com role=USER por padrão.';

-- ============================================
-- PARTE 6: VERIFICAÇÃO
-- ============================================

-- Ver campos adicionados
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('google_id', 'last_synced_at', 'organizational_unit')
ORDER BY column_name;

-- Ver tabelas criadas
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('workspace_sync_log', 'workspace_user_mapping')
ORDER BY tablename;

-- Resumo
SELECT 
  'Banco preparado para Workspace Sync (versão simplificada)!' as "Status",
  'Role é gerenciado 100% no sistema GGV' as "Importante";

-- ============================================
-- FIM
-- ============================================

/*
✅ VERSÃO SIMPLIFICADA + UNIDADES ORGANIZACIONAIS:

CAMPOS EM PROFILES:
  - google_id → Link com Google
  - last_synced_at → Última sync
  - organizational_unit → Unidade (Grupo GGV, Harpia, etc)
  - (REMOVIDO: role_source - não precisa!)

TABELA organizational_units:
  - Catálogo de unidades organizacionais
  - Mapeamento de paths do Google
  - Seeds: Grupo GGV, Harpia, GGV Inteligência

FUNÇÃO workspace_sync_user():
  - Importa: email, nome, cargo, department, organizational_unit, is_active
  - NUNCA mexe em role (você gerencia manualmente)
  - Novos usuários: role = 'USER' por padrão

BENEFÍCIOS:
  ✅ Mais simples
  ✅ Mais seguro (role 100% sob seu controle)
  ✅ Menos campos
  ✅ Menos complexidade

PRÓXIMO PASSO:
Execute este script e depois configuro Google Cloud!
*/

