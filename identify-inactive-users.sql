-- ================================================================
-- 🔍 IDENTIFICAR USUÁRIOS POTENCIALMENTE INATIVOS
-- ================================================================
-- Use este script para encontrar usuários que podem ter sido
-- excluídos do Google Workspace mas ainda estão ativos no sistema
-- ================================================================

-- 1️⃣ VER TODOS OS USUÁRIOS ATIVOS (ORDENADOS POR DATA DE CRIAÇÃO)
-- Usuários mais antigos que não fazem login há muito tempo podem ter sido excluídos
SELECT 
  '1️⃣ TODOS OS USUÁRIOS ATIVOS' as info,
  p.id,
  p.name,
  p.email,
  p.role,
  p.user_function,
  p.created_at,
  p.is_active,
  -- Calcular dias desde criação
  EXTRACT(DAY FROM NOW() - p.created_at) as dias_desde_criacao
FROM public.profiles p
WHERE p.is_active = true
ORDER BY p.created_at ASC
LIMIT 50;

-- 2️⃣ ESTATÍSTICAS DE USUÁRIOS
SELECT 
  '2️⃣ ESTATÍSTICAS' as info,
  COUNT(*) FILTER (WHERE is_active = true) as usuarios_ativos,
  COUNT(*) FILTER (WHERE is_active = false) as usuarios_inativos,
  COUNT(*) as total_usuarios,
  ROUND(
    COUNT(*) FILTER (WHERE is_active = true)::numeric / COUNT(*)::numeric * 100, 
    2
  ) as percentual_ativos
FROM public.profiles;

-- 3️⃣ USUÁRIOS CRIADOS MAS SEM NOME (possível problema de sincronização)
SELECT 
  '3️⃣ USUÁRIOS SEM NOME' as info,
  p.id,
  p.email,
  p.name,
  p.role,
  p.is_active,
  p.created_at
FROM public.profiles p
WHERE (p.name IS NULL OR p.name = '' OR p.name = p.email)
  AND p.is_active = true
ORDER BY p.created_at DESC;

-- 4️⃣ USUÁRIOS POR DOMÍNIO DE EMAIL
-- Ajuda a identificar emails que não são mais do domínio da empresa
SELECT 
  '4️⃣ DISTRIBUIÇÃO POR DOMÍNIO' as info,
  SPLIT_PART(p.email, '@', 2) as dominio,
  COUNT(*) as quantidade,
  COUNT(*) FILTER (WHERE is_active = true) as ativos,
  COUNT(*) FILTER (WHERE is_active = false) as inativos
FROM public.profiles p
WHERE p.email IS NOT NULL AND p.email != '-'
GROUP BY SPLIT_PART(p.email, '@', 2)
ORDER BY quantidade DESC;

-- 5️⃣ USUÁRIOS QUE JÁ ESTÃO INATIVOS
SELECT 
  '5️⃣ USUÁRIOS JÁ MARCADOS COMO INATIVOS' as info,
  p.id,
  p.name,
  p.email,
  p.role,
  p.user_function,
  p.created_at
FROM public.profiles p
WHERE p.is_active = false
ORDER BY p.name;

-- ================================================================
-- 📝 INSTRUÇÕES PARA DESATIVAR USUÁRIOS:
-- ================================================================

-- ⚠️ ATENÇÃO: Antes de desativar usuários, certifique-se de que eles
-- realmente foram excluídos do Google Workspace!

-- OPÇÃO 1: Desativar um usuário específico por EMAIL
-- UPDATE public.profiles
-- SET is_active = false
-- WHERE email = 'usuario@exemplo.com';

-- OPÇÃO 2: Desativar um usuário específico por ID
-- UPDATE public.profiles
-- SET is_active = false
-- WHERE id = 'uuid-do-usuario';

-- OPÇÃO 3: Desativar múltiplos usuários por EMAIL (exemplo)
-- UPDATE public.profiles
-- SET is_active = false
-- WHERE email IN (
--   'usuario1@exemplo.com',
--   'usuario2@exemplo.com',
--   'usuario3@exemplo.com'
-- );

-- OPÇÃO 4: Reativar um usuário
-- UPDATE public.profiles
-- SET is_active = true
-- WHERE email = 'usuario@exemplo.com';

-- ================================================================
-- 💡 DICA: Como verificar quem está ativo no Google Workspace?
-- ================================================================
-- 1. Acesse o Google Admin Console (admin.google.com)
-- 2. Vá em "Usuários" → "Gerenciar usuários"
-- 3. Exporte a lista de usuários ativos
-- 4. Compare com a lista acima
-- 5. Desative no sistema os usuários que não existem mais no Google

-- ================================================================
-- ✅ VERIFICAÇÃO FINAL
-- ================================================================
SELECT 
  '✅ VERIFICAÇÃO FINAL' as info,
  'Usuários ativos: ' || COUNT(*) FILTER (WHERE is_active = true) as resultado
FROM public.profiles
UNION ALL
SELECT 
  'ℹ️ INFO' as info,
  'Use a interface web (Configurações → Gerenciar Usuários) para visualizar e gerenciar usuários'
UNION ALL
SELECT 
  'ℹ️ FILTRO' as info,
  'Por padrão, apenas usuários ATIVOS são mostrados na interface'
UNION ALL
SELECT 
  'ℹ️ LOGS' as info,
  'Verifique os logs do navegador para debug de operações de ativar/desativar';

-- ================================================================

