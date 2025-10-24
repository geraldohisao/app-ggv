-- ================================================================
-- 🔧 SOLUÇÃO ALTERNATIVA: Mapear agent_id → sdr_id
-- ================================================================
-- Problema: agent_id parece ser NOME ao invés de EMAIL
-- Tentaremos múltiplas estratégias de mapeamento
-- ================================================================

-- ================================================================
-- ESTRATÉGIA 1: Criar função de mapeamento por NOME
-- ================================================================

CREATE OR REPLACE FUNCTION get_sdr_uuid_from_name(p_name TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  -- Buscar por correspondência de nome (case insensitive)
  SELECT id 
  FROM profiles 
  WHERE 
    full_name ILIKE p_name
    OR full_name ILIKE '%' || p_name || '%'
    OR p_name ILIKE '%' || full_name || '%'
  ORDER BY 
    CASE 
      WHEN full_name ILIKE p_name THEN 1  -- Match exato
      WHEN full_name ILIKE p_name || '%' THEN 2  -- Começa com
      WHEN full_name ILIKE '%' || p_name THEN 3  -- Termina com
      ELSE 4  -- Match parcial
    END
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_sdr_uuid_from_name IS 
  'Mapeia nome (agent_id) para UUID do perfil via full_name';

-- ================================================================
-- ESTRATÉGIA 2: Criar função híbrida (email OU nome)
-- ================================================================

CREATE OR REPLACE FUNCTION get_sdr_uuid_smart(p_identifier TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    -- Tentar como email
    (SELECT id FROM profiles WHERE email = p_identifier LIMIT 1),
    -- Tentar como nome exato
    (SELECT id FROM profiles WHERE full_name ILIKE p_identifier LIMIT 1),
    -- Tentar busca parcial por nome
    (SELECT id FROM profiles WHERE full_name ILIKE '%' || p_identifier || '%' LIMIT 1),
    -- Tentar busca reversa
    (SELECT id FROM profiles WHERE p_identifier ILIKE '%' || full_name || '%' LIMIT 1)
  );
$$;

COMMENT ON FUNCTION get_sdr_uuid_smart IS 
  'Mapeia agent_id → UUID tentando email primeiro, depois nome';

-- ================================================================
-- ESTRATÉGIA 3: Testar mapeamento dos SDRs principais
-- ================================================================

SELECT 
  '🧪 TESTE DE MAPEAMENTO' as teste,
  agent_id,
  get_sdr_uuid_smart(agent_id) as uuid_encontrado,
  (SELECT full_name FROM profiles WHERE id = get_sdr_uuid_smart(agent_id)) as nome_perfil,
  CASE 
    WHEN get_sdr_uuid_smart(agent_id) IS NOT NULL THEN '✅ MAPEADO'
    ELSE '❌ NÃO MAPEADO'
  END as status,
  COUNT(*) as chamadas
FROM calls
WHERE agent_id IN (
  'Hiara Saienne',
  'Mariana Costa',
  'Camila Ataliba',
  'Andressa Habinoski',
  'Lô-Ruama Oliveira'
)
GROUP BY agent_id, get_sdr_uuid_smart(agent_id)
ORDER BY COUNT(*) DESC;

-- ================================================================
-- ESTRATÉGIA 4: Se mapeamento funcionar, atualizar trigger
-- ================================================================

CREATE OR REPLACE FUNCTION populate_feedback_sdr_id_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sdr_uuid UUID;
  v_agent_identifier TEXT;
BEGIN
  -- Só processar se sdr_id não foi fornecido
  IF NEW.sdr_id IS NULL THEN
    -- Buscar identificador da chamada
    SELECT c.sdr_id, c.agent_id
    INTO v_sdr_uuid, v_agent_identifier
    FROM calls c
    WHERE c.id = NEW.call_id;
    
    -- Prioridade 1: sdr_id direto da chamada
    IF v_sdr_uuid IS NOT NULL THEN
      NEW.sdr_id := v_sdr_uuid;
      RAISE NOTICE '✅ sdr_id da chamada: %', v_sdr_uuid;
    
    -- Prioridade 2: Mapeamento inteligente (email OU nome)
    ELSIF v_agent_identifier IS NOT NULL THEN
      NEW.sdr_id := get_sdr_uuid_smart(v_agent_identifier);
      
      IF NEW.sdr_id IS NOT NULL THEN
        RAISE NOTICE '✅ sdr_id via mapeamento inteligente: % → %', 
          v_agent_identifier, NEW.sdr_id;
      ELSE
        RAISE WARNING '⚠️ Não foi possível mapear: %', v_agent_identifier;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ================================================================
-- ESTRATÉGIA 5: Atualizar trigger com nova função
-- ================================================================

DROP TRIGGER IF EXISTS trg_populate_feedback_sdr_id ON call_feedbacks;

CREATE TRIGGER trg_populate_feedback_sdr_id
  BEFORE INSERT ON call_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION populate_feedback_sdr_id_v2();

-- ================================================================
-- ESTRATÉGIA 6: Atualizar chamadas usando mapeamento inteligente
-- ================================================================

UPDATE calls c
SET sdr_id = get_sdr_uuid_smart(c.agent_id)
WHERE c.sdr_id IS NULL
  AND c.agent_id IS NOT NULL
  AND get_sdr_uuid_smart(c.agent_id) IS NOT NULL;

-- Verificar quantas chamadas foram atualizadas
SELECT 
  '✅ CHAMADAS ATUALIZADAS (V2)' as resultado,
  COUNT(*) as total_atualizado
FROM calls
WHERE sdr_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '10 seconds';

-- ================================================================
-- ESTRATÉGIA 7: Atualizar feedbacks usando mapeamento inteligente
-- ================================================================

WITH feedback_mapping AS (
  SELECT 
    cf.id as feedback_id,
    COALESCE(
      c.sdr_id,
      get_sdr_uuid_smart(c.agent_id)
    ) as mapped_sdr_id
  FROM call_feedbacks cf
  JOIN calls c ON c.id = cf.call_id
  WHERE cf.sdr_id IS NULL
)
UPDATE call_feedbacks cf
SET sdr_id = fm.mapped_sdr_id
FROM feedback_mapping fm
WHERE cf.id = fm.feedback_id
  AND fm.mapped_sdr_id IS NOT NULL;

-- ================================================================
-- ESTRATÉGIA 8: Verificar resultado final
-- ================================================================

SELECT 
  '📊 RESULTADO FINAL' as etapa,
  'Chamadas' as tabela,
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / NULLIF(COUNT(*), 0), 1) || '%' as percentual
FROM calls

