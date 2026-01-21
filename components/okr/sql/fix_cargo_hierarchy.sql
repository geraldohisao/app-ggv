-- ============================================
-- CORREÇÃO: HIERARQUIA DE CARGOS
-- Ajusta níveis hierárquicos baseados na estrutura real
-- ============================================

-- 📊 PROBLEMA IDENTIFICADO:
-- 1. Marketing: Estagiário (5), Trainee (5), Analista (5) - todos no mesmo nível
--    DEVERIA: Analista (5) > Trainee (6) > Estagiário (7)
--
-- 2. Projetos: Gerente de Projetos (4) = Coordenador de Projetos (4)
--    DEVERIA: Gerente (4) > Coordenador (5)
--
-- 3. Projetos: Consultores são COMERCIAIS (vendedores externos)
--    SOLUÇÃO: Mover para departamento Comercial OU criar cargo específico

-- ============================================
-- NOVA ESTRUTURA DE NÍVEIS (REFINADA)
-- ============================================

-- Nível 1: C-Level (CEO, COO, Sócios)
-- Nível 2: Diretoria
-- Nível 3: Heads de Departamento
-- Nível 4: Gerentes
-- Nível 5: Coordenadores / Analistas Sênior
-- Nível 6: Analistas / SDR / Closer / Trainee
-- Nível 7: Estagiários / Aprendizes

-- ============================================
-- ATUALIZAÇÃO DOS NÍVEIS
-- ============================================

-- ========== NÍVEL 4: GERENTES ==========
UPDATE cargos SET level = 4, description = 'Gerente de projetos e operações'
WHERE name = 'Gerente de Projetos';

-- ========== NÍVEL 5: COORDENADORES ==========
UPDATE cargos SET level = 5, description = 'Coordenador de equipe de projetos'
WHERE name = 'Coordenador de Projetos';

UPDATE cargos SET level = 5, description = 'Coordenador do time comercial'
WHERE name = 'Coordenador Comercial';

UPDATE cargos SET level = 5, description = 'Coordenador geral'
WHERE name = 'Coordenador';

-- ========== NÍVEL 5: ANALISTA DE MARKETING (POSIÇÃO SÊNIOR) ==========
-- Analista de Marketing gerencia estagiários/trainees
UPDATE cargos SET level = 5, description = 'Analista de marketing (gerencia campanhas e equipe júnior)'
WHERE name = 'Analista de Marketing';

-- ========== NÍVEL 6: OPERACIONAL / JÚNIOR ==========
UPDATE cargos SET level = 6, description = 'Sales Development Representative'
WHERE name = 'SDR';

UPDATE cargos SET level = 6, description = 'Closer de vendas'
WHERE name = 'Closer';

UPDATE cargos SET level = 6, description = 'Analista operacional'
WHERE name = 'Analista';

UPDATE cargos SET level = 6, description = 'Trainee em desenvolvimento'
WHERE name = 'Trainee';

-- ========== NÍVEL 7: ESTAGIÁRIOS ==========
UPDATE cargos SET level = 7, description = 'Estagiário em treinamento'
WHERE name = 'Estagiário';

-- ========== CONSULTORES: CASO ESPECIAL ==========
-- Consultores são vendedores externos (trabalham em projetos de clientes)
-- Opção 1: Manter em Projetos mas com nível adequado
UPDATE cargos SET level = 6, description = 'Consultor de projetos (vendedor externo / implementação)'
WHERE name = 'Consultor';

-- ============================================
-- ADICIONAR NOVOS CARGOS (SE NECESSÁRIO)
-- ============================================

-- Desenvolvedor (time de Inovação)
INSERT INTO cargos (name, description, level) VALUES
  ('Desenvolvedor', 'Desenvolvedor de software (time de inovação)', 6)
ON CONFLICT (name) DO UPDATE SET
  level = 6,
  description = EXCLUDED.description;

-- Sócio (C-Level)
INSERT INTO cargos (name, description, level) VALUES
  ('Sócio', 'Sócio da empresa', 1)
ON CONFLICT (name) DO UPDATE SET
  level = 1,
  description = EXCLUDED.description;

-- ============================================
-- CRIAR NOVO CARGO: CONSULTOR COMERCIAL
-- (Para diferenciar consultores de projetos de vendedores externos)
-- ============================================

INSERT INTO cargos (name, description, level) VALUES
  ('Consultor Comercial', 'Consultor/vendedor externo (atende clientes em campo)', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VERIFICAÇÃO: MOSTRAR NOVA HIERARQUIA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Hierarquia de Cargos Atualizada!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 NOVA ESTRUTURA:';
  RAISE NOTICE '';
  RAISE NOTICE 'Nível 1 (C-Level):';
  RAISE NOTICE '  - CEO, COO, Sócio';
  RAISE NOTICE '';
  RAISE NOTICE 'Nível 2 (Diretoria):';
  RAISE NOTICE '  - Diretor';
  RAISE NOTICE '';
  RAISE NOTICE 'Nível 3 (Heads):';
  RAISE NOTICE '  - Head Comercial, Head Marketing, Head Projetos, Head Financeiro';
  RAISE NOTICE '';
  RAISE NOTICE 'Nível 4 (Gerentes):';
  RAISE NOTICE '  - Gerente, Gerente de Projetos';
  RAISE NOTICE '';
  RAISE NOTICE 'Nível 5 (Coordenadores / Analistas Sênior):';
  RAISE NOTICE '  - Coordenador, Coordenador Comercial, Coordenador de Projetos';
  RAISE NOTICE '  - Analista de Marketing ⬅️ GERENCIA trainees/estagiários';
  RAISE NOTICE '';
  RAISE NOTICE 'Nível 6 (Operacional / Júnior):';
  RAISE NOTICE '  - SDR, Closer, Analista, Trainee';
  RAISE NOTICE '  - Consultor, Consultor Comercial, Desenvolvedor';
  RAISE NOTICE '';
  RAISE NOTICE 'Nível 7 (Estagiários):';
  RAISE NOTICE '  - Estagiário';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 PRÓXIMO PASSO:';
  RAISE NOTICE '   Execute: SELECT name, level FROM cargos ORDER BY level, name;';
END $$;

-- ============================================
-- QUERY PARA VALIDAR
-- ============================================

-- Ver hierarquia completa
SELECT 
  level,
  name,
  description
FROM cargos
WHERE is_active = TRUE
ORDER BY level, name;

-- ============================================
-- SUGESTÕES ADICIONAIS
-- ============================================

-- 💡 SUGESTÃO 1: Separar Consultores por Tipo
-- Se consultores fazem trabalhos diferentes, criar:
-- - "Consultor de Implementação" (trabalha em projetos)
-- - "Consultor Comercial" (vendedor externo)

-- 💡 SUGESTÃO 2: Criar departamento "Inteligência de Mercado"
-- Se o time de inteligência é separado de projetos:
-- INSERT INTO departments (name, description, color) VALUES
--   ('Inteligência de Mercado', 'Análise e inteligência de mercado', '#F59E0B')
-- ON CONFLICT (name) DO NOTHING;

-- 💡 SUGESTÃO 3: Atualizar usuários com cargos incorretos
-- Após ajustar níveis, revisar:
-- SELECT name, cargo, department FROM profiles WHERE cargo = 'Consultor';
-- E atualizar para departamento correto se necessário

COMMENT ON TABLE cargos IS 'Cargos com hierarquia refinada (níveis 1-7)';

