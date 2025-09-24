
-- Verificar se existem dados na tabela calls com insights
SELECT 
    id,
    deal_id,
    insights->>'enterprise' as enterprise,
    insights->>'person' as person,
    insights->>'company' as company,
    insights
FROM calls 
LIMIT 3;

