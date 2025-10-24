-- ================================================================
-- 🔧 FIX: Mostrar nome real do autor nas notificações
-- ================================================================
-- Problema: Notificações mostram "Usuário" ao invés do nome real
-- Solução: Fazer JOIN com profiles para buscar author_name correto
-- ================================================================

-- Atualizar função RPC para buscar nome real do autor
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

    -- ✅ CORREÇÃO: Buscar nome real do autor da tabela profiles
    COALESCE(
      p_author.full_name,
      p_author.email,
      CASE
        WHEN cf.author_id = '00000000-0000-0000-0000-000000000001'::uuid THEN 'Sistema'
        ELSE 'Usuário'
      END
    ) as author_name,

    -- ✅ CORREÇÃO: Buscar email real do autor
    COALESCE(
      p_author.email,
      CASE
        WHEN cf.author_id = '00000000-0000-0000-0000-000000000001'::uuid THEN 'sistema@grupoggv.com'
        ELSE ''
      END
    ) as author_email,

    -- Dados da chamada
    COALESCE(c.enterprise, 'Empresa não informada') as call_enterprise,
    COALESCE(c.person, 'Contato não informado') as call_person,
    COALESCE(c.agent_id, 'SDR não identificado') as call_sdr,
    COALESCE(c.duration_formated, '00:00:00') as call_duration

  FROM call_feedbacks cf
  JOIN calls c ON c.id = cf.call_id
  -- ✅ JOIN com profiles para buscar dados do autor
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
  'Retorna feedbacks recentes com nome REAL do autor (profiles.full_name)';

-- Garantir permissões
GRANT EXECUTE ON FUNCTION get_recent_feedbacks_with_calls(INTEGER) TO authenticated, service_role;

-- ================================================================
-- ✅ TESTAR A CORREÇÃO
-- ================================================================

-- Ver como ficaram as notificações agora (simular como Hiara)
SELECT 
  '✅ NOTIFICAÇÕES COM NOME REAL' as teste,
  feedback_id,
  content,
  author_name,  -- ✅ Deve mostrar nome real agora
  author_email,
  call_enterprise,
  is_read,
  created_at
FROM get_recent_feedbacks_with_calls(10)
ORDER BY created_at DESC;

-- ================================================================
-- VERIFICAR DADOS DOS AUTORES
-- ================================================================

-- Ver quem são os autores dos feedbacks
SELECT 
  '📋 AUTORES DOS FEEDBACKS' as info,
  cf.id as feedback_id,
  cf.content,
  cf.author_id,
  p.full_name as nome_autor,
  p.email as email_autor,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Perfil encontrado'
    ELSE '⚠️ Autor sem perfil'
  END as status
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.author_id
ORDER BY cf.created_at DESC;

-- ================================================================
-- RESULTADO ESPERADO
-- ================================================================
-- ✅ Função RPC atualizada
-- ✅ Nome real do autor aparecendo nas notificações
-- ✅ Se autor não tiver perfil, mostra "Usuário"
-- ================================================================

SELECT '🎉 CORREÇÃO APLICADA! Recarregue a página para ver os nomes reais.' as resultado;

