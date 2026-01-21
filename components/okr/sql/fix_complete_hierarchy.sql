-- ============================================
-- HIERARQUIA COMPLETA CORRIGIDA
-- Incluindo Inteligência de Mercado
-- ============================================

-- Este SQL consolida TODAS as correções de hierarquia
-- incluindo os ajustes para Inteligência de Mercado

-- ============================================
-- NÍVEIS HIERÁRQUICOS (1-7)
-- ============================================

-- Nível 1: C-Level
UPDATE cargos SET level = 1 WHERE name IN ('CEO', 'COO', 'Sócio');

-- Nível 2: Diretoria
UPDATE cargos SET level = 2 WHERE name = 'Diretor';

-- Nível 3: Heads
UPDATE cargos SET level = 3 WHERE name IN (
    'Head Comercial', 
    'Head Marketing', 
    'Head Projetos', 
    'Head Financeiro'
);

-- Nível 4: Gerentes
UPDATE cargos SET level = 4, description = 'Gerente de projetos e operações'
WHERE name = 'Gerente de Projetos';

UPDATE cargos SET level = 4 WHERE name = 'Gerente';

-- Nível 5: Coordenadores + Analistas Sênior
UPDATE cargos SET level = 5 WHERE name IN (
    'Coordenador',
    'Coordenador Comercial',
    'Coordenador de Projetos'
);

UPDATE cargos SET level = 5, description = 'Analista de marketing (gerencia campanhas e equipe júnior)'
WHERE name = 'Analista de Marketing';

UPDATE cargos SET level = 5, description = 'Analista de pesquisa e inteligência de mercado (gerencia assistente)'
WHERE name = 'Analista de Inteligência de Mercado';

-- Nível 6: Operacional / Júnior
UPDATE cargos SET level = 6 WHERE name IN (
    'SDR',
    'Closer',
    'Analista',
    'Trainee',
    'Consultor',
    'Consultor Comercial',
    'Desenvolvedor'
);

UPDATE cargos SET level = 6, description = 'Assistente de inteligência de mercado (reporta ao analista)'
WHERE name = 'Assistente de Inteligência de Mercado';

-- Nível 7: Estagiários
UPDATE cargos SET level = 7, description = 'Estagiário em treinamento'
WHERE name = 'Estagiário';

-- ============================================
-- AJUSTES DE DEPARTAMENTO
-- ============================================

-- Inteligência de Mercado fica em Projetos
UPDATE profiles 
SET department = 'projetos'
WHERE cargo IN ('Analista de Inteligência de Mercado', 'Assistente de Inteligência de Mercado');

-- ============================================
-- LINHAS DE REPORTE (INTELIGÊNCIA DE MERCADO)
-- ============================================

-- Katiuscia (Analista IM) → César (Gerente de Projetos)
INSERT INTO reporting_lines (subordinate_id, manager_id, relationship_type, is_primary, notes)
SELECT 
    p_sub.id,
    p_mgr.id,
    'direct',
    TRUE,
    'Analista de Inteligência de Mercado reporta ao Gerente de Projetos'
FROM 
    (SELECT id FROM profiles WHERE cargo = 'Analista de Inteligência de Mercado' AND is_active = TRUE LIMIT 1) p_sub,
    (SELECT id FROM profiles WHERE cargo = 'Gerente de Projetos' AND name LIKE '%César%' AND is_active = TRUE LIMIT 1) p_mgr
WHERE NOT EXISTS (
    SELECT 1 FROM reporting_lines 
    WHERE subordinate_id = p_sub.id
    AND effective_until IS NULL
);

-- Natália (Assistente IM) → Katiuscia (Analista IM)
INSERT INTO reporting_lines (subordinate_id, manager_id, relationship_type, is_primary, notes)
SELECT 
    p_sub.id,
    p_mgr.id,
    'direct',
    TRUE,
    'Assistente de IM reporta ao Analista de IM'
FROM 
    (SELECT id FROM profiles WHERE cargo = 'Assistente de Inteligência de Mercado' AND is_active = TRUE LIMIT 1) p_sub,
    (SELECT id FROM profiles WHERE cargo = 'Analista de Inteligência de Mercado' AND is_active = TRUE LIMIT 1) p_mgr
WHERE NOT EXISTS (
    SELECT 1 FROM reporting_lines 
    WHERE subordinate_id = p_sub.id
    AND effective_until IS NULL
);

-- ============================================
-- VALIDAÇÃO COMPLETA
-- ============================================

-- Ver todos os cargos por nível
SELECT 
    level,
    name,
    description
FROM cargos
WHERE is_active = TRUE
ORDER BY level, name;

-- Ver estrutura de Projetos (incluindo IM)
SELECT 
    c.level as nivel,
    p.name as colaborador,
    p.cargo,
    (SELECT name FROM profiles WHERE id = rl.manager_id) as reporta_para
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
LEFT JOIN reporting_lines rl ON p.id = rl.subordinate_id 
    AND rl.effective_until IS NULL 
    AND rl.is_primary = TRUE
WHERE p.department = 'projetos'
    AND p.is_active = TRUE
ORDER BY c.level, p.name;

-- ============================================
-- RESUMO VISUAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅  HIERARQUIA COMPLETA ATUALIZADA!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTRUTURA NO ORGANOGRAMA:';
  RAISE NOTICE '';
  RAISE NOTICE '┌─ PROJETOS ────────────────────────────────┐';
  RAISE NOTICE '│                                            │';
  RAISE NOTICE '│  César (Gerente de Projetos - Nível 4)    │';
  RAISE NOTICE '│    │                                        │';
  RAISE NOTICE '│    ├─ Coordenadores (Nível 5)              │';
  RAISE NOTICE '│    │   ├─ Marcelo, Pedro                   │';
  RAISE NOTICE '│    │                                        │';
  RAISE NOTICE '│    ├─ Consultores (Nível 6) ───┐           │';
  RAISE NOTICE '│    │   ├─ Consultor 1          │           │';
  RAISE NOTICE '│    │   ├─ Consultor 2          │ Árvore 1  │';
  RAISE NOTICE '│    │   └─ Consultor N          │           │';
  RAISE NOTICE '│    │                            │           │';
  RAISE NOTICE '│    └─ Inteligência de Mercado ─┘           │';
  RAISE NOTICE '│        ├─ Katiuscia (Analista IM - Nível 5)│';
  RAISE NOTICE '│        │   GERENCIA ↓           │ Árvore 2  │';
  RAISE NOTICE '│        └─ Natália (Assistente IM - Nível 6)│';
  RAISE NOTICE '│                                             │';
  RAISE NOTICE '└─────────────────────────────────────────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NÍVEIS FINAIS:';
  RAISE NOTICE '  Nível 1: CEO, COO, Sócio';
  RAISE NOTICE '  Nível 2: Diretor';
  RAISE NOTICE '  Nível 3: Heads';
  RAISE NOTICE '  Nível 4: Gerentes';
  RAISE NOTICE '  Nível 5: Coordenadores + Analista de Marketing + Analista de IM ⭐';
  RAISE NOTICE '  Nível 6: SDR, Closer, Trainee, Consultores, Assistente de IM';
  RAISE NOTICE '  Nível 7: Estagiário';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMO PASSO:';
  RAISE NOTICE '   Recarregue o organograma e veja a nova estrutura!';
  RAISE NOTICE '';
END $$;

