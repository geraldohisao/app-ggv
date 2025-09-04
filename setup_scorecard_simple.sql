-- SETUP SIMPLES DO SCORECARD - Adaptado à estrutura real

-- 1. Verificar estrutura atual
SELECT 'Verificando estrutura das tabelas...' as status;

-- 2. Criar scorecard se não existir
INSERT INTO scorecards (
  name,
  description,
  conversation_type,
  active
) VALUES (
  'Scorecard Vendas GGV',
  'Avaliação padrão para chamadas de prospecção e vendas da GGV',
  'prospecting',
  true
) ON CONFLICT (name) DO UPDATE SET
  active = EXCLUDED.active;

-- 3. Obter ID do scorecard e criar critérios
DO $$
DECLARE
    v_scorecard_id UUID;
BEGIN
    -- Buscar scorecard
    SELECT id INTO v_scorecard_id 
    FROM scorecards 
    WHERE name = 'Scorecard Vendas GGV' 
    LIMIT 1;
    
    IF v_scorecard_id IS NULL THEN
        RAISE EXCEPTION 'Scorecard não encontrado';
    END IF;
    
    -- Limpar critérios existentes
    DELETE FROM scorecard_criteria WHERE scorecard_id = v_scorecard_id;
    
    -- Inserir critérios (apenas colunas que existem)
    INSERT INTO scorecard_criteria (
      scorecard_id,
      name,
      description,
      weight,
      max_score,
      order_index
    ) VALUES 
    (v_scorecard_id, 'Apresentação Pessoal', 'SDR se apresenta adequadamente', 20, 10, 1),
    (v_scorecard_id, 'Descoberta de Necessidades', 'Faz perguntas sobre o negócio', 30, 10, 2),
    (v_scorecard_id, 'Proposta de Valor', 'Apresenta soluções conectadas', 25, 10, 3),
    (v_scorecard_id, 'Tratamento de Objeções', 'Responde adequadamente', 15, 10, 4),
    (v_scorecard_id, 'Próximos Passos', 'Define próximos passos', 10, 10, 5);
    
    RAISE NOTICE 'Scorecard criado: %', v_scorecard_id;
END $$;

-- 4. Criar tabelas de análise
CREATE TABLE IF NOT EXISTS call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  scorecard_id UUID REFERENCES scorecards(id),
  overall_score INTEGER NOT NULL DEFAULT 0,
  max_possible_score INTEGER NOT NULL DEFAULT 0,
  final_grade DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  general_feedback TEXT,
  strengths TEXT[],
  improvements TEXT[],
  confidence DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id, scorecard_id)
);

CREATE TABLE IF NOT EXISTS call_analysis_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_analysis_id UUID NOT NULL REFERENCES call_analyses(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES scorecard_criteria(id),
  achieved_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER GENERATED ALWAYS AS (
    CASE WHEN max_score > 0 THEN ROUND((achieved_score::DECIMAL / max_score) * 100) ELSE 0 END
  ) STORED,
  analysis TEXT,
  evidence TEXT[],
  suggestions TEXT[],
  confidence DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_analysis_id, criterion_id)
);

-- 5. Funções simples
CREATE OR REPLACE FUNCTION get_call_analysis_simple(p_call_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'analysis_id', ca.id,
    'call_id', ca.call_id,
    'scorecard_id', ca.scorecard_id,
    'final_grade', ca.final_grade,
    'overall_score', ca.overall_score,
    'max_possible_score', ca.max_possible_score,
    'general_feedback', ca.general_feedback,
    'strengths', ca.strengths,
    'improvements', ca.improvements,
    'confidence', ca.confidence,
    'created_at', ca.created_at
  ) INTO result
  FROM call_analyses ca
  WHERE ca.call_id = p_call_id
  ORDER BY ca.created_at DESC
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- 6. Verificar resultado
SELECT 'Sistema configurado!' as resultado;

SELECT 
  s.name as scorecard,
  s.active,
  COUNT(sc.id) as criterios
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.name = 'Scorecard Vendas GGV'
GROUP BY s.id, s.name, s.active;
