-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS para testar
-- ATENÇÃO: Isso remove a segurança da tabela temporariamente

-- Desabilitar RLS na tabela calls
ALTER TABLE calls DISABLE ROW LEVEL SECURITY;

-- Testar se o filtro funciona agora
SELECT COUNT(*) as total_calls FROM calls;
SELECT COUNT(*) as calls_100_plus FROM calls WHERE duration >= 100;
SELECT COUNT(*) as calls_60_plus FROM calls WHERE duration >= 60;

-- Para REABILITAR depois do teste (IMPORTANTE!):
-- ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
