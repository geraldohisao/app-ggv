-- ============================================
-- ATUALIZAR CARGOS: Katiuscia e Natália
-- Mudar de "Consultor" para cargos de Inteligência
-- ============================================

-- ⚠️ IMPORTANTE: Ajuste os nomes exatos se necessário!

-- ============================================
-- OPÇÃO 1: Por nome (se souber os nomes exatos)
-- ============================================

-- Katiuscia → Analista de Inteligência de Mercado
UPDATE profiles 
SET 
    cargo = 'Analista de Inteligência de Mercado',
    department = 'projetos',
    updated_at = NOW()
WHERE name LIKE '%Katiuscia%'
    AND is_active = TRUE;

-- Natália → Assistente de Inteligência de Mercado  
UPDATE profiles 
SET 
    cargo = 'Assistente de Inteligência de Mercado',
    department = 'projetos',
    updated_at = NOW()
WHERE name LIKE '%Natália%'
    AND cargo = 'Consultor'
    AND is_active = TRUE;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Ver se atualizou corretamente
SELECT 
    name as "Nome",
    cargo as "Cargo",
    department as "Departamento",
    (SELECT level FROM cargos WHERE cargos.name = profiles.cargo) as "Nível"
FROM profiles
WHERE name LIKE '%Katiuscia%' OR name LIKE '%Natália%'
ORDER BY name;

-- Ver estrutura de Inteligência de Mercado completa
SELECT 
    p.name as "Nome",
    p.cargo as "Cargo",
    p.department as "Departamento",
    c.level as "Nível",
    c.description as "Descrição"
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
WHERE p.cargo LIKE '%Inteligência%'
    AND p.is_active = TRUE;

-- ============================================
-- MENSAGEM
-- ============================================

DO $$
DECLARE
    katiuscia_updated INT;
    natalia_updated INT;
BEGIN
    -- Contar quantos registros foram atualizados
    SELECT COUNT(*) INTO katiuscia_updated 
    FROM profiles 
    WHERE cargo = 'Analista de Inteligência de Mercado' AND name LIKE '%Katiuscia%';
    
    SELECT COUNT(*) INTO natalia_updated 
    FROM profiles 
    WHERE cargo = 'Assistente de Inteligência de Mercado' AND name LIKE '%Natália%';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ================================';
    RAISE NOTICE '✅  CARGOS ATUALIZADOS!';
    RAISE NOTICE '✅ ================================';
    RAISE NOTICE '';
    
    IF katiuscia_updated > 0 THEN
        RAISE NOTICE '✅ Katiuscia → Analista de Inteligência de Mercado';
    ELSE
        RAISE NOTICE '⚠️  Katiuscia NÃO foi atualizada (verifique o nome exato)';
    END IF;
    
    IF natalia_updated > 0 THEN
        RAISE NOTICE '✅ Natália → Assistente de Inteligência de Mercado';
    ELSE
        RAISE NOTICE '⚠️  Natália NÃO foi atualizada (verifique o nome exato)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Próximo passo:';
    RAISE NOTICE '   1. Ctrl+Shift+R (hard refresh)';
    RAISE NOTICE '   2. Abra o organograma';
    RAISE NOTICE '   3. Verifique se aparecem corretamente!';
    RAISE NOTICE '';
END $$;

-- ============================================
-- SE OS NOMES NÃO BATEREM
-- ============================================

-- Execute isso para ver os nomes EXATOS:
SELECT 
    id,
    name,
    email,
    cargo,
    department
FROM profiles
WHERE cargo = 'Consultor'
    AND is_active = TRUE
ORDER BY name;

-- Depois ajuste o UPDATE acima com os nomes corretos

