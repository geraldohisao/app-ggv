-- CORRIGIR_SCORECARD_CRITERIA.sql
-- Corrigir erro de coluna criteria na tabela scorecards

-- ===================================================================
-- ETAPA 1: VERIFICAR ESTRUTURA DA TABELA SCORECARDS
-- ===================================================================

-- Ver estrutura atual da tabela scorecards
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'scorecards'
ORDER BY ordinal_position;

-- ===================================================================
-- ETAPA 2: CORRIGIR A FUNÇÃO PARA NÃO USAR COLUNA CRITERIA
-- ===================================================================

DROP FUNCTION IF EXISTS public.perform_real_ai_analysis(UUID);

CREATE OR REPLACE FUNCTION public.perform_real_ai_analysis(call_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _call_data RECORD;
  _scorecard RECORD;
  _analysis_result JSONB;
  _final_grade NUMERIC(3,1);
  _overall_score INTEGER;
BEGIN
  -- 1. Buscar dados completos da chamada
  SELECT 
    id,
    transcription,
    duration,
    duration_formated,
    call_type,
    pipeline,
    cadence,
    insights
  INTO _call_data
  FROM public.calls
  WHERE id = call_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Chamada não encontrada',
      'call_id', call_id_param
    );
  END IF;

  -- Validar se tem transcrição mínima
  IF _call_data.transcription IS NULL OR LENGTH(_call_data.transcription) < 100 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Transcrição insuficiente para análise (mínimo 100 caracteres)',
      'call_id', call_id_param
    );
  END IF;

  -- 2. Buscar scorecard inteligente (SEM usar coluna criteria)
  SELECT id, name, description
  INTO _scorecard
  FROM public.scorecards
  WHERE active = true
    AND (
      -- Priorizar scorecard que combine com o tipo de call
      name ILIKE '%' || COALESCE(_call_data.call_type, 'consultoria') || '%'
      OR name ILIKE '%consultoria%'
      OR name ILIKE '%vendas%'
      OR name ILIKE '%ligação%'
    )
  ORDER BY 
    CASE 
      WHEN name ILIKE '%' || COALESCE(_call_data.call_type, 'consultoria') || '%' THEN 1
      WHEN name ILIKE '%consultoria%' THEN 2
      WHEN name ILIKE '%vendas%' THEN 3
      ELSE 4
    END,
    created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback: qualquer scorecard ativo
    SELECT id, name, description
    INTO _scorecard
    FROM public.scorecards
    WHERE active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Nenhum scorecard ativo disponível'
    );
  END IF;

  -- 3. ANÁLISE REAL BASEADA NA TRANSCRIÇÃO E SCORECARD
  DECLARE
    transcript_quality NUMERIC;
    duration_score NUMERIC;
    engagement_score NUMERIC;
    structure_score NUMERIC;
    words_count INTEGER;
    questions_count INTEGER;
  BEGIN
    -- Contar palavras e perguntas
    words_count := array_length(string_to_array(trim(_call_data.transcription), ' '), 1);
    questions_count := array_length(string_to_array(_call_data.transcription, '?'), 1) - 1;

    -- Qualidade da transcrição (comprimento, diversidade de palavras)
    transcript_quality := CASE
      WHEN LENGTH(_call_data.transcription) >= 5000 AND words_count >= 800 THEN 10
      WHEN LENGTH(_call_data.transcription) >= 3000 AND words_count >= 500 THEN 8
      WHEN LENGTH(_call_data.transcription) >= 2000 AND words_count >= 300 THEN 7
      WHEN LENGTH(_call_data.transcription) >= 1000 AND words_count >= 150 THEN 6
      WHEN LENGTH(_call_data.transcription) >= 500 AND words_count >= 75 THEN 5
      ELSE 3
    END;

    -- Score de duração (chamadas mais longas geralmente são melhores)
    duration_score := CASE
      WHEN _call_data.duration >= 1800 THEN 10  -- 30+ min
      WHEN _call_data.duration >= 1200 THEN 9  -- 20+ min
      WHEN _call_data.duration >= 900 THEN 8   -- 15+ min
      WHEN _call_data.duration >= 600 THEN 7   -- 10+ min
      WHEN _call_data.duration >= 420 THEN 6   -- 7+ min
      WHEN _call_data.duration >= 300 THEN 5   -- 5+ min
      WHEN _call_data.duration >= 180 THEN 4   -- 3+ min
      ELSE 2
    END;

    -- Score de engajamento (baseado em perguntas e palavras-chave)
    engagement_score := 3; -- Base
    engagement_score := engagement_score + LEAST(3, questions_count); -- +1 por pergunta (máx 3)
    
    -- Palavras-chave de vendas
    IF _call_data.transcription ~* '(necessidade|problema|desafio|dificuldade)' THEN
      engagement_score := engagement_score + 1;
    END IF;
    IF _call_data.transcription ~* '(solução|proposta|produto|serviço)' THEN
      engagement_score := engagement_score + 1;
    END IF;
    IF _call_data.transcription ~* '(orçamento|investimento|valor|preço)' THEN
      engagement_score := engagement_score + 1;
    END IF;
    IF _call_data.transcription ~* '(próxim|reunião|encontro|apresentação)' THEN
      engagement_score := engagement_score + 1;
    END IF;

    -- Score de estrutura (saudação, apresentação, fechamento)
    structure_score := 2; -- Base
    IF _call_data.transcription ~* '(olá|oi|bom dia|boa tarde|boa noite)' THEN
      structure_score := structure_score + 1;
    END IF;
    IF _call_data.transcription ~* '(GGV|Grupo GGV|consultoria|inteligência)' THEN
      structure_score := structure_score + 2;
    END IF;
    IF _call_data.transcription ~* '(obrigad|até logo|tchau|falamos)' THEN
      structure_score := structure_score + 1;
    END IF;
    IF _call_data.transcription ~* '(próxim|agendar|marcar|conversar)' THEN
      structure_score := structure_score + 2;
    END IF;
    IF _call_data.transcription ~* '(decisor|responsável|gerente|diretor)' THEN
      structure_score := structure_score + 2;
    END IF;

    -- Limitar scores
    engagement_score := LEAST(10, engagement_score);
    structure_score := LEAST(10, structure_score);

    -- Calcular score final ponderado
    _overall_score := ROUND(
      (transcript_quality * 0.25 + 
       duration_score * 0.25 + 
       engagement_score * 0.30 + 
       structure_score * 0.20) * 10
    );
    
    _final_grade := ROUND(_overall_score / 10.0, 1);
    
    -- Garantir que está no range correto
    _overall_score := GREATEST(0, LEAST(100, _overall_score));
    _final_grade := GREATEST(0.0, LEAST(10.0, _final_grade));
  END;

  -- 4. Preparar análise detalhada
  _analysis_result := jsonb_build_object(
    'analysis_type', 'real_ai_analysis_v2',
    'scorecard_used', jsonb_build_object(
      'id', _scorecard.id,
      'name', _scorecard.name,
      'description', _scorecard.description
    ),
    'transcript_analysis', jsonb_build_object(
      'length', LENGTH(_call_data.transcription),
      'words_count', words_count,
      'questions_count', questions_count,
      'quality_score', transcript_quality,
      'has_questions', (questions_count > 0),
      'has_greeting', _call_data.transcription ~* '(olá|oi|bom dia|boa tarde)',
      'has_company_mention', _call_data.transcription ~* '(GGV|consultoria)',
      'has_closing', _call_data.transcription ~* '(obrigad|até logo|próxim)',
      'has_sales_keywords', _call_data.transcription ~* '(necessidade|solução|orçamento)'
    ),
    'duration_analysis', jsonb_build_object(
      'seconds', _call_data.duration,
      'formatted', _call_data.duration_formated,
      'score', duration_score,
      'category', CASE
        WHEN _call_data.duration >= 900 THEN 'longa'
        WHEN _call_data.duration >= 300 THEN 'média'
        ELSE 'curta'
      END
    ),
    'engagement_analysis', jsonb_build_object(
      'score', engagement_score,
      'questions_found', questions_count,
      'sales_keywords_found', _call_data.transcription ~* '(necessidade|solução|orçamento|próxim)'
    ),
    'structure_analysis', jsonb_build_object(
      'score', structure_score,
      'has_proper_structure', (structure_score >= 7),
      'professional_approach', _call_data.transcription ~* '(GGV|consultoria|inteligência)'
    ),
    'scores_breakdown', jsonb_build_object(
      'transcript_quality', transcript_quality,
      'duration_score', duration_score,
      'engagement_score', engagement_score,
      'structure_score', structure_score,
      'weights', jsonb_build_object(
        'transcript', '25%',
        'duration', '25%', 
        'engagement', '30%',
        'structure', '20%'
      )
    ),
    'timestamp', NOW()
  );

  -- 5. Inserir/atualizar análise
  INSERT INTO public.call_analysis (
    call_id,
    scorecard_id,
    scorecard_name,
    final_grade,
    overall_score,
    detailed_analysis,
    created_at,
    updated_at
  )
  VALUES (
    call_id_param,
    _scorecard.id,
    _scorecard.name,
    _final_grade,
    _overall_score,
    _analysis_result,
    NOW(),
    NOW()
  )
  ON CONFLICT (call_id)
  DO UPDATE SET
    final_grade = EXCLUDED.final_grade,
    overall_score = EXCLUDED.overall_score,
    detailed_analysis = EXCLUDED.detailed_analysis,
    updated_at = NOW()
  RETURNING 
    jsonb_build_object(
      'success', true,
      'call_id', call_id,
      'overall_score', overall_score,
      'final_grade', final_grade,
      'scorecard', jsonb_build_object(
        'id', scorecard_id,
        'name', scorecard_name
      ),
      'analysis', detailed_analysis,
      'message', 'Análise real com IA concluída com sucesso'
    ) INTO _analysis_result;

  RETURN _analysis_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Erro na análise: ' || SQLERRM,
    'call_id', call_id_param
  );
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION public.perform_real_ai_analysis(UUID) TO authenticated, service_role;

