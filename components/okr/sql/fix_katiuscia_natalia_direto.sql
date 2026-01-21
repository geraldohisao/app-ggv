-- ============================================
-- CORREÇÃO DIRETA: Katiuscia e Natália
-- Atualiza cargos sem depender da importação
-- ============================================

-- Atualizar Katiuscia
UPDATE profiles
SET 
    cargo = 'Analista de Inteligência de Mercado',
    department = 'projetos',
    updated_at = NOW()
WHERE email = 'katiuscia@grupoggv.com';

-- Atualizar Natália
UPDATE profiles
SET 
    cargo = 'Assistente de Inteligência de Mercado',
    department = 'projetos',
    updated_at = NOW()
WHERE email = 'natalia@grupoggv.com';

-- Verificar
SELECT 
    name,
    email,
    cargo,
    department,
    (SELECT level FROM cargos WHERE cargos.name = profiles.cargo) as nivel
FROM profiles
WHERE email IN ('katiuscia@grupoggv.com', 'natalia@grupoggv.com');

DO $$
BEGIN
  RAISE NOTICE '✅ Cargos atualizados!';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Próximo passo:';
  RAISE NOTICE '   Ctrl+Shift+R (hard refresh)';
  RAISE NOTICE '   Veja o organograma - deve estar correto agora!';
  RAISE NOTICE '';
  RAISE NOTICE '📝 OBS: A importação do Google pode ser corrigida depois.';
  RAISE NOTICE '    Por ora, mudanças manuais no cargo dessas duas pessoas';
  RAISE NOTICE '    devem ser feitas aqui via SQL ou em Gerenciar Usuários.';
END $$;

