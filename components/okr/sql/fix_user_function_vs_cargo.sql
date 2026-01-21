-- ============================================
-- CORREÇÃO: user_function vs cargo
-- ============================================
-- Problema identificado:
-- - Cargos estão salvos em user_function (campo errado!)
-- - Campo cargo está NULL
-- 
-- Solução:
-- 1. Adicionar cargos faltantes
-- 2. Migrar dados de user_function → cargo
-- 3. Limpar user_function (deixar só funções comerciais válidas)
-- ============================================

-- ============================================
-- PARTE 1: ADICIONAR CARGOS FALTANTES
-- ============================================

-- Adicionar cargos que estão sendo usados mas não existem na tabela
INSERT INTO cargos (name, description, level) VALUES
  ('COO', 'Chief Operating Officer', 1),
  ('Gerente de Projetos', 'Gerente de projetos', 4),
  ('Desenvolvedor', 'Desenvolvedor de software', 5),
  ('Head Marketing', 'Head do departamento de marketing', 3)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = TRUE;

-- Garantir que "Coordenador" existe
INSERT INTO cargos (name, description, level) VALUES
  ('Coordenador', 'Coordenador de equipe', 4)
ON CONFLICT (name) DO UPDATE SET
  level = 4,
  is_active = TRUE;

-- ============================================
-- PARTE 2: MIGRAR DADOS (user_function → cargo)
-- ============================================

-- 2.1. César Intrieri: "Gerente de Projetos" (ADMIN - vê todos OTEs mas não tem OTE próprio)
UPDATE profiles
SET 
  cargo = 'Gerente de Projetos',
  user_function = NULL  -- ❌ NÃO tem OTE calculado (é gestor de projetos, não comercial)
WHERE email = 'cesar@grupoggv.com';

-- 2.2. Samuel Bueno: "Coordenador" (ADMIN - vê todos OTEs E tem OTE próprio)
UPDATE profiles
SET 
  cargo = 'Coordenador',
  user_function = 'Gestor'  -- ✅ TEM OTE (Coordenador = perfil Gestor no OTE)
WHERE email = 'samuel.bueno@grupoggv.com';

-- 2.3. Tarcis Danilo: "COO" (ADMIN - vê todos OTEs mas não tem OTE próprio)
UPDATE profiles
SET 
  cargo = 'COO',
  user_function = NULL  -- ❌ NÃO tem OTE calculado (COO não é função comercial)
WHERE email = 'danilo@grupoggv.com';

-- 2.4. Dev Team: "Desenvolvedor" (USER - não tem OTE)
UPDATE profiles
SET 
  cargo = 'Desenvolvedor',
  user_function = NULL  -- ❌ NÃO tem OTE (desenvolvedor não é função comercial)
WHERE email = 'devteam@grupoggv.com';

-- 2.5. Eduardo Espindola: "Head Marketing" (USER - não tem OTE)
UPDATE profiles
SET 
  cargo = 'Head Marketing',
  user_function = NULL  -- ❌ NÃO tem OTE (Head Marketing não é função comercial)
WHERE email = 'eduardo.espindola@grupoggv.com';

-- 2.6. Giancarlo Blanco: "Closer"
UPDATE profiles
SET 
  cargo = 'Closer',
  user_function = 'Closer'  -- Closer mantém em ambos os campos
WHERE email = 'giancarlo@grupoggv.com';

-- ============================================
-- PARTE 3: LIMPEZA GERAL (TODOS OS USUÁRIOS)
-- ============================================

-- Garantir que user_function só tem valores válidos
-- Valores válidos: 'SDR', 'Closer', 'Gestor', 'Analista de Marketing', NULL

-- Limpar valores inválidos (que são cargos, não funções comerciais)
UPDATE profiles
SET user_function = NULL
WHERE user_function NOT IN ('SDR', 'Closer', 'Gestor', 'Analista de Marketing')
  AND user_function IS NOT NULL;

-- ============================================
-- PARTE 4: MIGRAÇÃO INTELIGENTE PARA OUTROS CASOS
-- ============================================

