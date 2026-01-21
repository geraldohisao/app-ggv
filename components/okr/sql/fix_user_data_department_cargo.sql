-- ============================================
-- CORREÇÃO DEFINITIVA: DEPARTMENT + CARGO
-- ============================================
-- Nova abordagem simplificada:
-- - user_function NÃO é mais necessário
-- - OTE é determinado por: department + cargo
-- - Mais limpo, menos duplicação, mais consistente
-- ============================================

-- ============================================
-- PARTE 1: ADICIONAR CARGOS FALTANTES
-- ============================================

INSERT INTO cargos (name, description, level) VALUES
  ('COO', 'Chief Operating Officer', 1),
  ('Gerente de Projetos', 'Gerente de projetos', 4),
  ('Desenvolvedor', 'Desenvolvedor de software', 5),
  ('Head Marketing', 'Head do departamento de marketing', 3),
  ('Coordenador', 'Coordenador de equipe', 4),
  ('Analista de Marketing', 'Analista de marketing e geração de leads', 5)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = TRUE;

-- ============================================
-- PARTE 2: CORRIGIR DADOS DOS USUÁRIOS
-- ============================================

-- 2.1. César Intrieri: Gerente de Projetos
UPDATE profiles
SET 
  cargo = 'Gerente de Projetos',
  department = 'projetos',
  user_function = NULL  -- ❌ Não precisa mais (vai ser calculado por department + cargo)
WHERE email = 'cesar@grupoggv.com';

-- 2.2. Samuel Bueno: Coordenador Comercial
UPDATE profiles
SET 
  cargo = 'Coordenador',
  department = 'comercial',  -- ✅ COMERCIAL = tem OTE
  user_function = NULL  -- Será calculado: department=comercial + cargo=Coordenador → OTE Coordenador
WHERE email = 'samuel.bueno@grupoggv.com';

-- 2.3. Tarcis Danilo: COO
UPDATE profiles
SET 
  cargo = 'COO',
  department = 'geral',
  user_function = NULL
WHERE email = 'danilo@grupoggv.com';

-- 2.4. Dev Team: Desenvolvedor
UPDATE profiles
SET 
  cargo = 'Desenvolvedor',
  department = 'inovação',  -- ou 'projetos', 'tecnologia', conforme preferir
  user_function = NULL
WHERE email = 'devteam@grupoggv.com';

-- 2.5. Eduardo Espindola: Head Marketing
UPDATE profiles
SET 
  cargo = 'Head Marketing',
  department = 'marketing',
  user_function = NULL
WHERE email = 'eduardo.espindola@grupoggv.com';

-- 2.6. Giancarlo Blanco: Closer
UPDATE profiles
SET 
  cargo = 'Closer',
  department = 'comercial',  -- ✅ COMERCIAL = tem OTE
  user_function = NULL  -- Será calculado: department=comercial + cargo=Closer → OTE Closer
WHERE email = 'giancarlo@grupoggv.com';

-- ============================================
-- PARTE 3: MIGRAÇÃO GERAL
-- ============================================

-- 3.1. Limpar user_function de todos (agora é calculado)
-- COMENTADO: Vamos manter por enquanto para não quebrar nada
-- UPDATE profiles SET user_function = NULL;

-- 3.2. Garantir que usuários com cargos comerciais tenham department = 'comercial'
UPDATE profiles
SET department = 'comercial'
WHERE cargo IN ('SDR', 'Closer', 'Coordenador')
  AND (department IS NULL OR department != 'comercial');

-- 3.3. Garantir que Analista de Marketing tenha department = 'marketing'
UPDATE profiles
SET department = 'marketing'
WHERE cargo = 'Analista de Marketing'
  AND (department IS NULL OR department != 'marketing');

-- ============================================
-- PARTE 4: VERIFICAÇÃO FINAL
-- ============================================

-- 4.1. Ver todos os usuários com a estrutura corrigida
SELECT 
  name as "Nome",
  email as "Email",
  department as "Departamento",
  cargo as "Cargo",
  role as "Role",
  -- Calcular qual OTE tem (se tiver)
  CASE 
    WHEN department = 'comercial' AND cargo = 'SDR' THEN '✅ OTE: SDR'
    WHEN department = 'comercial' AND cargo = 'Closer' THEN '✅ OTE: Closer'
    WHEN department = 'comercial' AND cargo = 'Coordenador' THEN '✅ OTE: Coordenador'
    WHEN department = 'marketing' AND cargo = 'Analista de Marketing' THEN '✅ OTE: Analista Marketing'
    WHEN role IN ('SUPER_ADMIN', 'ADMIN') THEN '👁️ Vê todos os OTEs'
    ELSE '❌ Sem OTE'
  END as "Status OTE",
  is_active as "Ativo"
