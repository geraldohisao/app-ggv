-- ================================================================
-- 🔍 VERIFICAR TODOS OS USUÁRIOS ATIVOS (SEM LIMIT)
-- ================================================================

-- 1️⃣ CONTAR TODOS OS USUÁRIOS ATIVOS
SELECT 
  '📊 TOTAL DE USUÁRIOS ATIVOS' as info,
  COUNT(*) as total_ativos
FROM public.list_active_profiles();

-- 2️⃣ VER TODOS OS USUÁRIOS ATIVOS (SEM LIMIT!)
SELECT 
  '📋 LISTA COMPLETA DE USUÁRIOS ATIVOS' as info,
  name,
  email,
  role,
  user_function
FROM public.list_active_profiles()
ORDER BY name;

-- 3️⃣ COMPARAR COM TOTAL GERAL
SELECT 
  '📊 COMPARAÇÃO' as info,
  COUNT(*) FILTER (WHERE is_active = true) as ativos,
  COUNT(*) FILTER (WHERE is_active = false) as inativos,
  COUNT(*) as total
FROM public.profiles;

-- 4️⃣ VER SE TEM ALGUM USUÁRIO COM is_active = NULL
SELECT 
  '⚠️ USUÁRIOS COM is_active NULL' as info,
  COUNT(*) as quantidade_null
FROM public.profiles
WHERE is_active IS NULL;

-- 5️⃣ DETALHES: Ver TODOS os usuários e seus status
SELECT 
  '📋 TODOS OS USUÁRIOS (COM STATUS)' as info,
  name,
  email,
  role,
  user_function,
  CASE 
    WHEN is_active = true THEN '✅ ATIVO'
    WHEN is_active = false THEN '🔴 INATIVO'
    ELSE '⚠️ NULL'
  END as status
FROM public.profiles
ORDER BY is_active DESC, name;

-- ================================================================
-- ✅ RESULTADO ESPERADO:
-- ================================================================
-- Se eram 20 usuários no total:
--   - 3 desativados (Isabel, Lô-Ruama, Victor)
--   - Deveriam ser 17 ativos
-- 
-- Se a RPC retorna 11, podem ter 6 usuários com is_active = NULL
-- ================================================================

