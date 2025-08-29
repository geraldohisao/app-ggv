-- =====================================================
-- SCRIPT: Implementar Scorecards Reais
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
INSERT INTO scorecards (name, description, conversation_type, active) 
SELECT 'Prospecção Outbound', 'Critérios para avaliação de chamadas de prospecção ativa', 'outbound', true
WHERE NOT EXISTS (SELECT 1 FROM scorecards WHERE name = 'Prospecção Outbound')
UNION ALL
SELECT 'Atendimento Inbound', 'Critérios para avaliação de chamadas de entrada', 'inbound', true
WHERE NOT EXISTS (SELECT 1 FROM scorecards WHERE name = 'Atendimento Inbound')
UNION ALL
SELECT 'Avaliação Geral', 'Critérios gerais para qualquer tipo de chamada', 'all', true
WHERE NOT EXISTS (SELECT 1 FROM scorecards WHERE name = 'Avaliação Geral');

-- Inserir critérios usando subquery para encontrar os IDs dos scorecards (apenas se não existirem)
-- Critérios para scorecard de prospecção outbound
INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index) 
SELECT s.id, 'Abertura Profissional', 'Apresentação clara e profissional no início da chamada', 15, 10, 1
FROM scorecards s WHERE s.name = 'Prospecção Outbound'
AND NOT EXISTS (SELECT 1 FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id AND sc.name = 'Abertura Profissional')
UNION ALL
SELECT s.id, 'Descoberta de Necessidades', 'Capacidade de identificar dores e necessidades do prospect', 25, 10, 2
FROM scorecards s WHERE s.name = 'Prospecção Outbound'
AND NOT EXISTS (SELECT 1 FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id AND sc.name = 'Descoberta de Necessidades')
UNION ALL
SELECT s.id, 'Apresentação da Solução', 'Apresentação clara e direcionada da proposta', 20, 10, 3
FROM scorecards s WHERE s.name = 'Prospecção Outbound'
AND NOT EXISTS (SELECT 1 FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id AND sc.name = 'Apresentação da Solução')
UNION ALL
SELECT s.id, 'Tratamento de Objeções', 'Habilidade para contornar objeções e resistências', 20, 10, 4
FROM scorecards s WHERE s.name = 'Prospecção Outbound'
AND NOT EXISTS (SELECT 1 FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id AND sc.name = 'Tratamento de Objeções')
UNION ALL
SELECT s.id, 'Fechamento/Próximos Passos', 'Definição clara dos próximos passos', 15, 10, 5
FROM scorecards s WHERE s.name = 'Prospecção Outbound'
AND NOT EXISTS (SELECT 1 FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id AND sc.name = 'Fechamento/Próximos Passos')
UNION ALL
SELECT s.id, 'Tom e Postura', 'Profissionalismo e confiança durante a chamada', 5, 10, 6
FROM scorecards s WHERE s.name = 'Prospecção Outbound'
AND NOT EXISTS (SELECT 1 FROM scorecard_criteria sc WHERE sc.scorecard_id = s.id AND sc.name = 'Tom e Postura');

-- Critérios para scorecard de atendimento inbound
INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index) 
SELECT s.id, 'Atendimento Inicial', 'Rapidez e cordialidade no atendimento', 20, 10, 1
FROM scorecards s WHERE s.name = 'Atendimento Inbound'
UNION ALL
SELECT s.id, 'Identificação da Necessidade', 'Compreensão clara do motivo da ligação', 25, 10, 2
FROM scorecards s WHERE s.name = 'Atendimento Inbound'
UNION ALL
SELECT s.id, 'Resolução do Problema', 'Capacidade de resolver ou encaminhar adequadamente', 30, 10, 3
FROM scorecards s WHERE s.name = 'Atendimento Inbound'
UNION ALL
SELECT s.id, 'Satisfação do Cliente', 'Garantia de que o cliente ficou satisfeito', 15, 10, 4
FROM scorecards s WHERE s.name = 'Atendimento Inbound'
UNION ALL
SELECT s.id, 'Profissionalismo', 'Postura profissional durante todo o atendimento', 10, 10, 5
FROM scorecards s WHERE s.name = 'Atendimento Inbound';

-- Critérios para scorecard geral
INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index) 
SELECT s.id, 'Comunicação Clara', 'Clareza na comunicação e linguagem adequada', 20, 10, 1
FROM scorecards s WHERE s.name = 'Avaliação Geral'
UNION ALL
SELECT s.id, 'Escuta Ativa', 'Demonstração de que está ouvindo e compreendendo', 20, 10, 2
FROM scorecards s WHERE s.name = 'Avaliação Geral'
UNION ALL
SELECT s.id, 'Conhecimento do Produto', 'Domínio sobre produtos/serviços oferecidos', 25, 10, 3
FROM scorecards s WHERE s.name = 'Avaliação Geral'
UNION ALL
SELECT s.id, 'Relacionamento', 'Capacidade de criar rapport e conexão', 15, 10, 4
FROM scorecards s WHERE s.name = 'Avaliação Geral'
UNION ALL
SELECT s.id, 'Eficiência', 'Uso eficiente do tempo da chamada', 10, 10, 5
FROM scorecards s WHERE s.name = 'Avaliação Geral'
UNION ALL
SELECT s.id, 'Follow-up', 'Definição de próximos passos ou follow-up', 10, 10, 6
FROM scorecards s WHERE s.name = 'Avaliação Geral';

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

COMMIT;
