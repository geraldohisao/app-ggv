-- Criar tabelas para armazenar análises de chamadas
-- Sistema completo de análise com IA

-- 1. Tabela principal de análises
CREATE TABLE IF NOT EXISTS call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  scorecard_id UUID REFERENCES scorecards(id),
  
  -- Resultado geral
  overall_score INTEGER NOT NULL DEFAULT 0,
  max_possible_score INTEGER NOT NULL DEFAULT 0,
  final_grade DECIMAL(3,1) NOT NULL DEFAULT 0.0, -- 0.0 a 10.0
  
  -- Feedback da IA
  general_feedback TEXT,
  strengths TEXT[], -- Array de pontos fortes
  improvements TEXT[], -- Array de melhorias
  
  -- Metadados da análise
  confidence DECIMAL(3,2) DEFAULT 0.0, -- 0.00 a 1.00
  analysis_version VARCHAR(10) DEFAULT '1.0',
  processing_time_ms INTEGER,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_by UUID REFERENCES auth.users(id),
  
  -- Índices únicos
  UNIQUE(call_id, scorecard_id)
);

-- 2. Tabela de análise detalhada por critério
CREATE TABLE IF NOT EXISTS call_analysis_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_analysis_id UUID NOT NULL REFERENCES call_analyses(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES scorecard_criteria(id),
  
  -- Pontuação do critério
  achieved_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN max_score > 0 THEN ROUND((achieved_score::DECIMAL / max_score) * 100)
      ELSE 0 
    END
  ) STORED,
  
  -- Análise detalhada
  analysis TEXT,
  evidence TEXT[], -- Trechos da transcrição que comprovam
  suggestions TEXT[], -- Sugestões específicas
  
  -- Metadados
  confidence DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices únicos
  UNIQUE(call_analysis_id, criterion_id)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_call_analyses_call_id ON call_analyses(call_id);
