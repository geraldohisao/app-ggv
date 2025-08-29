-- =====================================================
-- SCRIPT: Implementar Scorecards Reais (VERSÃO CORRIGIDA)
-- OBJETIVO: Criar sistema completo de scorecards
-- =====================================================

-- Criar tabela de scorecards se não existir
CREATE TABLE IF NOT EXISTS scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  conversation_type VARCHAR(50) DEFAULT 'all', -- 'inbound', 'outbound', 'all'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela de critérios de scorecard
CREATE TABLE IF NOT EXISTS scorecard_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID REFERENCES scorecards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 10, -- Peso do critério (0-100)
  max_score INTEGER NOT NULL DEFAULT 10, -- Pontuação máxima
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir scorecards padrão (apenas se não existirem)
DO $$
BEGIN
  -- Scorecard Outbound
  IF NOT EXISTS (SELECT 1 FROM scorecards WHERE name = 'Prospecção Outbound') THEN
    INSERT INTO scorecards (name, description, conversation_type, active) 
    VALUES ('Prospecção Outbound', 'Critérios para avaliação de chamadas de prospecção ativa', 'outbound', true);
  END IF;
  
  -- Scorecard Inbound
  IF NOT EXISTS (SELECT 1 FROM scorecards WHERE name = 'Atendimento Inbound') THEN
    INSERT INTO scorecards (name, description, conversation_type, active) 
    VALUES ('Atendimento Inbound', 'Critérios para avaliação de chamadas de entrada', 'inbound', true);
  END IF;
  
  -- Scorecard Geral
  IF NOT EXISTS (SELECT 1 FROM scorecards WHERE name = 'Avaliação Geral') THEN
    INSERT INTO scorecards (name, description, conversation_type, active) 
    VALUES ('Avaliação Geral', 'Critérios gerais para qualquer tipo de chamada', 'all', true);
  END IF;
END $$;

-- Inserir critérios para scorecard de prospecção outbound
DO $$
DECLARE
  scorecard_id_outbound UUID;
BEGIN
  SELECT id INTO scorecard_id_outbound FROM scorecards WHERE name = 'Prospecção Outbound';
  
  IF scorecard_id_outbound IS NOT NULL THEN
    -- Inserir critérios apenas se não existirem
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_outbound, 'Abertura Profissional', 'Apresentação clara e profissional no início da chamada', 15, 10, 1
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_outbound AND name = 'Abertura Profissional');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_outbound, 'Descoberta de Necessidades', 'Capacidade de identificar dores e necessidades do prospect', 25, 10, 2
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_outbound AND name = 'Descoberta de Necessidades');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_outbound, 'Apresentação da Solução', 'Apresentação clara e direcionada da proposta', 20, 10, 3
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_outbound AND name = 'Apresentação da Solução');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_outbound, 'Tratamento de Objeções', 'Habilidade para contornar objeções e resistências', 20, 10, 4
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_outbound AND name = 'Tratamento de Objeções');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_outbound, 'Fechamento/Próximos Passos', 'Definição clara dos próximos passos', 15, 10, 5
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_outbound AND name = 'Fechamento/Próximos Passos');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_outbound, 'Tom e Postura', 'Profissionalismo e confiança durante a chamada', 5, 10, 6
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_outbound AND name = 'Tom e Postura');
  END IF;
END $$;

-- Inserir critérios para scorecard de atendimento inbound
DO $$
DECLARE
  scorecard_id_inbound UUID;
