-- ================================================================
-- 🔧 CORREÇÃO MASSIVA: Atualizar sdr_id em CHAMADAS e FEEDBACKS
-- ================================================================
-- Problema identificado:
-- - 4764 chamadas sem sdr_id (mas com agent_id)
-- - 5 feedbacks sem sdr_id
-- 
-- Solução: Mapear agent_id → UUID e atualizar em massa
-- ================================================================

-- ================================================================
-- PARTE 1: VERIFICAR SITUAÇÃO ATUAL
-- ================================================================

SELECT '🔍 ANTES DA CORREÇÃO' as etapa;

-- Chamadas
SELECT 
  '📞 CHAMADAS' as tipo,
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  COUNT(agent_id) as com_agent_id
FROM calls;

-- Feedbacks
SELECT 
  '💬 FEEDBACKS' as tipo,
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id
FROM call_feedbacks;

-- ================================================================
-- PARTE 2: GARANTIR QUE FUNÇÃO EXISTE
-- ================================================================

CREATE OR REPLACE FUNCTION get_sdr_uuid_from_email(p_email TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id 
  FROM profiles 
  WHERE email = p_email 
  LIMIT 1;
$$;

-- ================================================================
-- PARTE 3: CORRIGIR CHAMADAS SEM SDR_ID
-- ================================================================

-- Atualizar chamadas que têm agent_id mas não têm sdr_id
WITH updates_to_make AS (
  SELECT 
    c.id as call_id,
    c.agent_id,
    get_sdr_uuid_from_email(c.agent_id) as new_sdr_id
  FROM calls c
  WHERE c.sdr_id IS NULL 
    AND c.agent_id IS NOT NULL
    AND get_sdr_uuid_from_email(c.agent_id) IS NOT NULL
)
UPDATE calls c
SET sdr_id = utm.new_sdr_id
FROM updates_to_make utm
WHERE c.id = utm.call_id;

-- Verificar quantas foram atualizadas
SELECT 
  '✅ CHAMADAS ATUALIZADAS' as resultado,
  COUNT(*) as chamadas_corrigidas
FROM calls
WHERE sdr_id IS NOT NULL 
  AND updated_at > NOW() - INTERVAL '10 seconds';

-- ================================================================
-- PARTE 4: CORRIGIR FEEDBACKS SEM SDR_ID
-- ================================================================

-- Método 1: Via sdr_id da chamada (prioridade)
WITH call_sdr_mapping AS (
  SELECT 
    cf.id as feedback_id,
    c.sdr_id as call_sdr_id
  FROM call_feedbacks cf
  JOIN calls c ON c.id = cf.call_id
  WHERE cf.sdr_id IS NULL
    AND c.sdr_id IS NOT NULL
)
UPDATE call_feedbacks cf
SET sdr_id = csm.call_sdr_id
FROM call_sdr_mapping csm
WHERE cf.id = csm.feedback_id;

-- Método 2: Via agent_id (para os que ainda não têm)
WITH agent_mapping AS (
  SELECT 
    cf.id as feedback_id,
    get_sdr_uuid_from_email(c.agent_id) as mapped_sdr_id
  FROM call_feedbacks cf
  JOIN calls c ON c.id = cf.call_id
  WHERE cf.sdr_id IS NULL
    AND c.agent_id IS NOT NULL
    AND get_sdr_uuid_from_email(c.agent_id) IS NOT NULL
)
UPDATE call_feedbacks cf
SET sdr_id = am.mapped_sdr_id
FROM agent_mapping am
WHERE cf.id = am.feedback_id;

-- ================================================================
-- PARTE 5: CORRIGIR O FEEDBACK ESPECÍFICO DA HIARA
-- ================================================================

-- Garantir que o feedback de teste está correto
UPDATE call_feedbacks cf
SET sdr_id = (
  SELECT COALESCE(c.sdr_id, get_sdr_uuid_from_email(c.agent_id))
  FROM calls c
  WHERE c.id = cf.call_id
)
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818'
  AND cf.sdr_id IS NULL;

-- ================================================================
-- PARTE 6: VERIFICAR RESULTADO
-- ================================================================

SELECT '✅ DEPOIS DA CORREÇÃO' as etapa;

-- Chamadas após correção
SELECT 
  '📞 CHAMADAS (APÓS)' as tipo,
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / NULLIF(COUNT(*), 0), 1) || '%' as percentual,
  CASE 
    WHEN COUNT(sdr_id)::FLOAT / NULLIF(COUNT(*), 0) > 0.95 THEN '✅ ÓTIMO'
    WHEN COUNT(sdr_id)::FLOAT / NULLIF(COUNT(*), 0) > 0.80 THEN '⚠️ BOM'
    ELSE '❌ PRECISA MELHORAR'
  END as status