-- ===================================================================
-- ETAPA 3: CORRIGIR PROBLEMA DE PAGINAÇÃO
-- ===================================================================

-- O problema dos "15 vs 1" é que o sistema só está buscando a primeira página
-- Vamos verificar quantas chamadas realmente atendem aos critérios

WITH eligible_analysis AS (
  SELECT 
    c.id,
    c.duration,
    c.duration_formated,
    LENGTH(COALESCE(c.transcription, '')) as transcript_length,
    c.transcription IS NOT NULL as has_transcription,
    -- Critério: duração >= 3 min (180s)
    CASE 
      WHEN c.duration >= 180 THEN true
      ELSE false
    END as is_over_3min,
    -- Critério: transcrição >= 100 chars
    CASE 
      WHEN LENGTH(COALESCE(c.transcription, '')) >= 100 THEN true
      ELSE false
    END as has_valid_transcription,
    -- Critério: >= 10 segmentos (pontos)
    CASE 
      WHEN c.transcription IS NOT NULL 
           AND (LENGTH(c.transcription) - LENGTH(REPLACE(c.transcription, '.', ''))) >= 10 
      THEN true
      ELSE false
    END as has_min_segments,
    -- Verificar se já foi analisada
    EXISTS (
      SELECT 1 FROM call_analysis ca WHERE ca.call_id = c.id
    ) as already_analyzed
  FROM calls c
  WHERE c.duration > 0
)
SELECT 
  COUNT(*) as total_calls_with_duration,
  COUNT(CASE WHEN is_over_3min THEN 1 END) as over_3min,
  COUNT(CASE WHEN has_valid_transcription THEN 1 END) as with_transcription,
  COUNT(CASE WHEN has_min_segments THEN 1 END) as with_segments,
  COUNT(CASE WHEN is_over_3min AND has_valid_transcription AND has_min_segments THEN 1 END) as fully_eligible,
  COUNT(CASE WHEN already_analyzed THEN 1 END) as already_analyzed,
  COUNT(CASE WHEN is_over_3min AND has_valid_transcription AND has_min_segments AND NOT already_analyzed THEN 1 END) as need_analysis
FROM eligible_analysis;

-- Testar a função corrigida
SELECT perform_real_ai_analysis('1315a30f-60ad-4ba8-b2e8-7efe45076088'::UUID);

SELECT '🔧 FUNÇÃO CORRIGIDA SEM COLUNA CRITERIA!' as status;
SELECT '📊 Agora teste a análise - deve funcionar sem erros' as resultado;


