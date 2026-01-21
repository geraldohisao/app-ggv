-- ============================================
-- ADICIONAR CARGOS PARA WORKSPACE SYNC
-- ============================================
-- Baseado nos dados reais do Google Workspace
-- ============================================

-- 1. ADICIONAR DEPARTAMENTO FINANCEIRO
INSERT INTO departments (name, description, color) VALUES
  ('Financeiro', 'Departamento financeiro e administrativo', '#F59E0B')
ON CONFLICT (name) DO UPDATE SET
  is_active = TRUE,
  color = EXCLUDED.color;

-- 2. ADICIONAR CARGOS QUE FALTAM

-- Head de Financeiro (nível 3)
INSERT INTO cargos (name, description, level) VALUES
  ('Head Financeiro', 'Head do departamento financeiro', 3)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = TRUE;

-- Coordenadores específicos (nível 4)
INSERT INTO cargos (name, description, level) VALUES
  ('Coordenador Comercial', 'Coordenador do time comercial', 4),
  ('Coordenador de Projetos', 'Coordenador de projetos', 4)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = TRUE;

-- Cargos operacionais (nível 5)
INSERT INTO cargos (name, description, level) VALUES
  ('Consultor', 'Consultor de projetos', 5),
  ('Estagiário', 'Estagiário', 5),
  ('Trainee', 'Trainee em desenvolvimento', 5)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = TRUE;

-- 3. GARANTIR QUE CARGOS EXISTENTES ESTÃO CORRETOS
UPDATE cargos SET level = 5, is_active = TRUE WHERE name = 'Desenvolvedor';

-- 4. VERIFICAÇÃO FINAL
SELECT 
  CASE level
    WHEN 1 THEN '1️⃣ C-Level'
    WHEN 2 THEN '2️⃣ Diretoria'
    WHEN 3 THEN '3️⃣ Head/Liderança'
    WHEN 4 THEN '4️⃣ Gerência/Coordenação'
    WHEN 5 THEN '5️⃣ Operacional'
  END as "Nível",
  name as "Cargo",
  description as "Descrição"
FROM cargos
WHERE is_active = TRUE
ORDER BY level, name;

-- 5. VERIFICAR DEPARTAMENTOS
SELECT 
  name as "Departamento",
  description as "Descrição",
  color as "Cor"
FROM departments
WHERE is_active = TRUE
ORDER BY name;

-- ============================================
-- RESUMO DOS CARGOS ADICIONADOS
-- ============================================

/*
CARGOS ADICIONADOS:

Nível 3 (Head):
  - Head Financeiro

Nível 4 (Gerência/Coordenação):
  - Coordenador Comercial
  - Coordenador de Projetos

Nível 5 (Operacional):
  - Consultor
  - Estagiário
  - Trainee

DEPARTAMENTOS ADICIONADOS:
  - Financeiro (cor: amarelo #F59E0B)

TOTAL DE CARGOS NO SISTEMA: ~16
TOTAL DE DEPARTAMENTOS: 6
*/