BEGIN
  SELECT id INTO scorecard_id_inbound FROM scorecards WHERE name = 'Atendimento Inbound';
  
  IF scorecard_id_inbound IS NOT NULL THEN
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_inbound, 'Atendimento Inicial', 'Rapidez e cordialidade no atendimento', 20, 10, 1
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_inbound AND name = 'Atendimento Inicial');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_inbound, 'Identificação da Necessidade', 'Compreensão clara do motivo da ligação', 25, 10, 2
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_inbound AND name = 'Identificação da Necessidade');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_inbound, 'Resolução do Problema', 'Capacidade de resolver ou encaminhar adequadamente', 30, 10, 3
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_inbound AND name = 'Resolução do Problema');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_inbound, 'Satisfação do Cliente', 'Garantia de que o cliente ficou satisfeito', 15, 10, 4
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_inbound AND name = 'Satisfação do Cliente');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_inbound, 'Profissionalismo', 'Postura profissional durante todo o atendimento', 10, 10, 5
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_inbound AND name = 'Profissionalismo');
  END IF;
END $$;

-- Inserir critérios para scorecard geral
DO $$
DECLARE
  scorecard_id_general UUID;
BEGIN
  SELECT id INTO scorecard_id_general FROM scorecards WHERE name = 'Avaliação Geral';
  
  IF scorecard_id_general IS NOT NULL THEN
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_general, 'Comunicação Clara', 'Clareza na comunicação e linguagem adequada', 20, 10, 1
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_general AND name = 'Comunicação Clara');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_general, 'Escuta Ativa', 'Demonstração de que está ouvindo e compreendendo', 20, 10, 2
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_general AND name = 'Escuta Ativa');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_general, 'Conhecimento do Produto', 'Domínio sobre produtos/serviços oferecidos', 25, 10, 3
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_general AND name = 'Conhecimento do Produto');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_general, 'Relacionamento', 'Capacidade de criar rapport e conexão', 15, 10, 4
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_general AND name = 'Relacionamento');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_general, 'Eficiência', 'Uso eficiente do tempo da chamada', 10, 10, 5
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_general AND name = 'Eficiência');
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
    SELECT scorecard_id_general, 'Follow-up', 'Definição de próximos passos ou follow-up', 10, 10, 6
    WHERE NOT EXISTS (SELECT 1 FROM scorecard_criteria WHERE scorecard_id = scorecard_id_general AND name = 'Follow-up');
  END IF;
END $$;

-- Função para buscar scorecards ativos
CREATE OR REPLACE FUNCTION get_active_scorecards()
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  conversation_type VARCHAR(50),
  active BOOLEAN,
  criteria_count BIGINT,
  total_weight INTEGER
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
    s.active,
    COUNT(sc.id) as criteria_count,
    COALESCE(SUM(sc.weight), 0)::INTEGER as total_weight
  FROM scorecards s
  LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
  WHERE s.active = true
  GROUP BY s.id, s.name, s.description, s.conversation_type, s.active
  ORDER BY s.name;
END;
$$;

-- Função para buscar critérios de um scorecard
CREATE OR REPLACE FUNCTION get_scorecard_criteria(p_scorecard_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  weight INTEGER,
  max_score INTEGER,
  order_index INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.name,
    sc.description,
    sc.weight,
    sc.max_score,
    sc.order_index
  FROM scorecard_criteria sc
  WHERE sc.scorecard_id = p_scorecard_id
  ORDER BY sc.order_index, sc.name;
END;
$$;

-- Habilitar RLS
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_criteria ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir leitura para usuários autenticados)
DROP POLICY IF EXISTS "Allow read scorecards" ON scorecards;
CREATE POLICY "Allow read scorecards" ON scorecards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read scorecard_criteria" ON scorecard_criteria;
CREATE POLICY "Allow read scorecard_criteria" ON scorecard_criteria FOR SELECT TO authenticated USING (true);

-- Grants
GRANT EXECUTE ON FUNCTION get_active_scorecards() TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_criteria(UUID) TO authenticated;

-- Verificar dados inseridos
SELECT 
  s.name as scorecard_name,
  s.conversation_type,
  COUNT(sc.id) as criteria_count,
  SUM(sc.weight) as total_weight
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
GROUP BY s.id, s.name, s.conversation_type
ORDER BY s.name;

COMMIT;
