-- ============================================
-- WORKSPACE SYNC: PREPARAÇÃO DO BANCO DE DADOS
-- ============================================
-- Adiciona campos e tabelas necessárias para sync
-- ============================================

-- ============================================
-- PARTE 1: ADICIONAR CAMPOS EM PROFILES
-- ============================================

-- Campo para armazenar Google User ID
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Campo para controlar origem do role (google ou manual)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_source TEXT DEFAULT 'manual';

-- Campo para última sincronização
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON profiles(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role_source ON profiles(role_source);
CREATE INDEX IF NOT EXISTS idx_profiles_last_synced ON profiles(last_synced_at);

-- Comentários
COMMENT ON COLUMN profiles.google_id IS 'ID do usuário no Google Workspace (único)';
COMMENT ON COLUMN profiles.role_source IS 'Origem do role: google (inferido do Workspace) ou manual (editado no sistema)';
COMMENT ON COLUMN profiles.last_synced_at IS 'Data da última sincronização com Google Workspace';

-- ============================================
-- PARTE 2: TABELA DE LOG DE SINCRONIZAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_type TEXT DEFAULT 'manual', -- 'manual' | 'scheduled' | 'webhook'
  users_imported INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_skipped INTEGER DEFAULT 0,
  users_deactivated INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES profiles(id),
  summary JSONB,
  errors JSONB,
  duration_ms INTEGER,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_workspace_sync_log_date ON workspace_sync_log(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_sync_log_status ON workspace_sync_log(status);

COMMENT ON TABLE workspace_sync_log IS 'Log de sincronizações com Google Workspace';

-- ============================================
-- PARTE 3: TABELA DE MAPEAMENTO GOOGLE ↔ GGV
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_user_mapping (
  google_id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  first_imported_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_hash TEXT, -- Hash dos dados para detectar mudanças
  google_data JSONB, -- Snapshot dos dados do Google (backup)
  UNIQUE(profile_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_mapping_profile ON workspace_user_mapping(profile_id);
CREATE INDEX IF NOT EXISTS idx_workspace_mapping_email ON workspace_user_mapping(google_email);

COMMENT ON TABLE workspace_user_mapping IS 'Mapeamento entre usuários do Google Workspace e profiles do sistema';
COMMENT ON COLUMN workspace_user_mapping.sync_hash IS 'Hash MD5 dos dados para detectar mudanças sem comparar campo por campo';

-- ============================================
-- PARTE 4: FUNÇÃO PARA CALCULAR HASH DE SYNC
-- ============================================

CREATE OR REPLACE FUNCTION calculate_sync_hash(
  p_name TEXT,
  p_email TEXT,
  p_cargo TEXT,
  p_department TEXT,
  p_is_active BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN md5(
    COALESCE(p_name, '') || '|' ||
    COALESCE(p_email, '') || '|' ||
    COALESCE(p_cargo, '') || '|' ||
    COALESCE(p_department, '') || '|' ||
    COALESCE(p_is_active::TEXT, 'true')
  );
END;
$$;

COMMENT ON FUNCTION calculate_sync_hash IS 'Calcula hash dos dados do usuário para detectar mudanças';

-- ============================================
-- PARTE 5: RPC PARA UPSERT DE USUÁRIO (SYNC)
-- ============================================

CREATE OR REPLACE FUNCTION workspace_sync_user(
  p_google_id TEXT,
  p_email TEXT,
  p_name TEXT,
  p_cargo TEXT,
  p_department TEXT,
  p_role TEXT,
  p_role_source TEXT,
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
  v_existing_role TEXT;
  v_existing_role_source TEXT;
  v_final_role TEXT;
BEGIN
  -- Verificar se usuário já existe (por email ou google_id)
  SELECT id, role, role_source INTO v_profile_id, v_existing_role, v_existing_role_source
  FROM profiles
  WHERE email = p_email OR google_id = p_google_id
  LIMIT 1;
  
  -- Determinar role final
  IF v_profile_id IS NOT NULL THEN
    -- Usuário existe: preservar role se foi editado manualmente
    IF v_existing_role_source = 'manual' THEN
      v_final_role := v_existing_role; -- Preserva role editado manualmente
    ELSE
      v_final_role := p_role; -- Usa role inferido do Google
    END IF;
  ELSE
    -- Usuário novo: usar role inferido do Google
    v_final_role := p_role;
  END IF;
  
  -- Se usuário já existe, atualizar
  IF v_profile_id IS NOT NULL THEN
    UPDATE profiles SET
      name = p_name,
      cargo = p_cargo,
      department = p_department,
      role = v_final_role,
      role_source = COALESCE(v_existing_role_source, p_role_source),
      is_active = p_is_active,
      google_id = p_google_id,
      last_synced_at = NOW()
    WHERE id = v_profile_id;
    
    -- Atualizar mapeamento
    INSERT INTO workspace_user_mapping (google_id, profile_id, google_email, google_data, last_synced_at)
    VALUES (p_google_id, v_profile_id, p_email, p_google_data, NOW())
    ON CONFLICT (google_id) DO UPDATE SET
      last_synced_at = NOW(),
      google_data = p_google_data;
    
    RETURN v_profile_id;
  END IF;
  
  -- Se não existe, criar novo (v_final_role já foi definido acima)
  INSERT INTO profiles (email, name, cargo, department, role, role_source, is_active, google_id, last_synced_at)
  VALUES (p_email, p_name, p_cargo, p_department, v_final_role, p_role_source, p_is_active, p_google_id, NOW())
  RETURNING id INTO v_profile_id;
  
  -- Criar mapeamento
  INSERT INTO workspace_user_mapping (google_id, profile_id, google_email, google_data, last_synced_at)
  VALUES (p_google_id, v_profile_id, p_email, p_google_data, NOW());
  
  RETURN v_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION workspace_sync_user TO authenticated, service_role;

COMMENT ON FUNCTION workspace_sync_user IS 'Importa/atualiza usuário do Google Workspace (preserva role se foi editado manualmente)';

-- ============================================
-- PARTE 6: VERIFICAÇÃO FINAL
-- ============================================

-- Ver estrutura de profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('google_id', 'role_source', 'last_synced_at')
ORDER BY column_name;

-- Ver tabelas criadas
SELECT 
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('workspace_sync_log', 'workspace_user_mapping')
ORDER BY tablename;

-- Resumo
SELECT 
  'Banco preparado para Workspace Sync!' as "Status",
  (SELECT COUNT(*) FROM profiles WHERE google_id IS NOT NULL) as "Usuários já linkados",
  (SELECT COUNT(*) FROM workspace_sync_log) as "Sincronizações realizadas";

-- ============================================
-- FIM
-- ============================================

/*
✅ RESUMO DO QUE FOI CRIADO:

CAMPOS EM PROFILES:
  - google_id (TEXT UNIQUE) → ID do Google
  - role_source ('google' | 'manual') → Origem do role
  - last_synced_at (TIMESTAMPTZ) → Última sync

TABELAS:
  - workspace_sync_log → Log de sincronizações
  - workspace_user_mapping → Mapeamento Google ↔ GGV

FUNÇÕES:
  - calculate_sync_hash() → Detectar mudanças
  - workspace_sync_user() → Importar/atualizar usuário

ÍNDICES:
  - Performance otimizada para consultas

PRÓXIMO PASSO:
Criar Edge Function para buscar usuários do Google Workspace!
*/

