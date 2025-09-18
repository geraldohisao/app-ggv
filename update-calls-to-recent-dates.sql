-- ATUALIZAR AS DATAS DAS CHAMADAS PARA O PERÍODO ATUAL
-- Como as chamadas são de setembro/2025 e estamos em dezembro/2024,
-- vamos atualizar para datas recentes para aparecerem no dashboard

DO $$
DECLARE
    dias_diferenca INTEGER;
    data_mais_recente TIMESTAMP;
    data_hoje TIMESTAMP;
BEGIN
    -- Obter a data mais recente das chamadas
    SELECT MAX(created_at) INTO data_mais_recente FROM calls;
    
    -- Data de hoje
    data_hoje := NOW();
    
    -- Calcular diferença em dias
    dias_diferenca := EXTRACT(DAY FROM (data_mais_recente - data_hoje))::INTEGER;
    
    -- Mostrar informação
    RAISE NOTICE 'Data mais recente nas calls: %', data_mais_recente;
    RAISE NOTICE 'Data de hoje: %', data_hoje;
    RAISE NOTICE 'Diferença em dias: %', dias_diferenca;
    
    -- Se as datas estão no futuro (setembro 2025), trazer para o presente
    IF data_mais_recente > data_hoje THEN
        -- Atualizar todas as datas subtraindo a diferença
        UPDATE calls 
        SET 
            created_at = created_at - INTERVAL '1 year',
            updated_at = CASE 
                WHEN updated_at IS NOT NULL 
                THEN updated_at - INTERVAL '1 year'
                ELSE NULL 
            END,
            processed_at = CASE 
                WHEN processed_at IS NOT NULL 
                THEN processed_at - INTERVAL '1 year'
                ELSE NULL 
            END;
            
        RAISE NOTICE 'Datas atualizadas! Chamadas movidas de 2025 para 2024';
        
        -- Verificar o resultado
        SELECT MIN(created_at), MAX(created_at) 
        INTO data_mais_recente, data_hoje
        FROM calls;
        
        RAISE NOTICE 'Novo período: % até %', data_mais_recente, data_hoje;
    ELSE
        RAISE NOTICE 'Datas já estão corretas, não é necessário atualizar';
    END IF;
END $$;

-- Verificar o resultado final
SELECT 
    COUNT(*) as total_calls,
    MIN(created_at) as primeira_call,
    MAX(created_at) as ultima_call,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days') as calls_ultimos_14_dias,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as calls_ultimos_30_dias
FROM calls;

