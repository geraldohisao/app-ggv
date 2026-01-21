-- ============================================
-- CORREÇÃO: Adicionar "Analista de Marketing" 
-- e organizar melhor os cargos
-- ============================================
-- Problema: 
-- 1. "Analista de Marketing" existe no OTE mas não na tabela cargos
-- 2. Precisa deixar mais clara a distinção entre níveis
-- ============================================

-- ============================================
-- 1. ADICIONAR CARGO "Analista de Marketing"
-- ============================================

INSERT INTO cargos (name, description, level) VALUES
  ('Analista de Marketing', 'Analista de marketing e geração de leads', 5)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = TRUE;

-- ============================================
-- 2. VERIFICAR/AJUSTAR CARGOS EXISTENTES
-- ============================================

-- Garantir que "Analista" genérico existe (nível 5 - Operacional)
INSERT INTO cargos (name, description, level) VALUES
  ('Analista', 'Analista operacional', 5)
ON CONFLICT (name) DO UPDATE SET
  level = 5,
  description = EXCLUDED.description;

-- Garantir que "Gerente" está no nível 4 (não é Head!)
UPDATE cargos 
SET level = 4, description = 'Gerente de área'
WHERE name = 'Gerente';

-- Garantir que "Coordenador" está no nível 4 (mesmo nível que Gerente)
UPDATE cargos 
SET level = 4, description = 'Coordenador de equipe'
WHERE name = 'Coordenador';

-- ============================================
-- 3. ADICIONAR MAIS CARGOS OPERACIONAIS (se necessário)
-- ============================================

-- Garantir que todos os cargos operacionais existem
INSERT INTO cargos (name, description, level) VALUES
  ('SDR', 'Sales Development Representative', 5),
  ('Closer', 'Closer de vendas', 5)
ON CONFLICT (name) DO UPDATE SET
  level = 5,
  description = EXCLUDED.description;

-- ============================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================

-- Ver todos os cargos organizados por nível
SELECT 
  CASE level
    WHEN 1 THEN '1️⃣ C-Level'
    WHEN 2 THEN '2️⃣ Diretoria'
    WHEN 3 THEN '3️⃣ Head/Liderança'
    WHEN 4 THEN '4️⃣ Gerência/Coordenação'
    WHEN 5 THEN '5️⃣ Operacional'
    ELSE '❓ Outro'
  END as nivel_hierarquico,
  name as cargo,
  description as descricao,
  is_active as ativo
FROM cargos
ORDER BY level, name;

-- ============================================
-- 5. COMENTÁRIOS ÚTEIS
-- ============================================

COMMENT ON COLUMN cargos.level IS 
'Nível hierárquico: 
1 = C-Level (CEO)
2 = Diretoria 
3 = Head/Liderança
4 = Gerência/Coordenação
5 = Operacional (SDR, Closer, Analistas)';

-- ============================================
-- FIM
-- ============================================

/*
RESUMO DAS MUDANÇAS:

✅ Adicionado: "Analista de Marketing" (nível 5)
✅ Verificado: Todos os cargos operacionais (SDR, Closer, Analista)
✅ Ajustado: Gerente e Coordenador no nível 4
✅ Clarificado: Estrutura hierárquica completa

ESTRUTURA FINAL DE NÍVEIS:

1️⃣ C-Level          → CEO
2️⃣ Diretoria        → Diretor
3️⃣ Head/Liderança   → Head Comercial, Head Marketing, Head Projetos
4️⃣ Gerência         → Gerente, Coordenador
5️⃣ Operacional      → SDR, Closer, Analista, Analista de Marketing

IMPORTANTE:
- Gerência ≠ Head (Gerência é um nível ABAIXO de Head)
- Analista = Operacional (nível mais baixo da hierarquia)
- Coordenador = mesmo nível que Gerente (nível 4)
*/