FROM calls;

-- Feedbacks após correção
SELECT 
  '💬 FEEDBACKS (APÓS)' as tipo,
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / NULLIF(COUNT(*), 0), 1) || '%' as percentual,
  CASE 
    WHEN COUNT(*) = COUNT(sdr_id) THEN '✅ PERFEITO'
    WHEN COUNT(sdr_id)::FLOAT / NULLIF(COUNT(*), 0) > 0.95 THEN '✅ ÓTIMO'
    WHEN COUNT(sdr_id)::FLOAT / NULLIF(COUNT(*), 0) > 0.80 THEN '⚠️ BOM'
    ELSE '❌ PRECISA MELHORAR'
  END as status
FROM call_feedbacks;

-- ================================================================
-- PARTE 7: VERIFICAR FEEDBACK ESPECÍFICO DA HIARA
-- ================================================================

SELECT 
  '🎯 FEEDBACK DA HIARA' as verificacao,
  cf.id,
  cf.sdr_id,
  cf.content,
  cf.is_read,
  p.full_name as sdr_nome,
  p.email as sdr_email,
  CASE 
    WHEN cf.sdr_id IS NOT NULL THEN '✅ OK - Notificação vai aparecer'
    ELSE '❌ ERRO - Ainda sem sdr_id'
  END as status
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.sdr_id
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818';

-- ================================================================
-- PARTE 8: LISTAR FEEDBACKS QUE AINDA ESTÃO SEM SDR_ID
-- ================================================================

SELECT 
  '⚠️ FEEDBACKS AINDA SEM SDR_ID' as problema,
  cf.id as feedback_id,
  cf.call_id,
  c.agent_id,
  c.sdr_id as call_sdr_id,
  CASE 
    WHEN c.agent_id IS NULL AND c.sdr_id IS NULL THEN '❌ Chamada sem identificação'
    WHEN get_sdr_uuid_from_email(c.agent_id) IS NULL THEN '❌ Email não tem perfil'
    ELSE '⚠️ Outro problema'
  END as motivo
FROM call_feedbacks cf
LEFT JOIN calls c ON c.id = cf.call_id
WHERE cf.sdr_id IS NULL
ORDER BY cf.created_at DESC;

-- ================================================================
-- PARTE 9: VERIFICAR SE TRIGGER FOI CRIADO
-- ================================================================

SELECT 
  '🔧 TRIGGER' as verificacao,
  trigger_name,
  event_manipulation,
  action_timing,
  CASE 
    WHEN trigger_name IS NOT NULL THEN '✅ OK - Trigger existe'
    ELSE '❌ ERRO - Trigger não encontrado'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'trg_populate_feedback_sdr_id';

-- ================================================================
-- PARTE 10: EMAILS QUE NÃO TÊM PERFIL
-- ================================================================

-- Ver quais emails de agent_id não têm perfil correspondente
SELECT 
  '⚠️ EMAILS SEM PERFIL' as problema,
  c.agent_id,
  COUNT(*) as quantidade_chamadas,
  get_sdr_uuid_from_email(c.agent_id) as perfil_encontrado,
  CASE 
    WHEN get_sdr_uuid_from_email(c.agent_id) IS NULL THEN '❌ Precisa criar perfil'
    ELSE '✅ OK'
  END as acao_necessaria
FROM calls c
WHERE c.sdr_id IS NULL 
  AND c.agent_id IS NOT NULL
GROUP BY c.agent_id
ORDER BY COUNT(*) DESC
LIMIT 20;

-- ================================================================
-- RESULTADO ESPERADO
-- ================================================================
-- ✅ Chamadas: 95%+ com sdr_id
-- ✅ Feedbacks: 100% com sdr_id
-- ✅ Feedback da Hiara: Com sdr_id e notificação funcionando
-- ================================================================