FROM profiles
WHERE is_active = TRUE
ORDER BY role, department, cargo;

-- 4.2. Estatísticas por Departamento
SELECT 
  department as "Departamento",
  COUNT(*) as "Total de Usuários",
  COUNT(CASE WHEN cargo IN ('SDR', 'Closer', 'Coordenador', 'Analista de Marketing') THEN 1 END) as "Com OTE"
FROM profiles
WHERE is_active = TRUE
GROUP BY department
ORDER BY department;

-- 4.3. Usuários comerciais (que têm OTE)
SELECT 
  name as "Nome",
  cargo as "Cargo",
  department as "Departamento",
  role as "Role"
FROM profiles
WHERE is_active = TRUE
  AND department IN ('comercial', 'marketing')
  AND cargo IN ('SDR', 'Closer', 'Coordenador', 'Analista de Marketing')
ORDER BY cargo;

-- ============================================
-- PARTE 5: DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN profiles.department IS 
'Departamento do usuário (comercial, marketing, projetos, geral, inovação).
Usado junto com cargo para determinar se tem OTE.';

COMMENT ON COLUMN profiles.cargo IS 
'Cargo/posição do usuário (SDR, Closer, Coordenador, Analista de Marketing, etc).
Usado junto com department para determinar qual OTE calcular.';

COMMENT ON COLUMN profiles.user_function IS 
'[DEPRECATED] Função comercial (será removido - usar department + cargo).
Valores válidos: SDR, Closer, Gestor, Analista de Marketing.
Manter apenas para compatibilidade temporária.';

-- ============================================
-- FIM
-- ============================================

/*
✅ NOVA LÓGICA SIMPLIFICADA:

QUEM TEM OTE:
┌────────────────────────────────────────────┐
│ DEPARTAMENTO COMERCIAL:                    │
│  - SDR                → OTE de SDR         │
│  - Closer             → OTE de Closer      │
│  - Coordenador        → OTE de Coordenador │
├────────────────────────────────────────────┤
│ DEPARTAMENTO MARKETING:                    │
│  - Analista de Marketing → OTE de Analista │
└────────────────────────────────────────────┘

QUEM NÃO TEM OTE:
- Qualquer cargo em outros departamentos
- Head, Gerente de Projetos, Desenvolvedor, COO, etc

PERMISSÕES:
- SUPER_ADMIN/ADMIN → Veem TODOS os OTEs
- USER → Vê apenas seu OTE (se tiver, baseado em department + cargo)

RESULTADO DOS 6 USUÁRIOS:

┌─────────────┬──────────────────────┬────────────┬───────────┬─────────┐
│ Nome        │ Cargo                │ Depto      │ Tem OTE?  │ Vê OTEs │
├─────────────┼──────────────────────┼────────────┼───────────┼─────────┤
│ César       │ Gerente de Projetos  │ projetos   │ ❌ Não    │ ✅ Todos│
│ Samuel      │ Coordenador          │ comercial  │ ✅ Sim    │ ✅ Todos│
│ Tarcis      │ COO                  │ geral      │ ❌ Não    │ ✅ Todos│
│ Dev Team    │ Desenvolvedor        │ inovação   │ ❌ Não    │ ❌ Nada │
│ Eduardo     │ Head Marketing       │ marketing  │ ❌ Não    │ ❌ Nada │
│ Giancarlo   │ Closer               │ comercial  │ ✅ Sim    │ ✅ Só C.│
└─────────────┴──────────────────────┴────────────┴───────────┴─────────┘

BENEFÍCIOS:
✅ Sem duplicação de dados
✅ Impossível ter inconsistência
✅ Lógica clara e simples
✅ Fácil de adicionar novos cargos/departamentos
✅ user_function pode ser removido no futuro

PRÓXIMO PASSO:
Execute este script e depois ajuste o código TypeScript!
*/