CREATE INDEX IF NOT EXISTS idx_call_analyses_scorecard_id ON call_analyses(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_call_analyses_final_grade ON call_analyses(final_grade);
CREATE INDEX IF NOT EXISTS idx_call_analyses_created_at ON call_analyses(created_at);

CREATE INDEX IF NOT EXISTS idx_call_analysis_criteria_analysis_id ON call_analysis_criteria(call_analysis_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_criteria_criterion_id ON call_analysis_criteria(criterion_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_criteria_percentage ON call_analysis_criteria(percentage);

-- 4. Função para buscar análise completa de uma chamada
CREATE OR REPLACE FUNCTION get_call_analysis(p_call_id UUID)
RETURNS TABLE (
  -- Dados da análise principal
  analysis_id UUID,
  call_id UUID,
  scorecard_id UUID,
  scorecard_name TEXT,
  overall_score INTEGER,
  max_possible_score INTEGER,
  final_grade DECIMAL(3,1),
  general_feedback TEXT,
  strengths TEXT[],
  improvements TEXT[],
  confidence DECIMAL(3,2),
  analysis_created_at TIMESTAMPTZ,
  
  -- Dados dos critérios (JSON agregado)
  criteria_analysis JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.scorecard_id,
    s.name as scorecard_name,
    ca.overall_score,
    ca.max_possible_score,
    ca.final_grade,
    ca.general_feedback,
    ca.strengths,
    ca.improvements,
    ca.confidence,
    ca.created_at as analysis_created_at,
    
    -- Agregar critérios em JSON
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'criterion_id', cac.criterion_id,
          'criterion_name', sc.name,
          'criterion_description', sc.description,
          'achieved_score', cac.achieved_score,
          'max_score', cac.max_score,
          'percentage', cac.percentage,
          'analysis', cac.analysis,
          'evidence', cac.evidence,
          'suggestions', cac.suggestions,
          'confidence', cac.confidence
        ) ORDER BY sc.order_index
      ), 
      '[]'::jsonb
    ) as criteria_analysis
    
  FROM call_analyses ca
  LEFT JOIN scorecards s ON ca.scorecard_id = s.id
  LEFT JOIN call_analysis_criteria cac ON ca.id = cac.call_analysis_id
  LEFT JOIN scorecard_criteria sc ON cac.criterion_id = sc.id
  WHERE ca.call_id = p_call_id
  GROUP BY 
    ca.id, ca.call_id, ca.scorecard_id, s.name, ca.overall_score, 
    ca.max_possible_score, ca.final_grade, ca.general_feedback, 
    ca.strengths, ca.improvements, ca.confidence, ca.created_at
  ORDER BY ca.created_at DESC
  LIMIT 1;
END;
$$;

-- 5. Função para salvar análise completa
CREATE OR REPLACE FUNCTION save_call_analysis(
  p_call_id UUID,
  p_scorecard_id UUID,
  p_overall_score INTEGER,
  p_max_possible_score INTEGER,
  p_final_grade DECIMAL(3,1),
  p_general_feedback TEXT,
  p_strengths TEXT[],
  p_improvements TEXT[],
  p_confidence DECIMAL(3,2),
  p_criteria_data JSONB,
  p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analysis_id UUID;
  criterion_data JSONB;
BEGIN
  -- Inserir ou atualizar análise principal
  INSERT INTO call_analyses (
    call_id, scorecard_id, overall_score, max_possible_score, 
    final_grade, general_feedback, strengths, improvements, 
    confidence, processing_time_ms, analyzed_by
  ) VALUES (
    p_call_id, p_scorecard_id, p_overall_score, p_max_possible_score,
    p_final_grade, p_general_feedback, p_strengths, p_improvements,
    p_confidence, p_processing_time_ms, auth.uid()
  )
  ON CONFLICT (call_id, scorecard_id) 
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    max_possible_score = EXCLUDED.max_possible_score,
    final_grade = EXCLUDED.final_grade,
    general_feedback = EXCLUDED.general_feedback,
    strengths = EXCLUDED.strengths,
    improvements = EXCLUDED.improvements,
    confidence = EXCLUDED.confidence,
    processing_time_ms = EXCLUDED.processing_time_ms,
    updated_at = NOW()
  RETURNING id INTO analysis_id;
  
  -- Limpar critérios existentes
  DELETE FROM call_analysis_criteria WHERE call_analysis_id = analysis_id;
  
  -- Inserir critérios
  FOR criterion_data IN SELECT * FROM jsonb_array_elements(p_criteria_data)
  LOOP
    INSERT INTO call_analysis_criteria (
      call_analysis_id, criterion_id, achieved_score, max_score,
      analysis, evidence, suggestions, confidence
    ) VALUES (
      analysis_id,
      (criterion_data->>'criterion_id')::UUID,
      (criterion_data->>'achieved_score')::INTEGER,
      (criterion_data->>'max_score')::INTEGER,
      criterion_data->>'analysis',
      ARRAY(SELECT jsonb_array_elements_text(criterion_data->'evidence')),
      ARRAY(SELECT jsonb_array_elements_text(criterion_data->'suggestions')),
      COALESCE((criterion_data->>'confidence')::DECIMAL(3,2), 0.0)
    );
  END LOOP;
  
  RETURN analysis_id;
END;
$$;

-- 6. View para relatórios de análise
CREATE OR REPLACE VIEW call_analysis_summary AS
SELECT 
  c.id as call_id,
  c.created_at as call_date,
  c.sdr_name,
  c.person as client_name,
  c.enterprise as company_name,
  c.duration,
  ca.final_grade,
  ca.overall_score,
  ca.max_possible_score,
  s.name as scorecard_name,
  ca.confidence,
  ca.created_at as analysis_date,
  
  -- Estatísticas dos critérios
  COUNT(cac.id) as total_criteria,
  AVG(cac.percentage) as avg_criteria_percentage,
  MIN(cac.percentage) as min_criteria_percentage,
  MAX(cac.percentage) as max_criteria_percentage
  
FROM calls c
LEFT JOIN call_analyses ca ON c.id = ca.call_id
LEFT JOIN scorecards s ON ca.scorecard_id = s.id
LEFT JOIN call_analysis_criteria cac ON ca.id = cac.call_analysis_id
GROUP BY 
  c.id, c.created_at, c.sdr_name, c.person, c.enterprise, c.duration,
  ca.final_grade, ca.overall_score, ca.max_possible_score, s.name,
  ca.confidence, ca.created_at;

-- 7. Testar estrutura criada
SELECT 'Tabelas de análise criadas com sucesso!' as status;

-- Verificar tabelas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('call_analyses', 'call_analysis_criteria')
ORDER BY table_name, ordinal_position;
