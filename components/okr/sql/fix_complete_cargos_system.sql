-- ============================================
-- CORREÇÃO COMPLETA: SISTEMA DE CARGOS
-- ============================================
-- Objetivo:
-- 1. Adicionar "Analista de Marketing" 
-- 2. Esclarecer estrutura hierárquica
-- 3. Migrar dados existentes
-- ============================================

-- ============================================
-- PARTE 1: GARANTIR ESTRUTURA DA TABELA PROFILES
-- ============================================

-- Adicionar campo 'cargo' se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='cargo'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cargo TEXT;
  END IF;
END $$;

COMMENT ON COLUMN profiles.cargo IS 
'Cargo do usuário conforme tabela cargos (CEO, Head Comercial, SDR, Closer, Analista, Analista de Marketing, etc)';

-- ============================================
-- PARTE 2: ATUALIZAR TABELA DE CARGOS
-- ============================================

-- 2.1. Adicionar "Analista de Marketing" (PRINCIPAL CORREÇÃO)
INSERT INTO cargos (name, description, level) VALUES
  ('Analista de Marketing', 'Analista de marketing e geração de leads', 5)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = TRUE;

-- 2.2. Garantir que todos os cargos operacionais existem
INSERT INTO cargos (name, description, level) VALUES
  ('SDR', 'Sales Development Representative', 5),
  ('Closer', 'Closer de vendas', 5),
  ('Analista', 'Analista operacional', 5)
ON CONFLICT (name) DO UPDATE SET
  level = 5,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 2.3. Ajustar cargos de gerência (garantir que estão no nível 4)
UPDATE cargos 
SET level = 4, description = 'Gerente de área'
WHERE name = 'Gerente';

UPDATE cargos 
SET level = 4, description = 'Coordenador de equipe'
WHERE name = 'Coordenador';

-- 2.4. Garantir que Heads estão no nível 3
UPDATE cargos 
SET level = 3
WHERE name ILIKE 'Head%';

-- ============================================
-- PARTE 3: MIGRAÇÃO DE DADOS EXISTENTES
-- ============================================

-- 3.1. Migrar user_function para cargo (apenas para usuários sem cargo definido)
-- Mapeamento:
-- - SDR → SDR
-- - Closer → Closer
-- - Gestor → Coordenador (se for operacional) ou deixar como Gestor
-- - Analista de Marketing → Analista de Marketing

UPDATE profiles
SET cargo = user_function
WHERE cargo IS NULL 
  AND user_function IN ('SDR', 'Closer', 'Analista de Marketing');

UPDATE profiles
SET cargo = 'Coordenador'
WHERE cargo IS NULL 
  AND user_function = 'Gestor'
  AND role = 'USER';

UPDATE profiles
SET cargo = 'Head Comercial'
WHERE cargo IS NULL 
  AND user_function = 'Gestor'
  AND role = 'ADMIN'
  AND department = 'Comercial';

UPDATE profiles
SET cargo = 'CEO'
WHERE cargo IS NULL 
  AND role = 'SUPER_ADMIN';

-- ============================================
-- PARTE 4: ADICIONAR CONSTRAINTS E VALIDAÇÕES
-- ============================================

-- 4.1. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_cargo ON profiles(cargo);

-- 4.2. Criar função para validar se cargo existe
CREATE OR REPLACE FUNCTION validate_cargo_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cargo IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM cargos 
      WHERE name = NEW.cargo 
      AND is_active = TRUE
    ) THEN
      RAISE WARNING 'Cargo "%" não existe ou está inativo na tabela cargos', NEW.cargo;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.3. Criar trigger (apenas warning, não bloqueia)
DROP TRIGGER IF EXISTS trigger_validate_cargo ON profiles;
CREATE TRIGGER trigger_validate_cargo
  BEFORE INSERT OR UPDATE OF cargo ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_cargo_exists();

-- ============================================
-- PARTE 5: ATUALIZAR RPC list_all_profiles
-- ============================================

DROP FUNCTION IF EXISTS public.list_all_profiles();

CREATE OR REPLACE FUNCTION public.list_all_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  user_function TEXT,
  cargo TEXT,
  department TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.cargo,
    p.department,
    p.is_active
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_all_profiles() TO authenticated, service_role;

-- ============================================
-- PARTE 6: VERIFICAÇÃO FINAL
-- ============================================

-- 6.1. Mostrar estrutura de cargos
SELECT 
  CASE level
    WHEN 1 THEN '1️⃣ C-Level'
    WHEN 2 THEN '2️⃣ Diretoria'
    WHEN 3 THEN '3️⃣ Head/Liderança'
    WHEN 4 THEN '4️⃣ Gerência/Coordenação'
    WHEN 5 THEN '5️⃣ Operacional'
    ELSE '❓ Outro'
  END as "Nível Hierárquico",
  name as "Cargo",
  description as "Descrição",
  CASE WHEN is_active THEN '✅ Ativo' ELSE '❌ Inativo' END as "Status"
FROM cargos
ORDER BY level, name;

-- 6.2. Mostrar usuários sem cargo definido (para revisão manual)
SELECT 
  name as "Nome",
  email as "Email",
  user_function as "Função Comercial",
  cargo as "Cargo",
  role as "Role",
  department as "Departamento"
FROM profiles
WHERE is_active = TRUE 
  AND cargo IS NULL
ORDER BY role, name;

-- 6.3. Estatísticas
SELECT 
  'Total de cargos cadastrados' as "Métrica",
  COUNT(*)::TEXT as "Valor"
FROM cargos
WHERE is_active = TRUE
UNION ALL
SELECT 
  'Usuários com cargo definido',
  COUNT(*)::TEXT
FROM profiles
WHERE is_active = TRUE AND cargo IS NOT NULL
UNION ALL
SELECT 
  'Usuários SEM cargo definido',
  COUNT(*)::TEXT
FROM profiles
WHERE is_active = TRUE AND cargo IS NULL;

-- ============================================
-- FIM
-- ============================================

/*
✅ CHECKLIST DE CORREÇÕES:

[✓] Campo 'cargo' adicionado à tabela profiles
[✓] "Analista de Marketing" adicionado à tabela cargos (nível 5)
[✓] Todos os cargos operacionais garantidos (SDR, Closer, Analista)
[✓] Níveis corrigidos (Gerente=4, Coordenador=4, Heads=3)
[✓] Migração automática de user_function → cargo
[✓] Validação de cargo (warning se não existir)
[✓] RPC list_all_profiles atualizado para incluir cargo
[✓] Índice criado para performance
[✓] Relatórios de verificação

📊 ESTRUTURA FINAL:

1️⃣ C-Level          → CEO
2️⃣ Diretoria        → Diretor
3️⃣ Head/Liderança   → Head Comercial, Head Marketing, Head Projetos
4️⃣ Gerência         → Gerente, Coordenador
5️⃣ Operacional      → SDR, Closer, Analista, Analista de Marketing

⚠️ AÇÕES NECESSÁRIAS APÓS EXECUTAR:

1. Revisar usuários sem cargo definido (query 6.2)
2. Definir cargo manualmente para esses usuários
3. Verificar se há cargos faltando no seu organograma
4. Adicionar novos cargos via interface de "Gerenciar Cargos"

🔧 MANUTENÇÃO:

- Para adicionar novos cargos: use a interface "Gerenciar Cargos" no Settings
- Para alterar cargo de um usuário: edite o campo 'cargo' na gestão de usuários
- user_function continua sendo usado para cálculo de OTE
- cargo é usado para hierarquia organizacional e OKRs
*/

