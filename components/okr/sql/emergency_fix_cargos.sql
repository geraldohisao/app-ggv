-- ============================================
-- 🚨 EMERGÊNCIA: RESTAURAR SISTEMA
-- Adicionar cargos faltantes + Corrigir usuários
-- ============================================

-- PROBLEMA:
-- Usuários foram atualizados com cargos que não existem na tabela cargos
-- Isso quebra o organograma e validações

-- ============================================
-- PASSO 1: Adicionar cargos faltantes
-- ============================================

INSERT INTO cargos (name, description, level) VALUES
  ('Analista de Inteligência de Mercado', 'Analista de pesquisa e inteligência de mercado', 6),
  ('Assistente de Inteligência de Mercado', 'Assistente de inteligência de mercado', 6)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  level = EXCLUDED.level;

-- ============================================
-- PASSO 2: Verificar se há outros cargos quebrados
-- ============================================

-- Ver usuários com cargos que não existem na tabela cargos
SELECT 
  p.id,
  p.name,
  p.cargo as cargo_atual,
  CASE 
    WHEN c.name IS NULL THEN '❌ CARGO NÃO EXISTE'
    ELSE '✅ OK'
  END as status
FROM profiles p
LEFT JOIN cargos c ON p.cargo = c.name
WHERE p.is_active = TRUE
ORDER BY status, p.name;

-- ============================================
-- PASSO 3: Limpar cache do browser
-- ============================================

-- Se ainda estiver com tela branca, você precisa:
-- 1. Abrir DevTools (F12)
-- 2. Application → Clear Storage → Clear site data
-- 3. Ou: Ctrl+Shift+R (hard refresh)

-- ============================================
-- PASSO 4: Criar departamento (opcional)
-- ============================================

INSERT INTO departments (name, description, color) VALUES
  ('Inteligência de Mercado', 'Análise e pesquisa de mercado', '#F59E0B')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PASSO 5: Atualizar usuários (se necessário)
-- ============================================

-- Se quiser mover para departamento específico:
-- UPDATE profiles 
-- SET department = 'inteligência de mercado'
-- WHERE name IN ('Katiuscia', 'Natália');

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Ver todos os cargos ativos
SELECT name, level, description 
FROM cargos 
WHERE is_active = TRUE 
ORDER BY level, name;

-- Ver usuários de inteligência de mercado
SELECT name, cargo, department 
FROM profiles 
WHERE cargo LIKE '%Inteligência%' 
  AND is_active = TRUE;

-- ============================================
-- MENSAGEM
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Cargos de Inteligência de Mercado criados!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '1. Execute este SQL';
  RAISE NOTICE '2. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '3. Recarregue a página';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Se ainda estiver com tela branca:';
  RAISE NOTICE '   - Abra DevTools (F12) → Console';
  RAISE NOTICE '   - Veja o erro exato';
  RAISE NOTICE '   - Me envie a mensagem de erro';
END $$;

