-- ============================================
-- CORREÇÃO: Usuários sem cargo
-- ============================================
-- Problema: César, Samuel, Tarcis, Eduardo, Dev Team sem cargo
-- Causa: Emails no script anterior não correspondem aos emails reais
-- Solução: Verificar emails reais e atualizar
-- ============================================

-- ============================================
-- PARTE 1: VERIFICAR EMAILS REAIS
-- ============================================

-- Procurar usuários por nome (case insensitive)
SELECT 
  id,
  name,
  email,
  cargo,
  department,
  role
FROM profiles
WHERE 
  name ILIKE '%césar%' OR 
  name ILIKE '%cesar%' OR
  name ILIKE '%intrieri%' OR
  name ILIKE '%samuel%' OR
  name ILIKE '%bueno%' OR
  name ILIKE '%tarcis%' OR
  name ILIKE '%danilo%' OR
  name ILIKE '%eduardo%' OR
  name ILIKE '%espindola%' OR
  name ILIKE '%dev team%' OR
  name ILIKE '%developer%'
ORDER BY name;

-- ============================================
-- PARTE 2: ATUALIZAR POR NOME (mais seguro)
-- ============================================

-- 2.1. César Intrieri: Gerente de Projetos
UPDATE profiles
SET 
  cargo = 'Gerente de Projetos',
  department = 'projetos'
WHERE name ILIKE '%césar%intrieri%' 
   OR name ILIKE '%cesar%intrieri%'
   OR (name ILIKE '%césar%' AND name ILIKE '%intrieri%')
   OR (name ILIKE '%cesar%' AND name ILIKE '%intrieri%');

-- 2.2. Samuel Bueno: Coordenador Comercial
UPDATE profiles
SET 
  cargo = 'Coordenador',
  department = 'comercial'
WHERE name ILIKE '%samuel%' AND name ILIKE '%bueno%';

-- 2.3. Tarcis Danilo: COO
UPDATE profiles
SET 
  cargo = 'COO',
  department = 'geral'
WHERE (name ILIKE '%tarcis%' AND name ILIKE '%danilo%')
   OR name ILIKE '%tarcis danilo%';

-- 2.4. Eduardo Espindola: Head Marketing
UPDATE profiles
SET 
  cargo = 'Head Marketing',
  department = 'marketing'
WHERE (name ILIKE '%eduardo%' AND name ILIKE '%espindola%')
   OR (name ILIKE '%eduardo%' AND name ILIKE '%espíndola%');

-- 2.5. Dev Team: Desenvolvedor
UPDATE profiles
SET 
  cargo = 'Desenvolvedor',
  department = 'inovação'
WHERE name ILIKE '%dev team%' 
   OR name ILIKE '%dev%team%'
   OR name ILIKE '%developer%';

-- ============================================
-- PARTE 3: VERIFICAÇÃO FINAL
-- ============================================

-- Ver todos os usuários que foram atualizados
SELECT 
  name as "Nome",
  email as "Email",
  cargo as "Cargo",
  department as "Departamento",
  role as "Role",
  CASE 
    WHEN cargo IS NULL THEN '❌ SEM CARGO'
    ELSE '✅ OK'
  END as "Status"
FROM profiles
WHERE 
  name ILIKE '%césar%' OR 
  name ILIKE '%cesar%' OR
  name ILIKE '%intrieri%' OR
  name ILIKE '%samuel%' OR
  name ILIKE '%bueno%' OR
  name ILIKE '%tarcis%' OR
  name ILIKE '%danilo%' OR
  name ILIKE '%eduardo%' OR
  name ILIKE '%espindola%' OR
  name ILIKE '%dev team%' OR
  name ILIKE '%developer%'
ORDER BY name;

-- ============================================
-- PARTE 4: VERIFICAÇÃO GERAL
-- ============================================

-- Listar TODOS os usuários sem cargo
SELECT 
  name as "Nome",
  email as "Email",
  role as "Role",
  department as "Departamento"
FROM profiles
WHERE cargo IS NULL
  AND is_active = TRUE
ORDER BY role, name;

-- ============================================
-- FIM
-- ============================================

/*
INSTRUÇÕES:

1. Execute este script no Supabase SQL Editor

2. Observe os resultados:
   - PARTE 1: Mostra os emails reais dos usuários
   - PARTE 2: Atualiza os usuários por NOME (não email)
   - PARTE 3: Verifica se os 5 foram atualizados
   - PARTE 4: Lista quem ainda está sem cargo

3. Se ainda houver usuários sem cargo na PARTE 4:
   - Copie os nomes exatos
   - Me avise para criar UPDATE específico

NOTA: Usar ILIKE com % permite encontrar mesmo com variações
de acentos, maiúsculas/minúsculas, etc.
*/

