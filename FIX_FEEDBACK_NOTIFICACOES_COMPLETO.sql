-- ================================================================
-- 🔔 CORREÇÃO COMPLETA: Sistema de Notificações de Feedback
-- ================================================================
-- Data: 24/10/2025
-- Problema: Feedbacks sendo salvos sem sdr_id, notificações não aparecem
-- 
-- Solução implementada:
-- 1. Função para mapear email → UUID do perfil
-- 2. Trigger para popular sdr_id automaticamente
-- 3. Correção retroativa de feedbacks existentes
-- 4. Melhorias na função RPC de notificações
-- ================================================================

-- ================================================================
-- PARTE 1: DIAGNÓSTICO INICIAL
-- ================================================================

-- Verificar feedback específico da Hiara
SELECT 
  '🔍 DIAGNÓSTICO - Feedback atual' as etapa,
  cf.id,
  cf.call_id,
  cf.sdr_id,
  cf.author_id,
  cf.content,
  cf.is_read,
  cf.created_at
FROM call_feedbacks cf
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818';

-- Verificar dados da chamada
SELECT 
  '🔍 DIAGNÓSTICO - Dados da chamada' as etapa,
  c.id,
  c.agent_id,
  c.sdr_id,
  c.enterprise,
  c.person,
  c.duration_formated
FROM calls c
WHERE c.id = '798ce977-62c3-4962-bffa-14e09f02ad15';

-- Verificar perfil da Hiara
SELECT 
  '🔍 DIAGNÓSTICO - Perfil da Hiara' as etapa,
  p.id,
  p.email,
  p.full_name
FROM profiles p
WHERE p.email ILIKE '%hiara%' OR p.full_name ILIKE '%hiara%';

-- ================================================================
-- PARTE 2: CRIAR/ATUALIZAR FUNÇÕES E TRIGGERS
-- ================================================================

-- Função 1: Mapear email → UUID do perfil
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

COMMENT ON FUNCTION get_sdr_uuid_from_email IS 
  'Mapeia email do agent_id para UUID do perfil na tabela profiles';

-- Função 2: Trigger para popular sdr_id automaticamente
CREATE OR REPLACE FUNCTION populate_feedback_sdr_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sdr_uuid UUID;
  v_agent_email TEXT;
BEGIN
  -- Só processar se sdr_id não foi fornecido
  IF NEW.sdr_id IS NULL THEN
    -- Buscar agent_id (email) da chamada
    SELECT c.agent_id, c.sdr_id
    INTO v_agent_email, v_sdr_uuid
    FROM calls c
    WHERE c.id = NEW.call_id;
    
    -- Tentar usar sdr_id direto da chamada (prioridade)
    IF v_sdr_uuid IS NOT NULL THEN
      NEW.sdr_id := v_sdr_uuid;
      RAISE NOTICE 'sdr_id populado diretamente da chamada: %', v_sdr_uuid;
    -- Senão, tentar mapear via email
    ELSIF v_agent_email IS NOT NULL THEN
      NEW.sdr_id := get_sdr_uuid_from_email(v_agent_email);
      RAISE NOTICE 'sdr_id populado via email %: %', v_agent_email, NEW.sdr_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION populate_feedback_sdr_id IS 
  'Trigger function: popula sdr_id automaticamente ao inserir feedback';

-- Remover trigger existente e criar novo
DROP TRIGGER IF EXISTS trg_populate_feedback_sdr_id ON call_feedbacks;

CREATE TRIGGER trg_populate_feedback_sdr_id
  BEFORE INSERT ON call_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION populate_feedback_sdr_id();

-- ================================================================
-- PARTE 3: CORREÇÃO RETROATIVA
-- ================================================================