UNION ALL

SELECT 
  '📊 RESULTADO FINAL' as etapa,
  'Feedbacks' as tabela,
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as sem_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / NULLIF(COUNT(*), 0), 1) || '%' as percentual
FROM call_feedbacks;

-- ================================================================
-- ESTRATÉGIA 9: Verificar feedback específico da Hiara
-- ================================================================

SELECT 
  '🎯 FEEDBACK DA HIARA (APÓS V2)' as status,
  cf.id,
  cf.sdr_id,
  p.full_name as sdr_nome,
  p.email as sdr_email,
  CASE 
    WHEN cf.sdr_id IS NOT NULL THEN '✅ SUCESSO'
    ELSE '❌ AINDA SEM SDR_ID'
  END as resultado
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.sdr_id
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818';

-- ================================================================
-- ESTRATÉGIA 10: Listar mapeamentos bem-sucedidos
-- ================================================================

SELECT 
  '✅ MAPEAMENTOS BEM-SUCEDIDOS' as info,
  c.agent_id,
  p.full_name as perfil_encontrado,
  p.email,
  COUNT(DISTINCT c.id) as chamadas_mapeadas
FROM calls c
JOIN profiles p ON p.id = c.sdr_id
WHERE c.agent_id IS NOT NULL
  AND c.agent_id NOT LIKE '%@%'  -- Não é email
GROUP BY c.agent_id, p.full_name, p.email
ORDER BY COUNT(DISTINCT c.id) DESC
LIMIT 20;

-- ================================================================
-- ESTRATÉGIA 11: Listar agent_ids que AINDA não foram mapeados
-- ================================================================

SELECT 
  '⚠️ AINDA NÃO MAPEADOS' as problema,
  c.agent_id,
  COUNT(*) as quantidade_chamadas,
  get_sdr_uuid_smart(c.agent_id) as tentativa_mapeamento
FROM calls c
WHERE c.sdr_id IS NULL
  AND c.agent_id IS NOT NULL
GROUP BY c.agent_id
ORDER BY COUNT(*) DESC
LIMIT 20;

-- ================================================================
-- RESULTADO ESPERADO
-- ================================================================
-- ✅ Mapeamento inteligente criado
-- ✅ Chamadas atualizadas com novos mapeamentos
-- ✅ Feedbacks atualizados
-- ✅ Feedback da Hiara com sdr_id
-- ================================================================

