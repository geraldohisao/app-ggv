-- 🔔 CORREÇÃO FINAL: NOTIFICAÇÕES APENAS PARA SDR DA CHAMADA
-- Execute no Supabase SQL Editor

-- 1. Atualizar função RPC - APENAS para SDR da chamada (remover autor)
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

    -- Dados do autor do feedback
    CASE
      WHEN cf.author_id = '00000000-0000-0000-0000-000000000001'::uuid THEN 'Sistema'
      ELSE 'Usuário'
    END as author_name,

    CASE
      WHEN cf.author_id = '00000000-0000-0000-0000-000000000001'::uuid THEN 'sistema@grupoggv.com'
      ELSE ''
    END as author_email,

    -- Dados da chamada
    COALESCE(c.enterprise, 'Empresa não informada') as call_enterprise,
    COALESCE(c.person, 'Contato não informado') as call_person,
    COALESCE(c.agent_id, 'SDR não identificado') as call_sdr,
    COALESCE(c.duration_formated, '00:00:00') as call_duration

  FROM call_feedbacks cf
  JOIN calls c ON c.id = cf.call_id
  WHERE (
    -- APENAS NOTIFICAÇÕES PARA O SDR DA CHAMADA
    cf.sdr_id IS NOT NULL 
    AND cf.sdr_id = auth.uid()
    -- E não é o próprio autor (evitar auto-notificação)
    AND cf.author_id != auth.uid()
  )
  ORDER BY cf.created_at DESC
  LIMIT p_limit;
$$;

-- 2. Marcar como lidas as notificações que você mesmo criou
UPDATE call_feedbacks 
SET is_read = true 
WHERE author_id = auth.uid();

-- 3. Verificar quantas notificações restam
SELECT 
  'Notificações para você (como SDR)' as tipo,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = false) as nao_lidas
FROM call_feedbacks cf
WHERE cf.sdr_id = auth.uid() 
  AND cf.author_id != auth.uid()

UNION ALL

SELECT 
  'Feedbacks que você escreveu' as tipo,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = false) as nao_lidas
FROM call_feedbacks cf
WHERE cf.author_id = auth.uid();

-- 4. Testar a função (deve retornar apenas feedbacks de outros para suas chamadas)
SELECT 
  feedback_id,
  content,
  author_name,
  call_enterprise,
  is_read,
  created_at
FROM get_recent_feedbacks_with_calls(10)
ORDER BY created_at DESC;