-- Se alguém tem user_function = cargo comum, migrar automaticamente
UPDATE profiles
SET 
  cargo = CASE 
    WHEN user_function = 'Coordenador' THEN 'Coordenador'
    WHEN user_function = 'Gerente' THEN 'Gerente'
    WHEN user_function LIKE 'Head%' THEN user_function
    WHEN user_function = 'Diretor' THEN 'Diretor'
    WHEN user_function = 'CEO' THEN 'CEO'
    WHEN user_function = 'Desenvolvedor' THEN 'Desenvolvedor'
    ELSE cargo
  END,
  user_function = CASE 
    WHEN user_function IN ('SDR', 'Closer', 'Gestor', 'Analista de Marketing') THEN user_function
    WHEN user_function IN ('Coordenador', 'Gerente', 'Diretor') THEN 'Gestor'
    ELSE NULL
  END
WHERE cargo IS NULL;

-- ============================================
-- PARTE 5: VERIFICAÇÃO FINAL
-- ============================================

-- 5.1. Ver todos os usuários com a correção aplicada
SELECT 
  name as "Nome",
  email as "Email",
  cargo as "Cargo (hierarquia)",
  user_function as "Função Comercial (OTE)",
  role as "Role",
  department as "Departamento",
  CASE 
    WHEN cargo IS NULL THEN '❌ SEM CARGO'
    ELSE '✅ OK'
  END as "Status Cargo",
  CASE 
    WHEN user_function IS NULL THEN '➖ Sem OTE'
    WHEN user_function IN ('SDR', 'Closer', 'Gestor', 'Analista de Marketing') THEN '✅ OK'
    ELSE '⚠️ VALOR INVÁLIDO'
  END as "Status Função"
FROM profiles
WHERE is_active = TRUE
ORDER BY role, name;

-- 5.2. Estatísticas
SELECT 
  'Usuários com cargo definido' as "Métrica",
  COUNT(*)::TEXT as "Valor"
FROM profiles
WHERE is_active = TRUE AND cargo IS NOT NULL
UNION ALL
SELECT 
  'Usuários SEM cargo definido',
  COUNT(*)::TEXT
FROM profiles
WHERE is_active = TRUE AND cargo IS NULL
UNION ALL
SELECT 
  'Usuários com função comercial válida',
  COUNT(*)::TEXT
FROM profiles
WHERE is_active = TRUE 
  AND user_function IN ('SDR', 'Closer', 'Gestor', 'Analista de Marketing')
UNION ALL
SELECT 
  'Usuários SEM função comercial (OK se não tiver OTE)',
  COUNT(*)::TEXT
FROM profiles
WHERE is_active = TRUE AND user_function IS NULL;

-- 5.3. Lista de cargos cadastrados
SELECT 
  CASE level
    WHEN 1 THEN '1️⃣ C-Level'
    WHEN 2 THEN '2️⃣ Diretoria'
    WHEN 3 THEN '3️⃣ Head/Liderança'
    WHEN 4 THEN '4️⃣ Gerência/Coordenação'
    WHEN 5 THEN '5️⃣ Operacional'
    ELSE '❓ Outro'
  END as "Nível",
  name as "Cargo",
  description as "Descrição"
FROM cargos
WHERE is_active = TRUE
ORDER BY level, name;

-- ============================================
-- FIM
-- ============================================

/*
✅ O QUE ESTE SCRIPT FAZ:

1. Adiciona cargos faltantes:
   - COO (nível 1)
   - Gerente de Projetos (nível 4)
   - Desenvolvedor (nível 5)
   - Head Marketing (nível 3)

2. Migra dados ESPECÍFICOS dos 6 usuários:
   - César → cargo: "Gerente de Projetos", função: NULL (não tem OTE)
   - Samuel → cargo: "Coordenador", função: "Gestor" (TEM OTE)
   - Tarcis → cargo: "COO", função: NULL (não tem OTE)
   - Dev Team → cargo: "Desenvolvedor", função: NULL (não tem OTE)
   - Eduardo → cargo: "Head Marketing", função: NULL (não tem OTE)
   - Giancarlo → cargo: "Closer", função: "Closer" (TEM OTE)

3. Limpa user_function de valores inválidos

4. Faz migração inteligente para outros casos similares

5. Gera 3 relatórios de verificação

RESULTADO ESPERADO:
- ✅ Todos os 17 usuários com cargo definido
- ✅ user_function contém APENAS: SDR, Closer, Gestor, Analista de Marketing, NULL
- ✅ cargo contém a posição hierárquica real
- ✅ Sistema consistente e correto!

PRÓXIMO PASSO:
Execute este script no Supabase SQL Editor!
*/