-- Atualizar o feedback específico da Hiara
WITH call_info AS (
  SELECT 
    c.id as call_id,
    c.agent_id,
    c.sdr_id,
    COALESCE(c.sdr_id, get_sdr_uuid_from_email(c.agent_id)) as resolved_sdr_id
  FROM calls c
  WHERE c.id = '798ce977-62c3-4962-bffa-14e09f02ad15'
)
UPDATE call_feedbacks cf
SET sdr_id = call_info.resolved_sdr_id
FROM call_info
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818'
  AND cf.call_id = call_info.call_id
  AND cf.sdr_id IS NULL
  AND call_info.resolved_sdr_id IS NOT NULL;

-- Atualizar TODOS os feedbacks antigos sem sdr_id
WITH call_mapping AS (
  SELECT 
    c.id as call_id,
    COALESCE(c.sdr_id, get_sdr_uuid_from_email(c.agent_id)) as resolved_sdr_id
  FROM calls c
  WHERE c.sdr_id IS NOT NULL OR c.agent_id IS NOT NULL
)
UPDATE call_feedbacks cf
SET sdr_id = cm.resolved_sdr_id
FROM call_mapping cm
WHERE cf.call_id = cm.call_id
  AND cf.sdr_id IS NULL
  AND cm.resolved_sdr_id IS NOT NULL;

-- ================================================================
-- PARTE 4: ATUALIZAR FUNÇÃO RPC DE NOTIFICAÇÕES
-- ================================================================

CREATE OR REPLACE FUNCTION get_recent_feedbacks_with_calls(
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  feedback_id UUID,
  call_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  is_read BOOLEAN,
  author_id UUID,
  author_name TEXT,
  author_email TEXT,
  call_enterprise TEXT,
  call_person TEXT,
  call_sdr TEXT,
  call_duration TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cf.id as feedback_id,
    cf.call_id,
    cf.content,
    cf.created_at,
    cf.is_read,
    cf.author_id,

    -- Dados do autor (buscar nome real do perfil)
    COALESCE(p_author.full_name, 'Usuário') as author_name,
    COALESCE(p_author.email, '') as author_email,

    -- Dados da chamada
    COALESCE(c.enterprise, 'Empresa não informada') as call_enterprise,
    COALESCE(c.person, 'Contato não informado') as call_person,
    COALESCE(c.agent_id, 'SDR não identificado') as call_sdr,
    COALESCE(c.duration_formated, '00:00:00') as call_duration

  FROM call_feedbacks cf
  JOIN calls c ON c.id = cf.call_id
  LEFT JOIN profiles p_author ON p_author.id = cf.author_id
  WHERE (
    -- Notificações para o SDR da chamada (quando não é o autor)
    cf.sdr_id IS NOT NULL 
    AND cf.sdr_id = auth.uid()
    AND cf.author_id != auth.uid()
  )
  ORDER BY cf.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_recent_feedbacks_with_calls IS 
  'Retorna feedbacks recentes para o usuário atual (apenas notificações onde é o SDR da chamada)';

-- Garantir permissões
GRANT EXECUTE ON FUNCTION get_recent_feedbacks_with_calls(INTEGER) TO authenticated, service_role;

-- ================================================================
-- PARTE 5: VERIFICAÇÕES E TESTES
-- ================================================================

-- Verificação 1: Feedback da Hiara após correção
SELECT 
  '✅ VERIFICAÇÃO 1 - Feedback corrigido' as resultado,
  cf.id,
  cf.call_id,
  cf.sdr_id,
  cf.author_id,
  cf.content,
  cf.is_read,
  p.email as sdr_email,
  p.full_name as sdr_nome
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.sdr_id
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818';

-- Verificação 2: Estatísticas gerais
SELECT 
  '✅ VERIFICAÇÃO 2 - Estatísticas' as resultado,
  COUNT(*) as total_feedbacks,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / NULLIF(COUNT(*), 0), 2) as percentual_com_sdr_id
FROM call_feedbacks;

-- Verificação 3: Feedbacks sem sdr_id (se houver)
SELECT 
  '⚠️ VERIFICAÇÃO 3 - Feedbacks ainda sem sdr_id' as resultado,
  cf.id,
  cf.call_id,
  c.agent_id,
  c.sdr_id as call_sdr_id,
  cf.created_at
