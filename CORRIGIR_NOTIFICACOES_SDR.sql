-- 🔔 CORRIGIR SISTEMA DE NOTIFICAÇÕES PARA SDR DA CHAMADA
-- Execute no Supabase SQL Editor

-- 1. Atualizar função RPC para filtrar por SDR da chamada
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
    -- NOTIFICAÇÃO VAI PARA O SDR DA CHAMADA (quando sdr_id preenchido)
    (cf.sdr_id IS NOT NULL AND cf.sdr_id = auth.uid())
    -- OU para o autor (para ver o que escreveu)
    OR (cf.author_id = auth.uid())
  )
  ORDER BY cf.created_at DESC
  LIMIT p_limit;
$$;

-- 2. Preencher sdr_id nos feedbacks existentes com o sdr_id da chamada
UPDATE call_feedbacks cf
SET sdr_id = c.sdr_id
FROM calls c
WHERE cf.call_id = c.id
  AND cf.sdr_id IS NULL
  AND c.sdr_id IS NOT NULL;

-- 3. Para chamadas sem sdr_id, usar um UUID padrão baseado no agent_id
-- (isso garante que feedbacks antigos tenham um destinatário)
UPDATE call_feedbacks cf
SET sdr_id = '00000000-0000-0000-0000-000000000001'::uuid -- UUID administrativo
FROM calls c
WHERE cf.call_id = c.id
  AND cf.sdr_id IS NULL
  AND c.sdr_id IS NULL;

-- 4. Verificar resultado
SELECT 
  'Feedbacks com sdr_id preenchido' as status,
  COUNT(*) as total
FROM call_feedbacks 
WHERE sdr_id IS NOT NULL

UNION ALL

SELECT 
  'Feedbacks sem sdr_id' as status,
  COUNT(*) as total
FROM call_feedbacks 
WHERE sdr_id IS NULL;

-- 5. Testar a função (deve retornar apenas feedbacks para o usuário logado)
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

