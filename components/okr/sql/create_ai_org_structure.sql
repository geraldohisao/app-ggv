-- ============================================
-- ORGANOGRAMA INTELIGENTE COM IA
-- Fase 1: Tabelas e RPCs de Validação
-- ============================================

-- 📊 TABELA 1: org_suggestions (Sugestões da IA)
-- ============================================

CREATE TABLE IF NOT EXISTS org_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de sugestão
  type TEXT NOT NULL CHECK (type IN (
    'add_reporting_line',     -- Adicionar relação de subordinação
    'remove_reporting_line',  -- Remover relação
    'change_cargo',           -- Alterar cargo do usuário
    'change_department',      -- Alterar departamento
    'promote_user',           -- Promover usuário
    'create_position',        -- Criar novo cargo/posição
    'restructure_dept'        -- Reestruturar departamento
  )),
  
  -- Dados da sugestão
  affected_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  current_state JSONB NOT NULL DEFAULT '{}'::JSONB,
  proposed_state JSONB NOT NULL,
  
  -- Justificativa da IA
  reason TEXT NOT NULL,
  confidence_score FLOAT NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high')),
  
  -- Aprovação
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_ai_version TEXT DEFAULT 'gemini-2.0-flash-exp',
  analysis_context JSONB,  -- Contexto da análise que gerou a sugestão
  
  -- Expiração (sugestões antigas perdem validade)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_org_suggestions_status ON org_suggestions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_org_suggestions_user ON org_suggestions(affected_user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_org_suggestions_created ON org_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_suggestions_expires ON org_suggestions(expires_at) WHERE status = 'pending';

COMMENT ON TABLE org_suggestions IS 'Sugestões de IA para melhoria da estrutura organizacional';

-- ============================================
-- 📊 TABELA 2: reporting_lines (Linhas de Reporte)
-- ============================================

CREATE TABLE IF NOT EXISTS reporting_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relação de subordinação
  subordinate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Tipo de relação
  relationship_type TEXT DEFAULT 'direct' CHECK (relationship_type IN (
    'direct',      -- Reporta diretamente (linha sólida)
    'dotted',      -- Reporta indiretamente (linha pontilhada)
    'functional',  -- Reporta funcionalmente (ex: projetos)
    'matrix'       -- Estrutura matricial
  )),
  
  -- Validação e controle
  is_primary BOOLEAN DEFAULT TRUE,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  notes TEXT,
  
  -- Constraints de validação
  CONSTRAINT reporting_no_self_report CHECK (subordinate_id != manager_id),
  CONSTRAINT reporting_valid_dates CHECK (
    effective_until IS NULL OR effective_until > effective_from
  ),
  CONSTRAINT reporting_unique_primary UNIQUE(subordinate_id, relationship_type, effective_until)
    DEFERRABLE INITIALLY DEFERRED
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reporting_subordinate ON reporting_lines(subordinate_id) 
  WHERE effective_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_reporting_manager ON reporting_lines(manager_id) 
  WHERE effective_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_reporting_active ON reporting_lines(effective_until) 
  WHERE effective_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_reporting_primary ON reporting_lines(subordinate_id, is_primary) 
  WHERE is_primary = TRUE AND effective_until IS NULL;

COMMENT ON TABLE reporting_lines IS 'Linhas de reporte hierárquico entre colaboradores';

-- ============================================
-- 📊 TABELA 3: org_change_log (Auditoria de Mudanças)
-- ============================================

CREATE TABLE IF NOT EXISTS org_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de mudança
  change_type TEXT NOT NULL,
  affected_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  affected_user_email TEXT,  -- Preservar email mesmo se user deletado
  
  -- Estados antes e depois
  before_state JSONB,
  after_state JSONB,
  
  -- Razão e contexto
  reason TEXT,
  applied_from_suggestion_id UUID REFERENCES org_suggestions(id) ON DELETE SET NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Rollback
  rollback_of_change_id UUID REFERENCES org_change_log(id),
  is_rolled_back BOOLEAN DEFAULT FALSE
);

-- Índices para performance e auditoria
CREATE INDEX IF NOT EXISTS idx_org_log_user ON org_change_log(affected_user_id);
CREATE INDEX IF NOT EXISTS idx_org_log_date ON org_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_log_suggestion ON org_change_log(applied_from_suggestion_id);
CREATE INDEX IF NOT EXISTS idx_org_log_ai ON org_change_log(is_ai_generated) WHERE is_ai_generated = TRUE;