FROM call_feedbacks cf
LEFT JOIN calls c ON c.id = cf.call_id
WHERE cf.sdr_id IS NULL
ORDER BY cf.created_at DESC
LIMIT 10;

-- Verificação 4: Simular notificações da Hiara
SELECT 
  '✅ VERIFICAÇÃO 4 - Notificações que a Hiara verá' as resultado,
  cf.id as feedback_id,
  cf.content,
  cf.created_at,
  cf.is_read,
  c.enterprise,
  c.person,
  p_author.full_name as autor
FROM call_feedbacks cf
JOIN calls c ON c.id = cf.call_id
LEFT JOIN profiles p_author ON p_author.id = cf.author_id
WHERE cf.sdr_id = (SELECT id FROM profiles WHERE email ILIKE '%hiara%' LIMIT 1)
  AND cf.author_id != (SELECT id FROM profiles WHERE email ILIKE '%hiara%' LIMIT 1)
ORDER BY cf.created_at DESC
LIMIT 5;

-- Verificação 5: Testar trigger com INSERT simulado (opcional)
-- NOTA: Comente esta seção se não quiser criar feedback de teste
/*
DO $$
DECLARE
  v_test_feedback_id UUID;
  v_hiara_call_id UUID;
BEGIN
  -- Buscar uma chamada da Hiara
  SELECT c.id INTO v_hiara_call_id
  FROM calls c
  WHERE c.agent_id ILIKE '%hiara%'
  ORDER BY c.created_at DESC
  LIMIT 1;
  
  IF v_hiara_call_id IS NOT NULL THEN
    -- Inserir feedback de teste
    INSERT INTO call_feedbacks (call_id, author_id, content)
    VALUES (
      v_hiara_call_id,
      '00000000-0000-0000-0000-000000000001', -- ID de teste
      '[TESTE] Feedback de teste do trigger'
    )
    RETURNING id INTO v_test_feedback_id;
    
    -- Verificar se o sdr_id foi populado
    SELECT 
      '✅ TESTE DO TRIGGER' as resultado,
      id,
      sdr_id,
      CASE 
        WHEN sdr_id IS NOT NULL THEN '✅ Trigger funcionando!'
        ELSE '❌ Trigger não funcionou'
      END as status
    FROM call_feedbacks
    WHERE id = v_test_feedback_id;
    
    -- Limpar feedback de teste
    DELETE FROM call_feedbacks WHERE id = v_test_feedback_id;
  END IF;
END $$;
*/

-- ================================================================
-- PARTE 6: LIMPEZA E OTIMIZAÇÕES
-- ================================================================

-- Atualizar chamadas que têm agent_id mas não têm sdr_id
UPDATE calls c
SET sdr_id = get_sdr_uuid_from_email(c.agent_id)
WHERE c.sdr_id IS NULL 
  AND c.agent_id IS NOT NULL
  AND get_sdr_uuid_from_email(c.agent_id) IS NOT NULL;

-- Estatística de chamadas atualizadas
SELECT 
  '📊 CHAMADAS - Estatísticas de sdr_id' as info,
  COUNT(*) as total_chamadas,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(agent_id) as com_agent_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id
FROM calls;

-- ================================================================
-- RESULTADO FINAL ESPERADO
-- ================================================================
-- ✅ Trigger criado e funcionando
-- ✅ Função de mapeamento email→UUID operacional
-- ✅ Feedback da Hiara corrigido com sdr_id
-- ✅ Todos feedbacks antigos corrigidos
-- ✅ Novos feedbacks terão sdr_id automaticamente
-- ✅ Notificações aparecerão para os SDRs corretos
-- ✅ Chamadas atualizadas com sdr_id quando possível
-- ================================================================

-- ================================================================
-- INSTRUÇÕES DE USO
-- ================================================================
-- 1. Copie todo este script
-- 2. Acesse o Supabase Dashboard → SQL Editor
-- 3. Cole e execute o script
-- 4. Verifique os resultados das verificações
-- 5. Recarregue a página da Hiara para ver a notificação
-- ================================================================


