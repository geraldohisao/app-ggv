-- Verificar dados reais do dia 08/09
-- Consulta 1: Resumo geral do dia 08/09
SELECT 
    DATE(created_at) as data,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
    COUNT(CASE WHEN status_voip != 'normal_clearing' OR status_voip IS NULL THEN 1 END) as nao_atendidas,
    ROUND(
        (COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*)), 
        2
    ) as taxa_atendimento_pct
FROM calls 
WHERE DATE(created_at) = '2025-09-08'
GROUP BY DATE(created_at);

-- Consulta 2: Detalhamento por status_voip no dia 08/09
SELECT 
    status_voip,
    COUNT(*) as quantidade
FROM calls 
WHERE DATE(created_at) = '2025-09-08'
GROUP BY status_voip
ORDER BY quantidade DESC;

-- Consulta 3: Verificar se existem dados em outras datas próximas
SELECT 
    DATE(created_at) as data,
    COUNT(*) as total_chamadas,
    COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas
FROM calls 
WHERE DATE(created_at) BETWEEN '2025-09-06' AND '2025-09-10'
GROUP BY DATE(created_at)
ORDER BY data;

-- Consulta 4: Verificar primeiras 10 chamadas do dia 08/09 para debug
SELECT 
    id,
    created_at,
    status_voip,
    duration,
    agent_id,
    deal_id
FROM calls 
WHERE DATE(created_at) = '2025-09-08'
ORDER BY created_at
LIMIT 10;

