-- ================================================================
-- 🔍 INVESTIGAÇÃO: Onde estão os perfis dos SDRs?
-- ================================================================
-- Problema: agent_id das chamadas não tem perfil correspondente
-- Exemplos: "Hiara Saienne", "Mariana Costa", etc.
-- ================================================================

-- INVESTIGAÇÃO 1: Ver como está o agent_id nas chamadas
SELECT 
  '1️⃣ FORMATO DO AGENT_ID' as investigacao,
  agent_id,
  COUNT(*) as quantidade_chamadas
FROM calls
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY COUNT(*) DESC
LIMIT 15;

-- INVESTIGAÇÃO 2: Ver estrutura da tabela profiles
SELECT 
  '2️⃣ ESTRUTURA PROFILES' as investigacao,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- INVESTIGAÇÃO 3: Ver alguns registros da tabela profiles
SELECT 
  '3️⃣ EXEMPLOS DE PROFILES' as investigacao,
  id,
  email,
  full_name,
  role
FROM profiles
LIMIT 10;

-- INVESTIGAÇÃO 4: Tentar buscar por nome (ao invés de email)
SELECT 
  '4️⃣ BUSCA POR NOME (full_name)' as investigacao,
  p.id,
  p.email,
  p.full_name,
  'Hiara Saienne' as agent_id_procurado,
  CASE 
    WHEN p.full_name ILIKE '%hiara%' THEN '✅ Match por nome'
    ELSE '❌ Não encontrado'
  END as resultado
FROM profiles p
WHERE p.full_name ILIKE '%hiara%'
   OR p.full_name ILIKE '%saienne%'
LIMIT 5;

-- INVESTIGAÇÃO 5: Tentar buscar variações do nome
SELECT 
  '5️⃣ VARIAÇÕES DO NOME' as investigacao,
  p.id,
  p.email,
  p.full_name
FROM profiles p
WHERE 
  p.full_name ILIKE '%hiara%'
  OR p.email ILIKE '%hiara%'
  OR p.full_name ILIKE '%mariana%costa%'
  OR p.full_name ILIKE '%camila%'
  OR p.full_name ILIKE '%andressa%'
ORDER BY p.full_name;

-- INVESTIGAÇÃO 6: Ver se existe outra tabela de usuários
SELECT 
  '6️⃣ OUTRAS TABELAS DE USUÁRIOS' as investigacao,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%user%'
    OR table_name ILIKE '%profile%'
    OR table_name ILIKE '%sdr%'
    OR table_name ILIKE '%agent%'
    OR table_name ILIKE '%employee%'
    OR table_name ILIKE '%people%'
  )
ORDER BY table_name;

-- INVESTIGAÇÃO 7: Verificar se existe tabela ggv_user
SELECT 
  '7️⃣ TABELA GGV_USER (se existir)' as investigacao,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'ggv_user'
ORDER BY ordinal_position;

-- INVESTIGAÇÃO 8: Ver registros de ggv_user (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ggv_user') THEN
    RAISE NOTICE '✅ Tabela ggv_user EXISTE';
    -- Execute a query abaixo manualmente se esta tabela existir
  ELSE
    RAISE NOTICE '❌ Tabela ggv_user NÃO EXISTE';
  END IF;
END $$;

-- Query manual para executar se ggv_user existir:
-- SELECT * FROM ggv_user WHERE name ILIKE '%hiara%' LIMIT 5;

-- INVESTIGAÇÃO 9: Ver formato do agent_id - é email ou nome?
SELECT 
  '9️⃣ FORMATO DO AGENT_ID' as investigacao,
  agent_id,
  CASE 
    WHEN agent_id LIKE '%@%' THEN '📧 É EMAIL'
    WHEN agent_id ~ '^[A-Z]' THEN '👤 É NOME (inicia com maiúscula)'
    ELSE '❓ Formato desconhecido'
  END as tipo,
  COUNT(*) as quantidade
FROM calls
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY COUNT(*) DESC
LIMIT 15;

-- INVESTIGAÇÃO 10: Comparar agent_id com profiles
SELECT 
  '🔟 COMPARAÇÃO AGENT_ID x PROFILES' as investigacao,
  c.agent_id,
  COUNT(DISTINCT c.id) as chamadas,
  COUNT(DISTINCT p.id) as perfis_encontrados,
  STRING_AGG(DISTINCT p.full_name, ', ') as nomes_possiveis
FROM calls c
LEFT JOIN profiles p ON (
  p.email = c.agent_id 
  OR p.full_name ILIKE '%' || c.agent_id || '%'
  OR c.agent_id ILIKE '%' || p.full_name || '%'
)
WHERE c.agent_id IN (
  'Hiara Saienne',
  'Mariana Costa',
  'Camila Ataliba'
)
GROUP BY c.agent_id;

-- ================================================================
-- RESULTADO ESPERADO
-- ================================================================
-- Descobrir:
-- 1. Se agent_id é email ou nome
-- 2. Se existe outra tabela com esses usuários
-- 3. Como mapear corretamente agent_id → profiles.id
-- ================================================================


