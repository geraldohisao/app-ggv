-- 🧹 LIMPEZA SIMPLES DA CHAMADA
-- Execute cada comando separadamente no SQL Editor

-- Comando 1: Ver análises existentes
SELECT * FROM call_analysis WHERE call_id = 'ef063707-7bb8-4f97-b55f-8d03e450a544';

-- Comando 2: Limpar todas as análises desta chamada
DELETE FROM call_analysis WHERE call_id = 'ef063707-7bb8-4f97-b55f-8d03e450a544';

-- Comando 3: Limpar scorecard da tabela calls
UPDATE calls SET scorecard = NULL WHERE id = 'ef063707-7bb8-4f97-b55f-8d03e450a544';

-- Comando 4: Verificar se limpou
SELECT scorecard, ai_status FROM calls WHERE id = 'ef063707-7bb8-4f97-b55f-8d03e450a544';
