-- Cria a função pública padronizada get_scorecard_criteria(uuid)
-- Compatível com o frontend (id, name, description, weight, max_score, order_index)

CREATE OR REPLACE FUNCTION public.get_scorecard_criteria(scorecard_id_param UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  weight INTEGER,
  max_score INTEGER,
  order_index INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    sc.id,
    sc.name,
    sc.description,
    COALESCE(sc.weight, 0)::INTEGER AS weight,
    COALESCE(sc.max_score, 10)::INTEGER AS max_score,
    COALESCE(sc.order_index, 0)::INTEGER AS order_index
  FROM public.scorecard_criteria sc
  WHERE sc.scorecard_id = scorecard_id_param
  ORDER BY sc.order_index, sc.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_scorecard_criteria(UUID) TO anon, authenticated, service_role;

-- Teste rápido (substitua pelo ID do seu scorecard)
-- SELECT * FROM public.get_scorecard_criteria('00000000-0000-0000-0000-000000000000'::uuid) LIMIT 1;


