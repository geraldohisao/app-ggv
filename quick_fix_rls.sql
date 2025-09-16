-- SOLUÇÃO RÁPIDA: Desabilitar RLS temporariamente para testar

-- 1. Desabilitar RLS na tabela calls
ALTER TABLE calls DISABLE ROW LEVEL SECURITY;

-- 2. Testar se agora temos dados
SELECT COUNT(*) as total_calls FROM calls;

-- 3. Testar filtro de duração
SELECT COUNT(*) as calls_100_plus FROM calls WHERE duration >= 100;
SELECT COUNT(*) as calls_60_plus FROM calls WHERE duration >= 60;

-- 4. Ver algumas chamadas com duração alta
SELECT id, duration, created_at, agent_id
FROM calls 
WHERE duration >= 60
ORDER BY duration DESC
LIMIT 10;

-- IMPORTANTE: Depois do teste, reabilitar RLS com:
-- ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

