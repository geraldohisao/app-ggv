-- ================================================================
-- 🧪 TESTE RÁPIDO: Verificar se notificações estão funcionando
-- ================================================================
-- Execute este script DEPOIS de aplicar FIX_FEEDBACK_NOTIFICACOES_COMPLETO.sql
-- ================================================================

-- TESTE 1: Verificar se o feedback tem sdr_id
SELECT 
  '1️⃣ FEEDBACK COM SDR_ID?' as teste,
  cf.id,
  cf.sdr_id,
  CASE 
    WHEN cf.sdr_id IS NOT NULL THEN '✅ OK - sdr_id preenchido'
    ELSE '❌ ERRO - sdr_id ainda está null'
  END as resultado,
  p.full_name as sdr_nome,
  p.email as sdr_email
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.sdr_id
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818';

-- TESTE 2: Verificar se a Hiara tem perfil
SELECT 
  '2️⃣ PERFIL DA HIARA?' as teste,
  p.id,
  p.email,
  p.full_name,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ OK - Perfil encontrado'
    ELSE '❌ ERRO - Perfil não encontrado'
  END as resultado
FROM profiles p
WHERE p.email ILIKE '%hiara%' OR p.full_name ILIKE '%hiara%'
LIMIT 1;

-- TESTE 3: Verificar se trigger existe
SELECT 
  '3️⃣ TRIGGER EXISTE?' as teste,
  trigger_name,
  event_manipulation,
  CASE 
    WHEN trigger_name IS NOT NULL THEN '✅ OK - Trigger configurado'
    ELSE '❌ ERRO - Trigger não encontrado'
  END as resultado
FROM information_schema.triggers
WHERE trigger_name = 'trg_populate_feedback_sdr_id'
LIMIT 1;

-- TESTE 4: Verificar se função RPC existe
SELECT 
  '4️⃣ FUNÇÃO RPC EXISTE?' as teste,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ OK - Função RPC configurada'
    ELSE '❌ ERRO - Função RPC não encontrada'
  END as resultado
FROM information_schema.routines
WHERE routine_name = 'get_recent_feedbacks_with_calls'
LIMIT 1;

-- TESTE 5: Simular notificações da Hiara
WITH hiara_profile AS (
  SELECT id, email, full_name 
  FROM profiles 
  WHERE email ILIKE '%hiara%' 
  LIMIT 1
)
SELECT 
  '5️⃣ NOTIFICAÇÕES DA HIARA' as teste,
  COUNT(*) as total_notificacoes,
  COUNT(CASE WHEN cf.is_read = false THEN 1 END) as nao_lidas,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ OK - Notificações encontradas'
    ELSE '⚠️ AVISO - Nenhuma notificação (pode ser normal se ela mesma criou)'
  END as resultado
FROM call_feedbacks cf
CROSS JOIN hiara_profile hp
WHERE cf.sdr_id = hp.id
  AND cf.author_id != hp.id;

-- TESTE 6: Detalhes das notificações
WITH hiara_profile AS (
  SELECT id, email, full_name 
  FROM profiles 
  WHERE email ILIKE '%hiara%' 
  LIMIT 1
)
SELECT 
  '6️⃣ DETALHES DAS NOTIFICAÇÕES' as teste,
  cf.id as feedback_id,
  cf.content,
  cf.is_read,
  cf.created_at,
  c.enterprise,
  p_author.full_name as autor
FROM call_feedbacks cf
CROSS JOIN hiara_profile hp
JOIN calls c ON c.id = cf.call_id
LEFT JOIN profiles p_author ON p_author.id = cf.author_id
WHERE cf.sdr_id = hp.id
  AND cf.author_id != hp.id
ORDER BY cf.created_at DESC
LIMIT 5;

-- TESTE 7: Estatísticas gerais
SELECT 
  '7️⃣ ESTATÍSTICAS GERAIS' as teste,
  COUNT(*) as total_feedbacks,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / NULLIF(COUNT(*), 0), 1) || '%' as percentual_ok,
  CASE 
    WHEN COUNT(*) = COUNT(sdr_id) THEN '✅ PERFEITO - Todos com sdr_id'
    WHEN COUNT(sdr_id) > COUNT(*) * 0.95 THEN '✅ BOM - Mais de 95% com sdr_id'
    WHEN COUNT(sdr_id) > COUNT(*) * 0.80 THEN '⚠️ ATENÇÃO - Entre 80% e 95%'
    ELSE '❌ PROBLEMA - Menos de 80% com sdr_id'
  END as resultado
FROM call_feedbacks;

-- ================================================================
-- RESULTADO ESPERADO
-- ================================================================
-- ✅ Todos os testes devem mostrar "OK"
-- ✅ Hiara deve ter pelo menos 1 notificação (o "teste feedback")
-- ✅ Estatísticas devem mostrar 100% ou perto disso
-- ================================================================

-- ================================================================
-- SE ALGUM TESTE FALHAR
-- ================================================================
-- 1. Execute novamente FIX_FEEDBACK_NOTIFICACOES_COMPLETO.sql
-- 2. Verifique se não há erros no console SQL
-- 3. Contacte o administrador do sistema
-- ================================================================


