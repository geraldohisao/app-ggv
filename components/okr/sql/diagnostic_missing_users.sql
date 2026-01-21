-- ============================================
-- DIAGNÓSTICO: Por que faltam usuários no organograma?
-- ============================================

-- 1. Ver TODOS os usuários ativos
SELECT 
    COUNT(*) as total_ativos,
    COUNT(DISTINCT department) as total_departamentos
FROM profiles
WHERE is_active = TRUE;

-- 2. Ver usuários por departamento
SELECT 
    COALESCE(department, 'SEM DEPARTAMENTO') as dept,
    COUNT(*) as qtd_pessoas,
    string_agg(name, ', ') as nomes
FROM profiles
WHERE is_active = TRUE
GROUP BY department
ORDER BY COUNT(*) DESC;

-- 3. Ver usuários sem cargo ou departamento (podem não aparecer)
SELECT 
    name,
    email,
    cargo,
    department,
    (SELECT level FROM cargos WHERE cargos.name = profiles.cargo) as nivel
FROM profiles
WHERE is_active = TRUE
    AND (cargo IS NULL OR department IS NULL)
ORDER BY name;

-- 4. Ver usuários do departamento PROJETOS especificamente
SELECT 
    p.name,
    p.cargo,
    p.department,
    c.level as nivel
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
WHERE p.department = 'projetos'
    AND p.is_active = TRUE
ORDER BY c.level, p.name;

-- 5. Ver se César (Gerente de Projetos) está ativo
SELECT 
    name,
    cargo,
    department,
    is_active,
    (SELECT level FROM cargos WHERE cargos.name = profiles.cargo) as nivel
FROM profiles
WHERE cargo = 'Gerente de Projetos';

-- 6. Ver TODOS os usuários com nível e departamento
SELECT 
    p.name,
    p.email,
    p.cargo,
    p.department,
    c.level as nivel,
    p.is_active
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
WHERE p.is_active = TRUE
ORDER BY p.department, c.level, p.name;

-- ============================================
-- MENSAGEM
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Execute as queries acima para ver:';
  RAISE NOTICE '  1. Total de usuários ativos';
  RAISE NOTICE '  2. Distribuição por departamento';
  RAISE NOTICE '  3. Usuários sem cargo/dept (não aparecem)';
  RAISE NOTICE '  4. Estrutura de Projetos';
  RAISE NOTICE '  5. César e sua equipe';
  RAISE NOTICE '  6. Visão completa';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Com essas informações descobrimos o que falta!';
END $$;

