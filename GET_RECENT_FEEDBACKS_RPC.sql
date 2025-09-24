-- 🔔 RPC PARA BUSCAR FEEDBACKS RECENTES COM DADOS DAS CHAMADAS
-- Execute no Supabase SQL Editor

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
    -- Entregar ao SDR da chamada quando o sdr_id do feedback existir
    (cf.sdr_id IS NOT NULL AND cf.sdr_id = auth.uid())
    -- Curto prazo: também permitir que o autor veja o que escreveu
    OR (cf.author_id = auth.uid())
  )
  ORDER BY cf.created_at DESC
  LIMIT p_limit;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION get_recent_feedbacks_with_calls(INTEGER) TO authenticated, service_role;

-- Testar a função
SELECT 
  feedback_id,
  content,
  author_name,
  call_enterprise,
  call_person,
  is_read,
  created_at
FROM get_recent_feedbacks_with_calls(10)
ORDER BY created_at DESC;
