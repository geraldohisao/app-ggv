-- SETUP RÁPIDO - APENAS SCORECARD BÁSICO
-- Copie e cole este conteúdo inteiro no Supabase SQL Editor

-- 1. Criar scorecard
INSERT INTO scorecards (name, description, conversation_type, active) 
VALUES ('Scorecard Vendas GGV', 'Avaliação padrão GGV', 'prospecting', true) 
ON CONFLICT (name) DO UPDATE SET active = EXCLUDED.active;

-- 2. Criar critérios
DO $$
DECLARE v_scorecard_id UUID;
BEGIN
    SELECT id INTO v_scorecard_id FROM scorecards WHERE name = 'Scorecard Vendas GGV' LIMIT 1;
    DELETE FROM scorecard_criteria WHERE scorecard_id = v_scorecard_id;
    
    INSERT INTO scorecard_criteria (scorecard_id, name, description, weight, max_score, order_index) VALUES 
    (v_scorecard_id, 'Apresentação', 'SDR se apresenta adequadamente', 20, 10, 1),
    (v_scorecard_id, 'Descoberta', 'Faz perguntas sobre necessidades', 30, 10, 2),
    (v_scorecard_id, 'Proposta', 'Apresenta soluções conectadas', 25, 10, 3),
    (v_scorecard_id, 'Objeções', 'Responde adequadamente', 15, 10, 4),
    (v_scorecard_id, 'Próximos Passos', 'Define follow-up', 10, 10, 5);
END $$;

-- 3. Criar tabelas de análise
CREATE TABLE IF NOT EXISTS call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  scorecard_id UUID REFERENCES scorecards(id),
  overall_score INTEGER DEFAULT 0,
  max_possible_score INTEGER DEFAULT 0,
  final_grade DECIMAL(3,1) DEFAULT 0.0,
  general_feedback TEXT,
  strengths TEXT[],
  improvements TEXT[],
  confidence DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id, scorecard_id)
);

-- 4. Verificar resultado
SELECT 'Sistema configurado!' as resultado;
SELECT s.name, s.active, COUNT(sc.id) as criterios
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.name = 'Scorecard Vendas GGV'
GROUP BY s.id, s.name, s.active;
