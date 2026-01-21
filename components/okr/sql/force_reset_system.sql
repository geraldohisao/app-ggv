-- ============================================
-- 🚨 RESET FORÇADO DO SISTEMA
-- Garante que TODOS os usuários tenham cargos válidos
-- ============================================

-- ESTRATÉGIA:
-- 1. Criar TODOS os cargos que aparecem no Google Workspace
-- 2. Resetar usuários problemáticos para cargo genérico "Consultor"
-- 3. Sistema volta a funcionar
-- 4. Depois reimportamos do Google Workspace com mapeamento correto

-- ============================================
-- PASSO 1: Criar TODOS os cargos do Google Workspace
-- ============================================

INSERT INTO cargos (name, description, level) VALUES
  -- C-Level (Nível 1)
  ('CEO', 'Chief Executive Officer', 1),
  ('COO', 'Chief Operating Officer', 1),
  ('Sócio', 'Sócio da empresa', 1),
  
  -- Diretoria (Nível 2)
  ('Diretor', 'Diretor executivo', 2),
  
  -- Heads (Nível 3)
  ('Head Comercial', 'Head do departamento comercial', 3),
  ('Head Marketing', 'Head do departamento de marketing', 3),
  ('Head Projetos', 'Head do departamento de projetos', 3),
  ('Head Financeiro', 'Head do departamento financeiro', 3),
  ('Head de Financeiro', 'Head do departamento financeiro', 3),
  
  -- Gerentes (Nível 4)
  ('Gerente', 'Gerente de área', 4),
  ('Gerente de Projetos', 'Gerente de projetos e operações', 4),
  
  -- Coordenadores / Analistas Sênior (Nível 5)
  ('Coordenador', 'Coordenador de equipe', 5),
  ('Coordenador Comercial', 'Coordenador do time comercial', 5),
  ('Coordenador de Projetos', 'Coordenador de projetos', 5),
  ('Analista de Marketing', 'Analista de marketing (gerencia equipe júnior)', 5),
  ('Analista de Inteligência de Mercado', 'Analista de pesquisa e inteligência de mercado (gerencia assistente)', 5),
  
  -- Operacional / Júnior (Nível 6)
  ('SDR', 'Sales Development Representative', 6),
  ('Closer', 'Closer de vendas', 6),
  ('Analista', 'Analista operacional', 6),
  ('Trainee', 'Trainee em desenvolvimento', 6),
  ('Treinee', 'Trainee em desenvolvimento', 6),  -- Typo comum
  ('Consultor', 'Consultor de projetos', 6),
  ('Consultor Comercial', 'Consultor/vendedor externo', 6),
  ('Desenvolvedor', 'Desenvolvedor de software', 6),
  ('Assistente de Inteligência de Mercado', 'Assistente de inteligência de mercado', 6),
  
  -- Estagiários (Nível 7)
  ('Estagiário', 'Estagiário em treinamento', 7),
  ('Estágio', 'Estagiário em treinamento', 7)
ON CONFLICT (name) DO UPDATE SET
  level = EXCLUDED.level,
  description = EXCLUDED.description;

-- ============================================
-- PASSO 2: RESET FORÇADO - Garantir que todos têm cargo válido
-- ============================================

-- Ver quem ainda tem cargo inválido
SELECT 
  p.id,
  p.name,
  p.email,
  p.cargo as cargo_atual,
  p.department
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
WHERE p.is_active = TRUE
  AND (p.cargo IS NULL OR c.name IS NULL);

-- Se houver algum, resetar para "Consultor" temporariamente
UPDATE profiles
SET cargo = 'Consultor'
WHERE id IN (
  SELECT p.id
  FROM profiles p
  LEFT JOIN cargos c ON p.cargo = c.name
  WHERE p.is_active = TRUE
    AND (p.cargo IS NULL OR c.name IS NULL)
);

-- ============================================
-- PASSO 3: Atualizar Katiuscia e Natália (por email)
-- ============================================

UPDATE profiles 
SET 
    cargo = 'Analista de Inteligência de Mercado',
    department = 'projetos',
    updated_at = NOW()
WHERE email = 'katiuscia@grupoggv.com'
    AND is_active = TRUE;

UPDATE profiles 
SET 
    cargo = 'Assistente de Inteligência de Mercado',
    department = 'projetos',
    updated_at = NOW()
WHERE email = 'natalia@grupoggv.com'
    AND is_active = TRUE;

-- ============================================
-- VALIDAÇÃO FINAL CRÍTICA
-- ============================================

-- ESTA QUERY DEVE RETORNAR 0 (ZERO)
-- Se retornar > 0, ainda há usuários com cargo inválido
SELECT 
    COUNT(*) as "❌ Usuários com Cargo Inválido (DEVE SER 0)"
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
WHERE p.is_active = TRUE
  AND p.cargo IS NOT NULL
  AND c.name IS NULL;

-- Ver todos os cargos criados
SELECT 
    level as "Nível",
    COUNT(*) as "Qtd Cargos",
    string_agg(name, ', ') as "Cargos"
FROM cargos
WHERE is_active = TRUE
GROUP BY level
ORDER BY level;

-- ============================================
-- RESULTADO
-- ============================================

DO $$
DECLARE
    invalid_count INT;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM profiles p
    LEFT JOIN cargos c ON p.cargo = c.name
    WHERE p.is_active = TRUE
      AND p.cargo IS NOT NULL
      AND c.name IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    
    IF invalid_count = 0 THEN
        RAISE NOTICE '✅✅✅ SISTEMA 100%% RESTAURADO! ✅✅✅';
        RAISE NOTICE '';
        RAISE NOTICE '🎯 Todos os usuários têm cargos válidos!';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 PRÓXIMO PASSO:';
        RAISE NOTICE '   1. Volte ao navegador';
        RAISE NOTICE '   2. Ctrl+Shift+R (hard refresh)';
        RAISE NOTICE '   3. Sistema deve funcionar normalmente!';
    ELSE
        RAISE NOTICE '⚠️⚠️⚠️ AINDA HÁ % USUÁRIOS COM CARGO INVÁLIDO', invalid_count;
        RAISE NOTICE '';
        RAISE NOTICE 'Execute esta query para ver quem são:';
        RAISE NOTICE 'SELECT name, cargo FROM profiles WHERE cargo NOT IN (SELECT name FROM cargos);';
    END IF;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
END $$;

