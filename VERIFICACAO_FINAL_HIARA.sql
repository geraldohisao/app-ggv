-- ================================================================
-- ✅ VERIFICAÇÃO FINAL: Feedback da Hiara e Estatísticas
-- ================================================================

-- 1️⃣ VERIFICAR FEEDBACK ESPECÍFICO DA HIARA
SELECT 
  '1️⃣ FEEDBACK DA HIARA' as verificacao,
  cf.id,
  cf.call_id,
  cf.sdr_id,
  cf.content,
  cf.is_read,
  cf.created_at,
  p.full_name as sdr_nome,
  p.email as sdr_email,
  CASE 
    WHEN cf.sdr_id IS NOT NULL THEN '✅ OK - Notificação vai aparecer!'
    ELSE '❌ ERRO - Ainda sem sdr_id'
  END as status
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.sdr_id
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818';

-- 2️⃣ VERIFICAR CHAMADA DA HIARA
SELECT 
  '2️⃣ CHAMADA DA HIARA' as verificacao,
  c.id,
  c.agent_id,
  c.sdr_id,
  c.enterprise,
  c.person,
  c.duration_formated,
  p.full_name as sdr_nome,
  CASE 
    WHEN c.sdr_id IS NOT NULL THEN '✅ Mapeada'
    ELSE '❌ Sem mapeamento'
  END as status
FROM calls c
LEFT JOIN profiles p ON p.id = c.sdr_id
WHERE c.id = '798ce977-62c3-4962-bffa-14e09f02ad15';

-- 3️⃣ ESTATÍSTICAS FINAIS DE FEEDBACKS
SELECT 
  '3️⃣ ESTATÍSTICAS FEEDBACKS' as verificacao,
  COUNT(*) as total_feedbacks,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / NULLIF(COUNT(*), 0), 1) || '%' as percentual,
  CASE 
    WHEN COUNT(*) = COUNT(sdr_id) THEN '✅ PERFEITO - 100%'
    WHEN COUNT(sdr_id)::FLOAT / COUNT(*) >= 0.95 THEN '✅ ÓTIMO - 95%+'
    WHEN COUNT(sdr_id)::FLOAT / COUNT(*) >= 0.80 THEN '⚠️ BOM - 80%+'
    ELSE '❌ PRECISA MELHORAR'
  END as status
FROM call_feedbacks;

-- 4️⃣ ESTATÍSTICAS FINAIS DE CHAMADAS
SELECT 
  '4️⃣ ESTATÍSTICAS CHAMADAS' as verificacao,
  COUNT(*) as total_chamadas,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / NULLIF(COUNT(*), 0), 1) || '%' as percentual,
  CASE 
    WHEN COUNT(sdr_id)::FLOAT / COUNT(*) >= 0.95 THEN '✅ ÓTIMO - 95%+'
    WHEN COUNT(sdr_id)::FLOAT / COUNT(*) >= 0.80 THEN '⚠️ BOM - 80%+'
    ELSE '❌ PRECISA MELHORAR'
  END as status
FROM calls;

-- 5️⃣ SIMULAR NOTIFICAÇÕES QUE A HIARA VERÁ
WITH hiara_profile AS (
  SELECT id, email, full_name 
  FROM profiles 
  WHERE full_name ILIKE '%hiara%' 
     OR email ILIKE '%hiara%'
  LIMIT 1
)
SELECT 
  '5️⃣ NOTIFICAÇÕES DA HIARA' as verificacao,
  cf.id as feedback_id,
  cf.content,
  cf.created_at,
  cf.is_read,
  c.enterprise,
  c.person,
  p_author.full_name as autor,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Hiara VERÁ esta notificação'
    ELSE '⚠️ Sem notificações'
  END as status
FROM call_feedbacks cf
CROSS JOIN hiara_profile hp
JOIN calls c ON c.id = cf.call_id
LEFT JOIN profiles p_author ON p_author.id = cf.author_id
WHERE cf.sdr_id = hp.id
  AND cf.author_id != hp.id
GROUP BY cf.id, cf.content, cf.created_at, cf.is_read, c.enterprise, c.person, p_author.full_name
ORDER BY cf.created_at DESC
LIMIT 5;

-- 6️⃣ VERIFICAR SE TRIGGER ESTÁ ATIVO
SELECT 
  '6️⃣ TRIGGER ATIVO' as verificacao,
  trigger_name,
  event_manipulation,
  action_timing,
  CASE 
    WHEN trigger_name IS NOT NULL THEN '✅ Trigger instalado e ativo'
    ELSE '❌ Trigger não encontrado'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'trg_populate_feedback_sdr_id';

-- 7️⃣ TODOS OS FEEDBACKS COM STATUS
SELECT 
  '7️⃣ TODOS OS FEEDBACKS' as verificacao,
  cf.id,
  cf.sdr_id,
  p.full_name as sdr_nome,
  cf.content,
  cf.is_read,
  CASE 
    WHEN cf.sdr_id IS NOT NULL THEN '✅ OK'
    ELSE '❌ Sem sdr_id'
  END as status
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.sdr_id
ORDER BY cf.created_at DESC;

-- ================================================================
-- RESULTADO ESPERADO
-- ================================================================
-- 1️⃣ Feedback da Hiara: ✅ OK com sdr_id
-- 2️⃣ Chamada da Hiara: ✅ Mapeada
-- 3️⃣ Feedbacks: ✅ 100% ou muito próximo
-- 4️⃣ Chamadas: ✅ 95%+ com sdr_id
-- 5️⃣ Notificações: ✅ Hiara verá o feedback
-- 6️⃣ Trigger: ✅ Ativo
-- 7️⃣ Todos feedbacks: ✅ OK
-- ================================================================

-- ================================================================
-- SE TUDO ESTIVER ✅ - PRÓXIMO PASSO:
-- ================================================================
-- Peça para a Hiara:
-- 1. Fazer logout/login OU recarregar a página (F5)
-- 2. Verificar sino de notificações 🔔
-- 3. Deve aparecer badge com "1"
-- 4. Clicar na notificação
-- 5. Deve abrir a chamada correta
-- ================================================================

