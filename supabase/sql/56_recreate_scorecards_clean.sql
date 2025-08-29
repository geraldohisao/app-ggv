-- =====================================================
-- SCRIPT: Recriar Scorecards Limpo
-- OBJETIVO: Remover tabelas existentes e criar novas
-- =====================================================

-- Remover tabelas existentes (se existirem)
DROP TABLE IF EXISTS scorecard_criteria CASCADE;
DROP TABLE IF EXISTS scorecards CASCADE;

-- Remover funções existentes (se existirem)
DROP FUNCTION IF EXISTS get_active_scorecards() CASCADE;
DROP FUNCTION IF EXISTS get_scorecard_criteria(UUID) CASCADE;

-- Criar tabela de scorecards
CREATE TABLE scorecards (
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
CREATE TABLE scorecard_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID REFERENCES scorecards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 10, -- Peso do critério (0-100)
  max_score INTEGER NOT NULL DEFAULT 10, -- Pontuação máxima
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir scorecards padrão
INSERT INTO scorecards (name, description, conversation_type, active) VALUES 
('Prospecção Outbound', 'Critérios para avaliação de chamadas de prospecção ativa', 'outbound', true),
('Atendimento Inbound', 'Critérios para avaliação de chamadas de entrada', 'inbound', true),
('Avaliação Geral', 'Critérios gerais para qualquer tipo de chamada', 'all', true);

-- Inserir critérios para scorecard de prospecção outbound
INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
SELECT 
  s.id,
  criteria.name,
  criteria.description,
  criteria.weight,
  criteria.max_score,
  criteria.order_index
FROM scorecards s
CROSS JOIN (
  VALUES 
    ('Abertura Profissional', 'Apresentação clara e profissional no início da chamada', 15, 10, 1),
    ('Descoberta de Necessidades', 'Capacidade de identificar dores e necessidades do prospect', 25, 10, 2),
    ('Apresentação da Solução', 'Apresentação clara e direcionada da proposta', 20, 10, 3),
    ('Tratamento de Objeções', 'Habilidade para contornar objeções e resistências', 20, 10, 4),
    ('Fechamento/Próximos Passos', 'Definição clara dos próximos passos', 15, 10, 5),
    ('Tom e Postura', 'Profissionalismo e confiança durante a chamada', 5, 10, 6)
) AS criteria(name, description, weight, max_score, order_index)
WHERE s.name = 'Prospecção Outbound';

-- Inserir critérios para scorecard de atendimento inbound
INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
SELECT 
  s.id,
  criteria.name,
  criteria.description,
  criteria.weight,
  criteria.max_score,
  criteria.order_index
FROM scorecards s
CROSS JOIN (
  VALUES 
    ('Atendimento Inicial', 'Rapidez e cordialidade no atendimento', 20, 10, 1),
    ('Identificação da Necessidade', 'Compreensão clara do motivo da ligação', 25, 10, 2),
    ('Resolução do Problema', 'Capacidade de resolver ou encaminhar adequadamente', 30, 10, 3),
    ('Satisfação do Cliente', 'Garantia de que o cliente ficou satisfeito', 15, 10, 4),
    ('Profissionalismo', 'Postura profissional durante todo o atendimento', 10, 10, 5)
) AS criteria(name, description, weight, max_score, order_index)
WHERE s.name = 'Atendimento Inbound';

-- Inserir critérios para scorecard geral
INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index)
SELECT 
  s.id,
  criteria.name,
  criteria.description,
  criteria.weight,
  criteria.max_score,
  criteria.order_index
FROM scorecards s
CROSS JOIN (
  VALUES 
    ('Comunicação Clara', 'Clareza na comunicação e linguagem adequada', 20, 10, 1),
    ('Escuta Ativa', 'Demonstração de que está ouvindo e compreendendo', 20, 10, 2),
    ('Conhecimento do Produto', 'Domínio sobre produtos/serviços oferecidos', 25, 10, 3),
    ('Relacionamento', 'Capacidade de criar rapport e conexão', 15, 10, 4),
    ('Eficiência', 'Uso eficiente do tempo da chamada', 10, 10, 5),
    ('Follow-up', 'Definição de próximos passos ou follow-up', 10, 10, 6)
) AS criteria(name, description, weight, max_score, order_index)
WHERE s.name = 'Avaliação Geral';

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
CREATE POLICY "Allow read scorecards" ON scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read scorecard_criteria" ON scorecard_criteria FOR SELECT TO authenticated USING (true);

-- Grants
GRANT EXECUTE ON FUNCTION get_active_scorecards() TO authenticated;
GRANT EXECUTE ON FUNCTION get_scorecard_criteria(UUID) TO authenticated;

-- Verificar resultado final
SELECT 
  s.name as scorecard_name,
  s.conversation_type,
  s.active,
  COUNT(sc.id) as criteria_count,
  SUM(sc.weight) as total_weight
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
GROUP BY s.id, s.name, s.conversation_type, s.active
ORDER BY s.name;

-- Mostrar alguns critérios como exemplo
SELECT 
  s.name as scorecard_name,
  sc.name as criteria_name,
  sc.weight,
  sc.order_index
FROM scorecards s
JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
ORDER BY s.name, sc.order_index
LIMIT 10;

COMMIT;
