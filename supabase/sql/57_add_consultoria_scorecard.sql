-- =====================================================
-- SCRIPT: Adicionar Scorecard de Consultoria
-- OBJETIVO: Criar scorecard específico para ligações de consultoria
-- =====================================================

-- Adicionar coluna call_type_mapping na tabela scorecards se não existir
ALTER TABLE scorecards 
ADD COLUMN IF NOT EXISTS call_type_mapping TEXT[] DEFAULT '{}';

-- Inserir scorecard de Ligação - Consultoria
INSERT INTO scorecards (name, description, conversation_type, active, call_type_mapping) 
SELECT 'Ligação - Consultoria', 'Critérios específicos para análise de ligações de consultoria', 'outbound', true, ARRAY['consultoria', 'consulting']
WHERE NOT EXISTS (SELECT 1 FROM scorecards WHERE name = 'Ligação - Consultoria');

-- Inserir critérios baseados no print fornecido
DO $$
DECLARE
  scorecard_id_consultoria UUID;
BEGIN
  SELECT id INTO scorecard_id_consultoria FROM scorecards WHERE name = 'Ligação - Consultoria';
  
  IF scorecard_id_consultoria IS NOT NULL THEN
    -- ABERTURA E APRESENTAÇÃO
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'O SDR se apresentou para gerar autoridade?', 'Verificar se houve apresentação profissional adequada', 15, 2, 1
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'O SDR se apresentou para gerar autoridade?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Validou o tempo com o cliente?', 'Confirmação de disponibilidade do cliente para a conversa', 10, 3, 2
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Validou o tempo com o cliente?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Falou o objetivo da ligação?', 'Explicação clara do propósito da chamada', 10, 2, 3
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Falou o objetivo da ligação?');
    
    -- SPIN (Descoberta)
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Entendeu possíveis problemas que o cliente enfrenta na empresa?', 'Identificação de dores e desafios do cliente', 15, 3, 4
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Entendeu possíveis problemas que o cliente enfrenta na empresa?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'O vendedor conseguiu implicar em algum problema que o cliente falou?', 'Aprofundamento nas consequências dos problemas', 15, 3, 5
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'O vendedor conseguiu implicar em algum problema que o cliente falou?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'O vendedor validou se a solução atende a necessidade do cliente?', 'Confirmação de fit entre solução e necessidade', 10, 3, 6
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'O vendedor validou se a solução atende a necessidade do cliente?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Conseguiu validar o faturamento?', 'Qualificação financeira do prospect', 5, 3, 7
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Conseguiu validar o faturamento?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Validou o tamanho da equipe comercial ou número de vendedores?', 'Entendimento da estrutura comercial', 5, 3, 8
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Validou o tamanho da equipe comercial ou número de vendedores?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Entendeu o que a empresa vende?', 'Compreensão do negócio do cliente', 5, 3, 9
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Entendeu o que a empresa vende?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Validou se tem algum controle de indicadores?', 'Verificação de maturidade em gestão comercial', 5, 3, 10
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Validou se tem algum controle de indicadores?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Entendeu para qual público a empresa vende?', 'Identificação do público-alvo do cliente', 5, 3, 11
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Entendeu para qual público a empresa vende?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Entendeu os canais e como a empresa vende?', 'Compreensão dos canais de venda', 5, 3, 12
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Entendeu os canais e como a empresa vende?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Se o cliente tem vendedores, o vendedor entendeu se são internos, externos ou representantes?', 'Detalhamento da estrutura de vendas', 5, 3, 13
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Se o cliente tem vendedores, o vendedor entendeu se são internos, externos ou representantes?');
    
    -- PRÓXIMOS PASSOS
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Caso faça sentido a nossa solução ao cliente, o vendedor conseguiu sair da ligação com dia e horário para o diagnóstico comercial?', 'Agendamento efetivo do próximo passo', 15, 3, 14
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Caso faça sentido a nossa solução ao cliente, o vendedor conseguiu sair da ligação com dia e horário para o diagnóstico comercial?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Caso o vendedor consiga agendar a reunião com o especialista o vendedor confirmou dia e horário com o cliente?', 'Confirmação dupla do agendamento', 10, 3, 15
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Caso o vendedor consiga agendar a reunião com o especialista o vendedor confirmou dia e horário com o cliente?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Caso o vendedor agende a reunião com o especialista o vendedor comenta que vai enviar um invite/convite para o cliente?', 'Comunicação sobre envio de convite', 5, 3, 16
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Caso o vendedor agende a reunião com o especialista o vendedor comenta que vai enviar um invite/convite para o cliente?');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_consultoria, 'Confirmou o e-mail do cliente?', 'Validação de dados de contato', 5, 2, 17
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_consultoria AND name = 'Confirmou o e-mail do cliente?');
  END IF;
END $$;

-- Função para buscar scorecard por call_type
CREATE OR REPLACE FUNCTION get_scorecard_by_call_type(p_call_type TEXT)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  conversation_type VARCHAR(50),
  active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.conversation_type,
    s.active
  FROM scorecards s
  WHERE s.active = true 
  AND (
    p_call_type = ANY(s.call_type_mapping) 
    OR s.conversation_type = 'all'
    OR (p_call_type = 'inbound' AND s.conversation_type = 'inbound')
    OR (p_call_type = 'outbound' AND s.conversation_type = 'outbound')
  )
  ORDER BY 
    CASE WHEN p_call_type = ANY(s.call_type_mapping) THEN 1 ELSE 2 END,
    s.name
  LIMIT 1;
END;
$$;

-- Grant para a nova função
GRANT EXECUTE ON FUNCTION get_scorecard_by_call_type(TEXT) TO authenticated;

-- Verificar resultado
SELECT 
  s.name as scorecard_name,
  s.conversation_type,
  s.call_type_mapping,
  COUNT(sc.id) as criteria_count,
  SUM(sc.weight) as total_weight
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
GROUP BY s.id, s.name, s.conversation_type, s.call_type_mapping
ORDER BY s.name;

COMMIT;