COMMENT ON TABLE org_change_log IS 'Log de auditoria de todas as mudanças na estrutura organizacional';

-- ============================================
-- 🔐 RLS (Row Level Security)
-- ============================================

-- org_suggestions: Apenas ADMINs podem visualizar e aprovar
ALTER TABLE org_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ADMINs e SUPER_ADMINs podem visualizar sugestões"
  ON org_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

CREATE POLICY "ADMINs e SUPER_ADMINs podem aprovar/rejeitar sugestões"
  ON org_suggestions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- reporting_lines: Leitura pública, escrita apenas para ADMINs
ALTER TABLE reporting_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar linhas de reporte"
  ON reporting_lines FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Apenas ADMINs podem criar linhas de reporte"
  ON reporting_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- org_change_log: Somente leitura para auditoria
ALTER TABLE org_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ADMINs podem visualizar log de mudanças"
  ON org_change_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ============================================
-- ⚙️ RPC 1: validate_org_structure
-- Valida toda a estrutura organizacional
-- ============================================

CREATE OR REPLACE FUNCTION validate_org_structure()
RETURNS TABLE (
  rule_id TEXT,
  severity TEXT,
  rule_name TEXT,
  message TEXT,
  affected_count INT,
  affected_users JSONB,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ===========================================
  -- REGRA R001: C-Level não deve ter superior
  -- ===========================================
  RETURN QUERY
  WITH clevel_with_manager AS (
    SELECT 
      p.id,
      p.name,
      p.cargo,
      c.level,
      rl.manager_id,
      (SELECT name FROM profiles WHERE id = rl.manager_id) as manager_name
    FROM profiles p
    INNER JOIN cargos c ON p.cargo = c.name
    LEFT JOIN reporting_lines rl ON p.id = rl.subordinate_id 
      AND rl.is_primary = TRUE 
      AND rl.effective_until IS NULL
    WHERE c.level = 1  -- C-Level
      AND p.is_active = TRUE
      AND rl.manager_id IS NOT NULL
  )
  SELECT 
    'R001'::TEXT,
    'error'::TEXT,
    'C-Level com superior hierárquico'::TEXT,
    'Colaboradores de nível C (CEO, COO) não devem reportar para ninguém'::TEXT,
    COUNT(*)::INT,
    jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'cargo', cargo,
      'manager_name', manager_name
    )),
    'Remover linha de reporte ou corrigir cargo'::TEXT
  FROM clevel_with_manager
  WHERE (SELECT COUNT(*) FROM clevel_with_manager) > 0
  GROUP BY 1,2,3,4,7;

  -- ===========================================
  -- REGRA R002: Hierarquia invertida
  -- ===========================================
  RETURN QUERY
  WITH invalid_hierarchy AS (
    SELECT 
      p_sub.id as subordinate_id,
      p_sub.name as subordinate_name,
      p_sub.cargo as subordinate_cargo,
      c_sub.level as subordinate_level,
      p_mgr.id as manager_id,
      p_mgr.name as manager_name,
      p_mgr.cargo as manager_cargo,
      c_mgr.level as manager_level
    FROM reporting_lines rl
    INNER JOIN profiles p_sub ON rl.subordinate_id = p_sub.id
    INNER JOIN profiles p_mgr ON rl.manager_id = p_mgr.id
    INNER JOIN cargos c_sub ON p_sub.cargo = c_sub.name
    INNER JOIN cargos c_mgr ON p_mgr.cargo = c_mgr.name
    WHERE rl.effective_until IS NULL
      AND rl.is_primary = TRUE
      AND c_sub.level <= c_mgr.level  -- Subordinado com nível <= gestor
      AND p_sub.is_active = TRUE
      AND p_mgr.is_active = TRUE
  )
  SELECT 
    'R002'::TEXT,
    'error'::TEXT,
    'Hierarquia invertida'::TEXT,
    'Subordinado não pode ter nível igual ou superior ao gestor'::TEXT,
    COUNT(*)::INT,
    jsonb_agg(jsonb_build_object(
      'subordinate', subordinate_name || ' (' || subordinate_cargo || ' - Nível ' || subordinate_level || ')',
      'manager', manager_name || ' (' || manager_cargo || ' - Nível ' || manager_level || ')'
    )),
    'Corrigir cargos ou linhas de reporte'::TEXT
  FROM invalid_hierarchy
  WHERE (SELECT COUNT(*) FROM invalid_hierarchy) > 0
  GROUP BY 1,2,3,4,7;

  -- ===========================================
  -- REGRA R003: Usuários sem linha de reporte
  -- ===========================================
  RETURN QUERY
  WITH users_without_manager AS (
    SELECT 
      p.id,
      p.name,
      p.cargo,
      p.department,
      c.level
    FROM profiles p
    INNER JOIN cargos c ON p.cargo = c.name
    LEFT JOIN reporting_lines rl ON p.id = rl.subordinate_id 
      AND rl.is_primary = TRUE 
      AND rl.effective_until IS NULL
    WHERE p.is_active = TRUE
      AND c.level > 1  -- Não C-Level
      AND rl.id IS NULL
  )
  SELECT 
    'R003'::TEXT,
    'warning'::TEXT,
    'Colaboradores sem gestor definido'::TEXT,
    'Colaboradores devem ter linha de reporte definida'::TEXT,
    COUNT(*)::INT,
    jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'cargo', cargo,
      'department', department
    )),
    'Definir gestor adequado para cada colaborador'::TEXT
  FROM users_without_manager
  WHERE (SELECT COUNT(*) FROM users_without_manager) > 0
  GROUP BY 1,2,3,4,7;

  -- ===========================================
  -- REGRA R004: Departamentos grandes sem líder
  -- ===========================================
  RETURN QUERY
  WITH large_depts_no_leader AS (
    SELECT 
      p.department,
      COUNT(*) as user_count,
      jsonb_agg(p.name) as users
    FROM profiles p
    WHERE p.is_active = TRUE
      AND p.department IS NOT NULL
    GROUP BY p.department
    HAVING COUNT(*) >= 8
      AND NOT EXISTS (
        SELECT 1 
        FROM profiles p2
        INNER JOIN cargos c ON p2.cargo = c.name
        WHERE p2.department = p.department
          AND p2.is_active = TRUE
          AND c.level <= 3  -- Head ou superior
      )
  )
  SELECT 
    'R004'::TEXT,
    'warning'::TEXT,
    'Departamentos grandes sem liderança'::TEXT,
    'Departamentos com 8+ pessoas devem ter Head ou Gerente'::TEXT,
    COUNT(*)::INT,
    jsonb_agg(jsonb_build_object(
      'department', department,
      'user_count', user_count
    )),
    'Promover ou contratar liderança para departamentos grandes'::TEXT
  FROM large_depts_no_leader
  WHERE (SELECT COUNT(*) FROM large_depts_no_leader) > 0
  GROUP BY 1,2,3,4,7;

  -- Se não houver problemas, retornar mensagem de sucesso
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'OK'::TEXT,
      'info'::TEXT,
      'Estrutura validada'::TEXT,
      'Nenhum problema encontrado na estrutura organizacional'::TEXT,
      0::INT,
      '[]'::JSONB,
      'Continue monitorando regularmente'::TEXT;
  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION validate_org_structure() TO authenticated;

