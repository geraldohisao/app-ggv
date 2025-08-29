-- 45_enhanced_fulltext_search.sql
-- BUSCA FULL-TEXT: Sistema avançado com ranking e múltiplos campos

-- =========================================
-- MELHORAR SEARCH_VECTOR COM PESOS
-- =========================================

-- Função melhorada para atualizar search_vector com pesos específicos
CREATE OR REPLACE FUNCTION update_calls_search_vector_enhanced()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Construir search_vector com pesos hierárquicos
  NEW.search_vector := 
    -- Peso A (mais importante): Deal ID e empresa
    setweight(to_tsvector('portuguese', COALESCE(NEW.deal_id, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.insights->>'company', '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.insights->'metadata'->>'company', '')), 'A') ||
    
    -- Peso B (importante): Nome da pessoa e SDR
    setweight(to_tsvector('portuguese', COALESCE(NEW.insights->>'person_name', '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.insights->'contact'->>'name', '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.agent_id, '')), 'B') ||
    
    -- Peso C (médio): Status, tipo de call, telefones
    setweight(to_tsvector('portuguese', COALESCE(NEW.status, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.call_type, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.from_number, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.to_number, '')), 'C') ||
    
    -- Peso D (menor): Transcrição e insights gerais
    setweight(to_tsvector('portuguese', COALESCE(NEW.transcription, '')), 'D') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.insights::text, '')), 'D');
  
  RETURN NEW;
END;
$$;

-- Atualizar trigger
DROP TRIGGER IF EXISTS trigger_update_calls_search_vector ON calls;
CREATE TRIGGER trigger_update_calls_search_vector
  BEFORE INSERT OR UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_calls_search_vector_enhanced();

-- =========================================
-- FUNÇÃO DE BUSCA AVANÇADA COM MÚLTIPLOS ALGORITMOS
-- =========================================

