-- ============================================
-- CORREÇÃO: Inteligência de Mercado
-- Ajustar níveis e criar linhas de reporte
-- ============================================

-- 📊 ESTRUTURA CORRETA:
-- César (Gerente de Projetos - Nível 4)
--   ├─ Consultores (Nível 6)
--   └─ Analista de Inteligência de Mercado (Nível 5) ⭐ GERENCIA ↓
--       └─ Assistente de Inteligência de Mercado (Nível 6)

-- ============================================
-- PASSO 1: Corrigir Níveis dos Cargos
-- ============================================

-- Analista de IM = Nível 5 (posição sênior, gerencia assistente)
UPDATE cargos 
SET level = 5, 
    description = 'Analista de pesquisa e inteligência de mercado (gerencia assistente)'
WHERE name = 'Analista de Inteligência de Mercado';

-- Assistente de IM = Nível 6 (operacional, reporta ao analista)
UPDATE cargos 
SET level = 6, 
    description = 'Assistente de inteligência de mercado (reporta ao analista)'
WHERE name = 'Assistente de Inteligência de Mercado';

-- ============================================
-- PASSO 2: Garantir que usuários estão no dept Projetos
-- ============================================

-- Katiuscia = Analista de IM
UPDATE profiles 
SET department = 'projetos'
WHERE cargo = 'Analista de Inteligência de Mercado';

-- Natália = Assistente de IM
UPDATE profiles 
SET department = 'projetos'
WHERE cargo = 'Assistente de Inteligência de Mercado';

-- ============================================
-- PASSO 3: Criar Linhas de Reporte
-- ============================================

-- Katiuscia (Analista IM) reporta ao César (Gerente de Projetos)
INSERT INTO reporting_lines (subordinate_id, manager_id, relationship_type, is_primary, notes)
SELECT 
    (SELECT id FROM profiles WHERE cargo = 'Analista de Inteligência de Mercado' AND is_active = TRUE LIMIT 1),
    (SELECT id FROM profiles WHERE cargo = 'Gerente de Projetos' AND name LIKE '%César%' AND is_active = TRUE LIMIT 1),
    'direct',
    TRUE,
    'Analista de Inteligência de Mercado reporta ao Gerente de Projetos'
WHERE EXISTS (
    SELECT 1 FROM profiles WHERE cargo = 'Analista de Inteligência de Mercado' AND is_active = TRUE
)
AND EXISTS (
    SELECT 1 FROM profiles WHERE cargo = 'Gerente de Projetos' AND name LIKE '%César%' AND is_active = TRUE
)
AND NOT EXISTS (
    SELECT 1 FROM reporting_lines 
    WHERE subordinate_id = (SELECT id FROM profiles WHERE cargo = 'Analista de Inteligência de Mercado' AND is_active = TRUE LIMIT 1)
    AND effective_until IS NULL
);

-- Natália (Assistente IM) reporta à Katiuscia (Analista IM)
INSERT INTO reporting_lines (subordinate_id, manager_id, relationship_type, is_primary, notes)
SELECT 
    (SELECT id FROM profiles WHERE cargo = 'Assistente de Inteligência de Mercado' AND is_active = TRUE LIMIT 1),
    (SELECT id FROM profiles WHERE cargo = 'Analista de Inteligência de Mercado' AND is_active = TRUE LIMIT 1),
    'direct',
    TRUE,
    'Assistente de IM reporta ao Analista de IM'
WHERE EXISTS (
    SELECT 1 FROM profiles WHERE cargo = 'Assistente de Inteligência de Mercado' AND is_active = TRUE
)
AND EXISTS (
    SELECT 1 FROM profiles WHERE cargo = 'Analista de Inteligência de Mercado' AND is_active = TRUE
)
AND NOT EXISTS (
    SELECT 1 FROM reporting_lines 
    WHERE subordinate_id = (SELECT id FROM profiles WHERE cargo = 'Assistente de Inteligência de Mercado' AND is_active = TRUE LIMIT 1)
    AND effective_until IS NULL
);

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Ver estrutura de Inteligência de Mercado
SELECT 
    p.name,
    p.cargo,
    p.department,
    c.level,
    (SELECT name FROM profiles WHERE id = rl.manager_id) as reporta_para
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
LEFT JOIN reporting_lines rl ON p.id = rl.subordinate_id AND rl.effective_until IS NULL AND rl.is_primary = TRUE
WHERE p.cargo LIKE '%Inteligência%'
    AND p.is_active = TRUE;

-- Ver toda a árvore de Projetos
SELECT 
    c.level,
    p.name,
    p.cargo,
    (SELECT name FROM profiles WHERE id = rl.manager_id) as reporta_para
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
LEFT JOIN reporting_lines rl ON p.id = rl.subordinate_id AND rl.effective_until IS NULL AND rl.is_primary = TRUE
WHERE p.department = 'projetos'
    AND p.is_active = TRUE
ORDER BY c.level, p.name;

-- ============================================
-- RESULTADO ESPERADO NO ORGANOGRAMA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Inteligência de Mercado configurada!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTRUTURA NO ORGANOGRAMA:';
  RAISE NOTICE '';
  RAISE NOTICE 'PROJETOS';
  RAISE NOTICE '└─ César (Gerente de Projetos - Nível 4)';
  RAISE NOTICE '    ├─ Consultores (Nível 6)';
  RAISE NOTICE '    │   ├─ Consultor 1';
  RAISE NOTICE '    │   ├─ Consultor 2';
  RAISE NOTICE '    │   └─ ...';
  RAISE NOTICE '    │';
  RAISE NOTICE '    └─ Katiuscia (Analista de IM - Nível 5) ⭐';
  RAISE NOTICE '        └─ Natália (Assistente de IM - Nível 6)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Agora a Inteligência de Mercado aparece em árvore separada';
  RAISE NOTICE '   ao lado dos Consultores, ambos sob o César!';
END $$;