COMMENT ON FUNCTION validate_org_structure IS 'Valida a estrutura organizacional e retorna lista de problemas encontrados';

-- ============================================
-- ⚙️ RPC 2: suggest_reporting_lines
-- Sugere linhas de reporte automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION suggest_reporting_lines()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_cargo TEXT,
  user_department TEXT,
  suggested_manager_id UUID,
  suggested_manager_name TEXT,
  suggested_manager_cargo TEXT,
  reason TEXT,
  confidence FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH users_need_manager AS (
    -- Usuários ativos sem gestor definido (exceto C-Level)
    SELECT 
      p.id,
      p.name,
      p.cargo,
      p.department,
      c.level as user_level
    FROM profiles p
    INNER JOIN cargos c ON p.cargo = c.name
    LEFT JOIN reporting_lines rl ON p.id = rl.subordinate_id 
      AND rl.is_primary = TRUE 
      AND rl.effective_until IS NULL
    WHERE p.is_active = TRUE
      AND c.level > 1  -- Não C-Level
      AND rl.id IS NULL
  ),
  potential_managers AS (
    -- Encontrar gestor mais adequado para cada usuário
    SELECT 
      u.id as user_id,
      u.name as user_name,
      u.cargo as user_cargo,
      u.department as user_department,
      u.user_level,
      -- Buscar líder no mesmo departamento com nível inferior
      (
        SELECT p2.id
        FROM profiles p2
        INNER JOIN cargos c2 ON p2.cargo = c2.name
        WHERE p2.department = u.department
          AND c2.level < u.user_level
          AND p2.is_active = TRUE
        ORDER BY c2.level DESC  -- Pegar o nível mais próximo
        LIMIT 1
      ) as same_dept_manager,
      -- Se não houver no dept, buscar C-Level responsável
      (
        SELECT p3.id
        FROM profiles p3
        INNER JOIN cargos c3 ON p3.cargo = c3.name
        WHERE c3.level = 1  -- C-Level
          AND p3.is_active = TRUE
          -- CEO para comercial/marketing, COO para projetos
          AND (
            (u.department IN ('comercial', 'marketing', 'financeiro') AND p3.cargo LIKE '%CEO%')
            OR (u.department IN ('projetos', 'inovação') AND p3.cargo LIKE '%COO%')
            OR (p3.cargo LIKE '%CEO%')  -- Fallback para CEO
          )
        LIMIT 1
      ) as clevel_fallback
    FROM users_need_manager u
  )
  SELECT 
    pm.user_id,
    pm.user_name,
    pm.user_cargo,
    pm.user_department,
    COALESCE(pm.same_dept_manager, pm.clevel_fallback) as suggested_manager_id,
    (SELECT name FROM profiles WHERE id = COALESCE(pm.same_dept_manager, pm.clevel_fallback)) as suggested_manager_name,
    (SELECT cargo FROM profiles WHERE id = COALESCE(pm.same_dept_manager, pm.clevel_fallback)) as suggested_manager_cargo,
    CASE 
      WHEN pm.same_dept_manager IS NOT NULL 
      THEN 'Gestor do mesmo departamento com nível hierárquico imediatamente superior'
      WHEN pm.clevel_fallback IS NOT NULL
      THEN 'Reporta diretamente ao C-Level (não há líder intermediário no departamento)'
      ELSE 'Nenhuma sugestão disponível'
    END as reason,
    CASE 
      WHEN pm.same_dept_manager IS NOT NULL THEN 0.90
      WHEN pm.clevel_fallback IS NOT NULL THEN 0.60
      ELSE 0.0
    END as confidence
  FROM potential_managers pm
  WHERE COALESCE(pm.same_dept_manager, pm.clevel_fallback) IS NOT NULL;

