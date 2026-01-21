-- ============================================
-- HIERARQUIA COMPLETA CORRIGIDA - VERSÃO SIMPLES
-- Apenas níveis, SEM linhas de reporte
-- ============================================

-- ============================================
-- CORRIGIR TODOS OS NÍVEIS
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

-- Nível 5: Coordenadores + Analistas Sênior (GERENCIAM equipe)
UPDATE cargos SET level = 5 WHERE name IN (
    'Coordenador',
    'Coordenador Comercial',
    'Coordenador de Projetos'
);

-- ⭐ Analista de Marketing (GERENCIA trainees e estagiários)
UPDATE cargos SET level = 5, description = 'Analista de marketing (gerencia campanhas e equipe júnior)'
WHERE name = 'Analista de Marketing';

-- ⭐ Analista de Inteligência de Mercado (GERENCIA assistente)
UPDATE cargos SET level = 5, description = 'Analista de pesquisa e inteligência de mercado (gerencia assistente)'
WHERE name = 'Analista de Inteligência de Mercado';

-- Nível 6: Operacional / Júnior
UPDATE cargos SET level = 6, description = 'Sales Development Representative'
WHERE name = 'SDR';

UPDATE cargos SET level = 6, description = 'Closer de vendas'
WHERE name = 'Closer';

UPDATE cargos SET level = 6, description = 'Analista operacional'
WHERE name = 'Analista';

UPDATE cargos SET level = 6, description = 'Trainee em desenvolvimento'
WHERE name = 'Trainee';

UPDATE cargos SET level = 6, description = 'Consultor de projetos (vendedor externo / implementação)'
WHERE name = 'Consultor';

UPDATE cargos SET level = 6, description = 'Consultor/vendedor externo'
WHERE name = 'Consultor Comercial';

UPDATE cargos SET level = 6, description = 'Desenvolvedor de software'
WHERE name = 'Desenvolvedor';

-- ⭐ Assistente de Inteligência de Mercado (REPORTA ao Analista IM)
UPDATE cargos SET level = 6, description = 'Assistente de inteligência de mercado (reporta ao analista)'
WHERE name = 'Assistente de Inteligência de Mercado';

-- Nível 7: Estagiários
UPDATE cargos SET level = 7, description = 'Estagiário em treinamento'
WHERE name = 'Estagiário';

-- ============================================
-- AJUSTES DE DEPARTAMENTO
-- ============================================

-- Inteligência de Mercado fica em Projetos (para aparecer sob César)
UPDATE profiles 
SET department = 'projetos'
WHERE cargo IN ('Analista de Inteligência de Mercado', 'Assistente de Inteligência de Mercado')
  AND is_active = TRUE;

-- ============================================
-- VALIDAÇÃO FINAL
-- ============================================

-- Ver todos os cargos por nível
SELECT 
    level as "Nível",
    name as "Cargo",
    description as "Descrição"
FROM cargos
WHERE is_active = TRUE
ORDER BY level, name;

-- Ver usuários de Inteligência de Mercado
SELECT 
    p.name as "Nome",
    p.cargo as "Cargo",
    p.department as "Departamento",
    c.level as "Nível"
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
WHERE p.cargo LIKE '%Inteligência%'
    AND p.is_active = TRUE;

-- Ver estrutura de Projetos (incluindo IM)
SELECT 
    c.level as "Nível",
    p.name as "Nome",
    p.cargo as "Cargo"
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
WHERE p.department = 'projetos'
    AND p.is_active = TRUE
ORDER BY c.level, p.name;

-- ============================================
-- RESUMO VISUAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ================================================';
  RAISE NOTICE '✅  HIERARQUIA COMPLETA ATUALIZADA COM SUCESSO!';
  RAISE NOTICE '✅ ================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 NÍVEIS CORRIGIDOS:';
  RAISE NOTICE '';
  RAISE NOTICE '  Nível 1: CEO, COO, Sócio';
  RAISE NOTICE '  Nível 2: Diretor';
  RAISE NOTICE '  Nível 3: Heads (Comercial, Marketing, Projetos, Financeiro)';
  RAISE NOTICE '  Nível 4: Gerentes (Gerente, Gerente de Projetos)';
  RAISE NOTICE '  Nível 5: Coordenadores + Analistas Sênior ⭐';
  RAISE NOTICE '           - Coordenador, Coordenador Comercial, Coordenador de Projetos';
  RAISE NOTICE '           - Analista de Marketing (gerencia trainees/estagiários)';
  RAISE NOTICE '           - Analista de Inteligência de Mercado (gerencia assistente)';
  RAISE NOTICE '  Nível 6: Operacional / Júnior';
  RAISE NOTICE '           - SDR, Closer, Trainee, Consultores';
  RAISE NOTICE '           - Assistente de Inteligência de Mercado';
  RAISE NOTICE '  Nível 7: Estagiário';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 ESTRUTURA NO ORGANOGRAMA:';
  RAISE NOTICE '';
  RAISE NOTICE '  MARKETING:';
  RAISE NOTICE '    └─ Eduardo (Analista - Nível 5) GERENCIA ↓';
  RAISE NOTICE '        ├─ Carolina (Trainee - Nível 6)';
  RAISE NOTICE '        └─ Barbara (Estagiário - Nível 7)';
  RAISE NOTICE '';
  RAISE NOTICE '  PROJETOS:';
  RAISE NOTICE '    └─ César (Gerente - Nível 4)';
  RAISE NOTICE '        ├─ Coordenadores (Nível 5)';
  RAISE NOTICE '        ├─ Consultores (Nível 6)';
  RAISE NOTICE '        └─ Inteligência de Mercado ⭐';
  RAISE NOTICE '            ├─ Katiuscia (Analista IM - Nível 5)';
  RAISE NOTICE '            └─ Natália (Assistente IM - Nível 6)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 PRÓXIMO PASSO:';
  RAISE NOTICE '   1. Recarregue o frontend (Ctrl+Shift+R)';
  RAISE NOTICE '   2. Abra o organograma';
  RAISE NOTICE '   3. Veja a nova estrutura hierárquica! ✨';
  RAISE NOTICE '';
END $$;

