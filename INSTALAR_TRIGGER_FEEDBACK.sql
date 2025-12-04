-- ================================================================
-- 🔧 INSTALAR TRIGGER: Popular sdr_id automaticamente
-- ================================================================
-- Este script garante que NOVOS feedbacks terão sdr_id preenchido
-- automaticamente ao serem criados
-- ================================================================

-- ================================================================
-- PASSO 1: Criar função de mapeamento
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

COMMENT ON FUNCTION get_sdr_uuid_from_email IS 
  'Converte email (agent_id) para UUID (profiles.id)';

-- Teste da função
SELECT 
  '✅ TESTE DA FUNÇÃO' as teste,
  agent_id as email,
  get_sdr_uuid_from_email(agent_id) as uuid_encontrado,
  CASE 
    WHEN get_sdr_uuid_from_email(agent_id) IS NOT NULL THEN '✅ OK'
    ELSE '⚠️ Email sem perfil'
  END as status
FROM calls
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ================================================================
-- PASSO 2: Criar função do trigger
-- ================================================================

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
    -- Buscar dados da chamada
    SELECT c.sdr_id, c.agent_id
    INTO v_sdr_uuid, v_agent_email
    FROM calls c
    WHERE c.id = NEW.call_id;
    
    -- Prioridade 1: Usar sdr_id direto da chamada
    IF v_sdr_uuid IS NOT NULL THEN
      NEW.sdr_id := v_sdr_uuid;
      RAISE NOTICE '✅ sdr_id copiado da chamada: %', v_sdr_uuid;
    
    -- Prioridade 2: Mapear via email (agent_id)
    ELSIF v_agent_email IS NOT NULL THEN
      NEW.sdr_id := get_sdr_uuid_from_email(v_agent_email);
      
      IF NEW.sdr_id IS NOT NULL THEN
        RAISE NOTICE '✅ sdr_id mapeado via email % → %', v_agent_email, NEW.sdr_id;
      ELSE
        RAISE WARNING '⚠️ Email % não tem perfil cadastrado', v_agent_email;
      END IF;
    ELSE
      RAISE WARNING '⚠️ Chamada % sem sdr_id e sem agent_id', NEW.call_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION populate_feedback_sdr_id IS 
  'Trigger: Popula sdr_id automaticamente ao criar feedback';

-- ================================================================
-- PASSO 3: Remover trigger antigo (se existir)
-- ================================================================

DROP TRIGGER IF EXISTS trg_populate_feedback_sdr_id ON call_feedbacks;

-- ================================================================
-- PASSO 4: Criar novo trigger
-- ================================================================

CREATE TRIGGER trg_populate_feedback_sdr_id
  BEFORE INSERT ON call_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION populate_feedback_sdr_id();

-- ================================================================
-- PASSO 5: Verificar se trigger foi criado
-- ================================================================

SELECT 
  '✅ VERIFICAR TRIGGER' as verificacao,
  trigger_name,
  event_manipulation,
  action_timing,
  action_orientation,
  CASE 
    WHEN trigger_name IS NOT NULL THEN '✅ TRIGGER INSTALADO COM SUCESSO'
    ELSE '❌ ERRO - Trigger não foi criado'
  END as status
FROM information_schema.triggers
WHERE trigger_name = 'trg_populate_feedback_sdr_id';

-- ================================================================
-- PASSO 6: Testar trigger com INSERT simulado (OPCIONAL)
-- ================================================================
-- ATENÇÃO: Descomente apenas se quiser fazer um teste real
-- Este bloco cria e depois remove um feedback de teste

/*
DO $$
DECLARE
  v_test_feedback_id UUID;
  v_test_call_id UUID;
  v_test_sdr_id UUID;
BEGIN
  -- Buscar uma chamada qualquer para teste
  SELECT c.id 
  INTO v_test_call_id
  FROM calls c
  WHERE c.agent_id IS NOT NULL
  LIMIT 1;
  
  IF v_test_call_id IS NOT NULL THEN
    -- Inserir feedback de teste (sem sdr_id)
    INSERT INTO call_feedbacks (call_id, author_id, content, sdr_id)
    VALUES (
      v_test_call_id,
      '00000000-0000-0000-0000-000000000001',
      '[TESTE AUTOMÁTICO] Este feedback será removido',
      NULL  -- Propositalmente NULL para testar o trigger
    )
    RETURNING id, sdr_id INTO v_test_feedback_id, v_test_sdr_id;
    
    -- Mostrar resultado
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ TESTE DO TRIGGER CONCLUÍDO';
    RAISE NOTICE 'Feedback ID: %', v_test_feedback_id;
    RAISE NOTICE 'SDR ID populado: %', v_test_sdr_id;
    
    IF v_test_sdr_id IS NOT NULL THEN
      RAISE NOTICE '✅ SUCESSO - Trigger funcionou!';
    ELSE
      RAISE WARNING '❌ FALHA - Trigger não populou sdr_id';
    END IF;
    
    RAISE NOTICE '====================================';
    
    -- Limpar feedback de teste
    DELETE FROM call_feedbacks WHERE id = v_test_feedback_id;
    RAISE NOTICE '🧹 Feedback de teste removido';
  END IF;
END $$;
*/

-- ================================================================
-- RESULTADO ESPERADO
-- ================================================================
-- ✅ Função get_sdr_uuid_from_email criada
-- ✅ Função populate_feedback_sdr_id criada
-- ✅ Trigger trg_populate_feedback_sdr_id instalado
-- ✅ Novos feedbacks terão sdr_id automaticamente
-- ================================================================

SELECT '🎉 TRIGGER INSTALADO COM SUCESSO!' as resultado;
SELECT '📝 Próximo passo: Execute CORRIGIR_SDR_ID_MASSIVO.sql para corrigir feedbacks antigos' as proxima_acao;