END;
$$;

GRANT EXECUTE ON FUNCTION suggest_reporting_lines() TO authenticated;

COMMENT ON FUNCTION suggest_reporting_lines IS 'Sugere linhas de reporte automaticamente baseadas em heurísticas organizacionais';

-- ============================================
-- ⚙️ RPC 3: batch_update_hierarchy
-- Aplica múltiplas mudanças organizacionais
-- ============================================

CREATE OR REPLACE FUNCTION batch_update_hierarchy(
  changes JSONB,
  auto_approve BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  success BOOLEAN,
  changes_applied INT,
  changes_failed INT,
  errors JSONB,
  summary TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change JSONB;
  applied_count INT := 0;
  failed_count INT := 0;
  error_list JSONB := '[]'::JSONB;
  current_user_role TEXT;
BEGIN
  -- Verificar permissão (apenas ADMINs)
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
    RETURN QUERY SELECT FALSE, 0, 0, 
      jsonb_build_array(jsonb_build_object('error', 'Permissão negada')),
      'Apenas ADMINs podem aplicar mudanças';
    RETURN;
  END IF;

  -- Iterar sobre cada mudança no array
  FOR change IN SELECT * FROM jsonb_array_elements(changes)
  LOOP
    BEGIN
      CASE change->>'type'
        
        -- =============================================
        -- TIPO: add_reporting_line
        -- =============================================
        WHEN 'add_reporting_line' THEN
          -- Validar que não existe linha ativa
          IF NOT EXISTS (
            SELECT 1 FROM reporting_lines
            WHERE subordinate_id = (change->>'subordinate_id')::UUID
              AND manager_id = (change->>'manager_id')::UUID
              AND is_primary = TRUE
              AND effective_until IS NULL
          ) THEN
            INSERT INTO reporting_lines (
              subordinate_id, 
              manager_id, 
              relationship_type,
              is_primary,
              created_by,
              notes
            )
            VALUES (
              (change->>'subordinate_id')::UUID,
              (change->>'manager_id')::UUID,
              COALESCE(change->>'relationship_type', 'direct'),
              COALESCE((change->>'is_primary')::BOOLEAN, TRUE),
              auth.uid(),
              change->>'reason'
            );
            
            applied_count := applied_count + 1;
          ELSE
            failed_count := failed_count + 1;
            error_list := error_list || jsonb_build_object(
              'change', change,
              'error', 'Linha de reporte já existe'
            );
          END IF;

        -- =============================================
        -- TIPO: change_cargo
        -- =============================================
        WHEN 'change_cargo' THEN
          UPDATE profiles 
          SET 
            cargo = change->>'new_cargo',
            updated_at = NOW()
          WHERE id = (change->>'user_id')::UUID;
          
          applied_count := applied_count + 1;

        -- =============================================
        -- TIPO: change_department
        -- =============================================
        WHEN 'change_department' THEN
          UPDATE profiles 
          SET 
            department = change->>'new_department',
            updated_at = NOW()
          WHERE id = (change->>'user_id')::UUID;
          
          applied_count := applied_count + 1;

        -- =============================================
        -- TIPO: remove_reporting_line
        -- =============================================
        WHEN 'remove_reporting_line' THEN
          UPDATE reporting_lines
          SET effective_until = CURRENT_DATE
          WHERE subordinate_id = (change->>'subordinate_id')::UUID
            AND manager_id = (change->>'manager_id')::UUID
            AND effective_until IS NULL;
          
          applied_count := applied_count + 1;

        ELSE
          failed_count := failed_count + 1;
          error_list := error_list || jsonb_build_object(
            'change', change,
            'error', 'Tipo de mudança desconhecido: ' || (change->>'type')
          );
      END CASE;
      
      -- Log da mudança aplicada
      INSERT INTO org_change_log (
        change_type, 
        affected_user_id, 
        after_state, 
        created_by,
        is_ai_generated,
        reason
      )
      VALUES (
        change->>'type',
        (change->>'user_id')::UUID,
        change,
        auth.uid(),
        COALESCE((change->>'is_ai_generated')::BOOLEAN, FALSE),
        change->>'reason'
      );
      
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
      error_list := error_list || jsonb_build_object(
        'change', change,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Retornar resumo
  RETURN QUERY SELECT 
    TRUE,
    applied_count,
    failed_count,
    error_list,
    format('Aplicadas %s mudanças com sucesso, %s falharam', applied_count, failed_count);
END;
$$;

GRANT EXECUTE ON FUNCTION batch_update_hierarchy(JSONB, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION batch_update_hierarchy IS 'Aplica múltiplas mudanças organizacionais em lote com validação e auditoria';

-- ============================================
-- 🎯 VIEWS ÚTEIS
-- ============================================

-- View: Estrutura organizacional completa
CREATE OR REPLACE VIEW v_org_structure AS
SELECT 
  p.id,
  p.name,
  p.email,
  p.cargo,
  c.level as cargo_level,
  p.department,
  p.role,
  p.is_active,
  rl.manager_id,
  (SELECT name FROM profiles WHERE id = rl.manager_id) as manager_name,
  (SELECT cargo FROM profiles WHERE id = rl.manager_id) as manager_cargo,
  rl.relationship_type
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
LEFT JOIN reporting_lines rl ON p.id = rl.subordinate_id 
  AND rl.is_primary = TRUE 
  AND rl.effective_until IS NULL
WHERE p.is_active = TRUE
ORDER BY c.level, p.department, p.name;

COMMENT ON VIEW v_org_structure IS 'Visão consolidada da estrutura organizacional com linhas de reporte';

-- ============================================
-- ✅ FINALIZAÇÃO
-- ============================================

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Tabelas e RPCs do Organograma Inteligente criados com sucesso!';
  RAISE NOTICE '📊 Tabelas: org_suggestions, reporting_lines, org_change_log';
  RAISE NOTICE '⚙️  RPCs: validate_org_structure(), suggest_reporting_lines(), batch_update_hierarchy()';
  RAISE NOTICE '👁️  Views: v_org_structure';
END $$;

