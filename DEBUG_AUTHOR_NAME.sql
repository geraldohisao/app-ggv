-- ================================================================
-- 🔍 DEBUG: Por que author_name não aparece?
-- ================================================================

-- 1️⃣ Verificar se seu perfil existe
SELECT 
  '1️⃣ SEU PERFIL (Geraldo)' as debug,
  id,
  email,
  full_name,
  role
FROM profiles
WHERE email ILIKE '%geraldo%'
   OR full_name ILIKE '%geraldo%';

-- 2️⃣ Verificar author_id dos feedbacks
SELECT 
  '2️⃣ AUTHOR_ID DOS FEEDBACKS' as debug,
  cf.id as feedback_id,
  cf.content,
  cf.author_id,
  p.full_name as autor_encontrado,
  p.email as email_encontrado,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Perfil existe'
    WHEN cf.author_id = '00000000-0000-0000-0000-000000000001'::uuid THEN '⚠️ ID genérico'
    ELSE '❌ Perfil não encontrado'
  END as status
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.author_id
WHERE cf.content LIKE '%teste%'
ORDER BY cf.created_at DESC;

-- 3️⃣ Testar a função RPC diretamente (como Hiara veria)
-- IMPORTANTE: Esta query só vai funcionar se você estiver logado como Hiara
-- Ou se executar com o auth.uid() correto

SELECT 
  '3️⃣ TESTE DA FUNÇÃO RPC' as debug,
  feedback_id,
  content,
  author_name,  -- ← Este é o campo que deve mostrar o nome
  author_email,
  author_id,
  call_enterprise
FROM get_recent_feedbacks_with_calls(10)
ORDER BY created_at DESC;

-- 4️⃣ Verificar se o author_id é você
SELECT 
  '4️⃣ COMPARAR IDs' as debug,
  '7133c0d3-9fce-4e2b-97c5-55d3feba88ac' as seu_author_id_dos_logs,
  (SELECT id FROM profiles WHERE email ILIKE '%geraldo%') as seu_id_na_tabela,
  CASE 
    WHEN '7133c0d3-9fce-4e2b-97c5-55d3feba88ac' = (SELECT id FROM profiles WHERE email ILIKE '%geraldo%') 
    THEN '✅ IDs batem'
    ELSE '❌ IDs diferentes - PROBLEMA!'
  END as status;

-- 5️⃣ Ver dados RAW da função (sem filtros auth)
-- Esta query mostra TODOS os feedbacks, ignorando auth
SELECT 
  '5️⃣ DADOS RAW (sem auth)' as debug,
  cf.id as feedback_id,
  cf.content,
  cf.author_id,
  p_author.full_name as author_name,
  p_author.email as author_email,
  cf.sdr_id,
  p_sdr.full_name as sdr_name
FROM call_feedbacks cf
LEFT JOIN profiles p_author ON p_author.id = cf.author_id
LEFT JOIN profiles p_sdr ON p_sdr.id = cf.sdr_id
WHERE cf.content LIKE '%teste%'
ORDER BY cf.created_at DESC;

-- 6️⃣ Verificar se profiles tem os dados corretos
SELECT 
  '6️⃣ TODOS OS PROFILES' as debug,
  id,
  email,
  full_name,
  CASE 
    WHEN full_name IS NULL OR full_name = '' THEN '❌ Nome vazio'
    ELSE '✅ Nome preenchido'
  END as status
FROM profiles
ORDER BY email;

-- ================================================================
-- O QUE PROCURAR:
-- ================================================================
-- 1️⃣ Se seu perfil existe com full_name preenchido
-- 2️⃣ Se author_id dos feedbacks bate com seu ID
-- 3️⃣ Se a função RPC está retornando author_name
-- 4️⃣ Se há diferença entre IDs
-- 5️⃣ Se o JOIN está funcionando
-- ================================================================


