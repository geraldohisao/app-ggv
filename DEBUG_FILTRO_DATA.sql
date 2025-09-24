-- 🔍 DEBUG FILTRO DE DATA - 19/09/2025
-- Execute para ver os dados reais e identificar o problema

-- ===============================================================
-- ETAPA 1: Ver as datas reais na tabela calls
-- ===============================================================

SELECT 
    'DATAS REAIS NO BANCO' as info,
    id,
    deal_id,
    created_at,
    created_at::date as data_simples,
    to_char(created_at, 'DD/MM/YYYY') as data_formatada,
    to_char(created_at, 'YYYY-MM-DD') as data_iso
FROM calls 
ORDER BY created_at DESC 
LIMIT 10;

-- ===============================================================
-- ETAPA 2: Testar filtro para 19/09/2025
-- ===============================================================

SELECT 
    'FILTRO 19/09/2025' as teste,
    COUNT(*) as total_chamadas
FROM calls 
WHERE created_at::date = '2025-09-19';

-- ===============================================================
-- ETAPA 3: Testar range 19/09 a 19/09
-- ===============================================================

SELECT 
    'RANGE 19/09 - 19/09' as teste,
    COUNT(*) as total_chamadas
FROM calls 
WHERE created_at >= '2025-09-19 00:00:00'::timestamptz 
  AND created_at <= '2025-09-19 23:59:59'::timestamptz;

-- ===============================================================
-- ETAPA 4: Ver todas as datas únicas
-- ===============================================================

SELECT 
    'DATAS ÚNICAS DISPONÍVEIS' as info,
    created_at::date as data,
    COUNT(*) as qtd_chamadas
FROM calls 
GROUP BY created_at::date
ORDER BY data DESC
LIMIT 15;

-- ===============================================================
-- ETAPA 5: Testar a RPC com parâmetros de data
-- ===============================================================

SELECT 
    'TESTE RPC COM DATA' as teste,
    total_count
FROM public.get_calls_with_filters(
    p_start_date := '2025-09-19T00:00:00.000Z',
    p_end_date := '2025-09-19T23:59:59.999Z',
    p_limit := 1
)
LIMIT 1;