CREATE OR REPLACE FUNCTION search_calls_advanced(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search_type TEXT DEFAULT 'smart' -- 'smart', 'exact', 'fuzzy', 'semantic'
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  person_name TEXT,
  sdr_name TEXT,
  deal_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  rank REAL,
  search_type TEXT,
  matched_fields TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_query tsquery;
  search_terms TEXT[];
BEGIN
  -- Limpar e preparar query
  p_query := TRIM(p_query);
  IF p_query = '' THEN
    RETURN;
  END IF;

  -- Dividir em termos para análise
  search_terms := string_to_array(p_query, ' ');

  -- Escolher algoritmo baseado no tipo de busca
  CASE p_search_type
    WHEN 'exact' THEN
      ts_query := phraseto_tsquery('portuguese', p_query);
    WHEN 'fuzzy' THEN
      ts_query := to_tsquery('portuguese', array_to_string(search_terms, ' | '));
    WHEN 'semantic' THEN
      ts_query := websearch_to_tsquery('portuguese', p_query);
    ELSE -- 'smart'
      -- Tentar diferentes abordagens e combinar
      ts_query := websearch_to_tsquery('portuguese', p_query);
      IF ts_query IS NULL THEN
        ts_query := plainto_tsquery('portuguese', p_query);
      END IF;
  END CASE;

  -- Se não conseguiu criar query válida, usar plainto como fallback
  IF ts_query IS NULL THEN
    ts_query := plainto_tsquery('portuguese', p_query);
  END IF;

  RETURN QUERY
  WITH search_results AS (
    SELECT 
      c.id,
      ce.company_name,
      ce.person_name,
      ce.sdr_name,
      c.deal_id,
      c.status,
      c.created_at,
      -- Ranking combinado
      (
        ts_rank_cd(c.search_vector, ts_query, 32) * 1.0 +  -- Ranking básico
        ts_rank(c.search_vector, ts_query) * 0.5 +          -- Ranking por frequência
        CASE 
          -- Boost para matches exatos no deal_id
          WHEN c.deal_id ILIKE '%' || p_query || '%' THEN 2.0
          -- Boost para matches na empresa
          WHEN ce.company_name ILIKE '%' || p_query || '%' THEN 1.5
          -- Boost para matches na pessoa
          WHEN ce.person_name ILIKE '%' || p_query || '%' THEN 1.2
          ELSE 0.0
        END +
        -- Boost por recência (calls mais recentes têm score maior)
        CASE 
          WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN 0.3
          WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN 0.1
          ELSE 0.0
        END
      ) as combined_rank,
      p_search_type as search_type,
      -- Identificar campos que fizeram match
      ARRAY(
        SELECT field_name 
        FROM (
          VALUES 
            ('deal_id', c.deal_id ILIKE '%' || p_query || '%'),
            ('company', ce.company_name ILIKE '%' || p_query || '%'),
            ('person', ce.person_name ILIKE '%' || p_query || '%'),
            ('sdr', ce.sdr_name ILIKE '%' || p_query || '%'),
            ('transcription', c.transcription ILIKE '%' || p_query || '%'),
            ('phone', c.from_number ILIKE '%' || p_query || '%' OR c.to_number ILIKE '%' || p_query || '%')
        ) AS matches(field_name, is_match)
        WHERE is_match
      ) as matched_fields
    FROM calls c
    JOIN calls_enriched ce ON c.id = ce.id
    WHERE c.search_vector @@ ts_query
  )
  SELECT 
    sr.id,
    sr.company_name,
    sr.person_name,
    sr.sdr_name,
    sr.deal_id,
    sr.status,
    sr.created_at,
    sr.combined_rank as rank,
    sr.search_type,
    sr.matched_fields
  FROM search_results sr
  ORDER BY sr.combined_rank DESC, sr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- =========================================
-- FUNÇÃO DE SUGESTÕES DE BUSCA
-- =========================================

CREATE OR REPLACE FUNCTION search_suggestions(
  p_partial_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  suggestion TEXT,
  category TEXT,
  frequency INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH suggestions AS (
    -- Sugestões de empresas
    SELECT 
      ce.company_name as suggestion,
      'company' as category,
      COUNT(*)::INTEGER as frequency
    FROM calls_enriched ce
    WHERE ce.company_name ILIKE p_partial_query || '%'
      AND ce.company_name IS NOT NULL
      AND LENGTH(ce.company_name) > 2
    GROUP BY ce.company_name
    
    UNION ALL
    
    -- Sugestões de pessoas
    SELECT 
      ce.person_name as suggestion,
      'person' as category,
      COUNT(*)::INTEGER as frequency
    FROM calls_enriched ce
    WHERE ce.person_name ILIKE p_partial_query || '%'
      AND ce.person_name IS NOT NULL
      AND LENGTH(ce.person_name) > 2
    GROUP BY ce.person_name
    
    UNION ALL
    
    -- Sugestões de SDRs
    SELECT 
      ce.sdr_name as suggestion,
      'sdr' as category,
      COUNT(*)::INTEGER as frequency
    FROM calls_enriched ce
    WHERE ce.sdr_name ILIKE p_partial_query || '%'
      AND ce.sdr_name IS NOT NULL
      AND ce.sdr_name != 'SDR não identificado'
    GROUP BY ce.sdr_name
    
    UNION ALL
    
    -- Sugestões de deal_ids
    SELECT 
      c.deal_id as suggestion,
      'deal' as category,
      1 as frequency
    FROM calls c
    WHERE c.deal_id ILIKE p_partial_query || '%'
      AND c.deal_id IS NOT NULL
      AND LENGTH(c.deal_id) > 2
    GROUP BY c.deal_id
  )
  SELECT 
    s.suggestion,
    s.category,
    s.frequency
  FROM suggestions s
  WHERE s.suggestion IS NOT NULL
  ORDER BY s.frequency DESC, LENGTH(s.suggestion) ASC
  LIMIT p_limit;
$$;

-- =========================================
-- FUNÇÃO DE BUSCA COM FILTROS COMBINADOS
-- =========================================

CREATE OR REPLACE FUNCTION search_calls_with_filters(
  p_query TEXT DEFAULT NULL,
  p_sdr_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  person_name TEXT,
  sdr_name TEXT,
  sdr_email TEXT,
  deal_id TEXT,
  status TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ,
  rank REAL,
  matched_fields TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_search BOOLEAN := p_query IS NOT NULL AND TRIM(p_query) != '';
  ts_query tsquery;
BEGIN
  -- Preparar query de busca se fornecida
  IF has_search THEN
    ts_query := websearch_to_tsquery('portuguese', TRIM(p_query));
    IF ts_query IS NULL THEN
      ts_query := plainto_tsquery('portuguese', TRIM(p_query));
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    ce.id,
    ce.company_name,
    ce.person_name,
    ce.sdr_name,
    ce.sdr_email,
    ce.deal_id,
    ce.status,
    ce.duration,
    ce.created_at,
    CASE 
      WHEN has_search THEN 
        ts_rank_cd(c.search_vector, ts_query, 32) +
        CASE 
          WHEN ce.company_name ILIKE '%' || p_query || '%' THEN 1.0
          WHEN ce.person_name ILIKE '%' || p_query || '%' THEN 0.8
          WHEN ce.deal_id ILIKE '%' || p_query || '%' THEN 1.5
          ELSE 0.0
        END
      ELSE 0.0
    END as rank,
    CASE 
      WHEN has_search THEN
        ARRAY(
          SELECT field_name 
          FROM (
            VALUES 
              ('company', ce.company_name ILIKE '%' || p_query || '%'),
              ('person', ce.person_name ILIKE '%' || p_query || '%'),
              ('deal', ce.deal_id ILIKE '%' || p_query || '%'),
              ('sdr', ce.sdr_name ILIKE '%' || p_query || '%')
          ) AS matches(field_name, is_match)
          WHERE is_match
        )
      ELSE ARRAY[]::TEXT[]
    END as matched_fields
  FROM calls_enriched ce
  LEFT JOIN calls c ON ce.id = c.id
  WHERE 
    -- Filtros tradicionais
    (p_sdr_email IS NULL OR ce.sdr_email = p_sdr_email)
    AND (p_status IS NULL OR ce.status = p_status)
    AND (p_start_date IS NULL OR ce.created_at >= p_start_date)
    AND (p_end_date IS NULL OR ce.created_at <= p_end_date)
    -- Filtro de busca
    AND (NOT has_search OR c.search_vector @@ ts_query)
  ORDER BY 
    CASE WHEN has_search THEN rank ELSE 0 END DESC,
    ce.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- =========================================
-- PERMISSÕES
-- =========================================

GRANT EXECUTE ON FUNCTION search_calls_advanced(TEXT, INTEGER, INTEGER, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION search_suggestions(TEXT, INTEGER) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION search_calls_with_filters(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated, service_role, anon;

-- =========================================
-- TESTES
-- =========================================

-- Testar busca avançada
SELECT 'Advanced Search Test:' as test, company_name, rank, matched_fields
FROM search_calls_advanced('empresa', 5, 0, 'smart')
LIMIT 3;

-- Testar sugestões
SELECT 'Suggestions Test:' as test, suggestion, category, frequency
FROM search_suggestions('emp', 5)
LIMIT 3;
