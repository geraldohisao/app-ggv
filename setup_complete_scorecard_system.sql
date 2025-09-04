-- SETUP COMPLETO DO SISTEMA DE SCORECARD
-- Execute este script inteiro no Supabase SQL Editor

-- =====================================================
-- 1. CRIAR SCORECARD DE EXEMPLO
-- =====================================================

-- Criar scorecard principal
INSERT INTO scorecards (
  id,
  name,
  description,
  conversation_type,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Scorecard Vendas GGV',
  'Avaliação padrão para chamadas de prospecção e vendas da GGV',
  'prospecting',
  true,
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  active = EXCLUDED.active,
  updated_at = NOW();

-- Obter o ID do scorecard e criar critérios
DO $$
DECLARE
    v_scorecard_id UUID;
BEGIN
    -- Buscar o scorecard criado
    SELECT id INTO v_scorecard_id 
    FROM scorecards 
    WHERE name = 'Scorecard Vendas GGV' 
    LIMIT 1;
    
    -- Se não encontrou, criar um novo
    IF v_scorecard_id IS NULL THEN
        v_scorecard_id := gen_random_uuid();
        INSERT INTO scorecards (id, name, description, conversation_type, active, created_at, updated_at)
        VALUES (v_scorecard_id, 'Scorecard Vendas GGV', 'Avaliação padrão para chamadas de prospecção e vendas da GGV', 'prospecting', true, NOW(), NOW());
    END IF;
    
    -- Limpar critérios existentes
    DELETE FROM scorecard_criteria WHERE scorecard_id = v_scorecard_id;
    
    -- Criar critérios do scorecard
    INSERT INTO scorecard_criteria (
      id,
      scorecard_id,
      name,
      description,
      weight,
      max_score,
      order_index
    ) VALUES 
    -- Critério 1: Apresentação
    (
      gen_random_uuid(),
      v_scorecard_id,
      'Apresentação Pessoal',
      'SDR se apresenta adequadamente mencionando nome, empresa e motivo da ligação',
      20,
      10,
      1
    ),
    -- Critério 2: Descoberta de Necessidades
    (
      gen_random_uuid(),
      v_scorecard_id,
      'Descoberta de Necessidades',
      'Faz perguntas para entender o negócio, desafios e necessidades do cliente',
      30,
      10,
      2
    ),
    -- Critério 3: Proposta de Valor
    (
      gen_random_uuid(),
      v_scorecard_id,
      'Proposta de Valor',
      'Apresenta soluções conectadas às necessidades identificadas do cliente',
      25,
      10,
      3
    ),
    -- Critério 4: Tratamento de Objeções
    (
      gen_random_uuid(),
      v_scorecard_id,
      'Tratamento de Objeções',
      'Responde adequadamente a dúvidas e objeções do cliente',
      15,
      10,
      4
    ),
    -- Critério 5: Próximos Passos
    (
      gen_random_uuid(),
      v_scorecard_id,
      'Próximos Passos',
      'Define claramente os próximos passos e agenda reunião ou follow-up',
      10,
      10,
      5
    );
    
    RAISE NOTICE 'Scorecard criado com ID: %', v_scorecard_id;
END $$;

-- =====================================================
-- 2. CRIAR FUNÇÕES RPC
-- =====================================================

-- Função para buscar critérios do scorecard
CREATE OR REPLACE FUNCTION get_scorecard_criteria(scorecard_id_param UUID)
RETURNS TABLE (
  id UUID,
  scorecard_id UUID,
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
    sc.scorecard_id,
    sc.name,
    sc.description,
    sc.weight,
    sc.max_score,
    sc.order_index
  FROM scorecard_criteria sc
  WHERE sc.scorecard_id = scorecard_id_param
  ORDER BY sc.order_index ASC;
END;
$$;

-- Função para buscar scorecard ativo
CREATE OR REPLACE FUNCTION get_active_scorecard()
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  conversation_type VARCHAR(50),
  active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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
    s.created_at,
    s.updated_at
  FROM scorecards s
  WHERE s.active = true
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- =====================================================
-- 3. CRIAR TABELAS DE ANÁLISE
-- =====================================================

-- Tabela principal de análises
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
  analyzed_by UUID,
  
  -- Índices únicos
  UNIQUE(call_id, scorecard_id)
);

-- Tabela de análise detalhada por critério
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_call_analyses_call_id ON call_analyses(call_id);
CREATE INDEX IF NOT EXISTS idx_call_analyses_scorecard_id ON call_analyses(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_call_analyses_final_grade ON call_analyses(final_grade);
CREATE INDEX IF NOT EXISTS idx_call_analyses_created_at ON call_analyses(created_at);

CREATE INDEX IF NOT EXISTS idx_call_analysis_criteria_analysis_id ON call_analysis_criteria(call_analysis_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_criteria_criterion_id ON call_analysis_criteria(criterion_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_criteria_percentage ON call_analysis_criteria(percentage);

-- =====================================================
-- 4. FUNÇÕES DE ANÁLISE
-- =====================================================

-- Função para buscar análise completa de uma chamada
CREATE OR REPLACE FUNCTION get_call_analysis(p_call_id UUID)
RETURNS TABLE (
  -- Dados da análise principal
  analysis_id UUID,
  call_id UUID,
  scorecard_id UUID,
  scorecard_name VARCHAR(255),
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

-- Função para salvar análise completa
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
    confidence, processing_time_ms
  ) VALUES (
    p_call_id, p_scorecard_id, p_overall_score, p_max_possible_score,
    p_final_grade, p_general_feedback, p_strengths, p_improvements,
    p_confidence, p_processing_time_ms
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

-- =====================================================
-- 5. VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar scorecard criado
SELECT 
  s.name as scorecard,
  s.active,
  COUNT(sc.id) as total_criterios
FROM scorecards s
LEFT JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.name = 'Scorecard Vendas GGV'
GROUP BY s.id, s.name, s.active;

-- Listar critérios criados
SELECT 
  sc.name as criterio,
  sc.description,
  sc.weight as peso,
  sc.max_score as pontuacao_maxima,
  sc.order_index as ordem
FROM scorecards s
JOIN scorecard_criteria sc ON s.id = sc.scorecard_id
WHERE s.name = 'Scorecard Vendas GGV'
ORDER BY sc.order_index;

-- Testar funções
SELECT 'Testando função get_active_scorecard...' as status;
SELECT name, active FROM get_active_scorecard();

-- Verificar tabelas criadas
SELECT 'Sistema de análise configurado com sucesso!' as resultado;
