-- TESTE FINAL DOS OPERADORES E CONTADORES

-- 1. Contar com diferentes operadores
SELECT 'duration > 60' as teste, COUNT(*) as quantidade FROM calls_with_users WHERE duration > 60
UNION ALL
SELECT 'duration = 60' as teste, COUNT(*) as quantidade FROM calls_with_users WHERE duration = 60
UNION ALL
SELECT 'duration >= 60' as teste, COUNT(*) as quantidade FROM calls_with_users WHERE duration >= 60
UNION ALL
SELECT 'duration > 59' as teste, COUNT(*) as quantidade FROM calls_with_users WHERE duration > 59
UNION ALL
SELECT 'duration >= 59' as teste, COUNT(*) as quantidade FROM calls_with_users WHERE duration >= 59;

-- 2. Verificar se a aplicação está usando calls_with_users ou calls
SELECT 'Tabela calls - duration >= 60' as fonte, COUNT(*) as quantidade FROM calls WHERE duration >= 60
UNION ALL
SELECT 'View calls_with_users - duration >= 60' as fonte, COUNT(*) as quantidade FROM calls_with_users WHERE duration >= 60;

