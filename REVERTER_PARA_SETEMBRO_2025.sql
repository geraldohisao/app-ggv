-- 🔄 REVERTER ALTERAÇÕES E COLOCAR DATAS EM SETEMBRO 2025
-- Execute no Supabase SQL Editor

-- ===============================================================
-- 1. VERIFICAR SITUAÇÃO ATUAL
-- ===============================================================

SELECT 
  'SITUAÇÃO ANTES DA REVERSÃO' as status,
  COUNT(*) as total_chamadas,
  MIN(created_at) as primeira_chamada,
  MAX(created_at) as ultima_chamada,
  to_char(MIN(created_at), 'DD/MM/YYYY HH24:MI') as primeira_formatada,
  to_char(MAX(created_at), 'DD/MM/YYYY HH24:MI') as ultima_formatada
FROM calls;

-- ===============================================================
-- 2. REVERTER E REDISTRIBUIR DATAS PARA SETEMBRO 2025
-- ===============================================================

DO $$
DECLARE
    total_calls INTEGER;
    call_record RECORD;
    new_date TIMESTAMP WITH TIME ZONE;
    day_counter INTEGER := 0;
    calls_per_day INTEGER := 100; -- Aproximadamente 100 calls por dia
BEGIN
    -- Contar APENAS chamadas de 2024 (que serão alteradas)
    SELECT COUNT(*) INTO total_calls FROM calls WHERE EXTRACT(YEAR FROM created_at) = 2024;
    RAISE NOTICE 'Chamadas de 2024 a processar: %', total_calls;
    
    -- Atualizar TODAS as chamadas de 2024 de uma só vez
    -- Preservar DIA e HORA, mudar apenas ANO (2024→2025) e MÊS (dezembro→setembro)
    UPDATE calls 
    SET 
        created_at = CASE 
            -- Preservar dia e hora, mudar de 2024-12-XX para 2025-09-XX
            WHEN EXTRACT(YEAR FROM created_at) = 2024 AND EXTRACT(MONTH FROM created_at) = 12 THEN
                MAKE_TIMESTAMPTZ(
                    2025, -- ano
                    9,    -- setembro
                    LEAST(EXTRACT(DAY FROM created_at)::INTEGER, 30), -- dia (máximo 30 para setembro)
                    EXTRACT(HOUR FROM created_at)::INTEGER,
                    EXTRACT(MINUTE FROM created_at)::INTEGER, 
                    EXTRACT(SECOND FROM created_at)::INTEGER,
                    'UTC'
                )
            ELSE created_at -- Manter outras datas inalteradas
        END,
        updated_at = CASE 
            WHEN updated_at IS NOT NULL AND EXTRACT(YEAR FROM created_at) = 2024 AND EXTRACT(MONTH FROM created_at) = 12 THEN
                MAKE_TIMESTAMPTZ(
                    2025, -- ano
                    9,    -- setembro  
                    LEAST(EXTRACT(DAY FROM updated_at)::INTEGER, 30), -- dia
                    EXTRACT(HOUR FROM updated_at)::INTEGER,
                    EXTRACT(MINUTE FROM updated_at)::INTEGER,
                    EXTRACT(SECOND FROM updated_at)::INTEGER,
                    'UTC'
                )
            ELSE updated_at
        END,
        processed_at = CASE 
            WHEN processed_at IS NOT NULL AND EXTRACT(YEAR FROM created_at) = 2024 AND EXTRACT(MONTH FROM created_at) = 12 THEN
                MAKE_TIMESTAMPTZ(
                    2025, -- ano
                    9,    -- setembro
                    LEAST(EXTRACT(DAY FROM processed_at)::INTEGER, 30), -- dia
                    EXTRACT(HOUR FROM processed_at)::INTEGER,
                    EXTRACT(MINUTE FROM processed_at)::INTEGER,
                    EXTRACT(SECOND FROM processed_at)::INTEGER,
                    'UTC'
                )
            ELSE processed_at
        END
    WHERE EXTRACT(YEAR FROM created_at) = 2024;
    
    RAISE NOTICE 'CORREÇÃO CONCLUÍDA! % chamadas de 2024 movidas para setembro 2025', total_calls;
    RAISE NOTICE 'Preservados: dia e hora originais, alterados: ano (2024→2025) e mês (dezembro→setembro)';
END $$;

-- ===============================================================
-- 3. VERIFICAR RESULTADO FINAL
-- ===============================================================

SELECT 
  'RESULTADO FINAL' as status,
  COUNT(*) as total_chamadas,
  MIN(created_at) as primeira_chamada,
  MAX(created_at) as ultima_chamada,
  to_char(MIN(created_at), 'DD/MM/YYYY HH24:MI') as primeira_formatada,
  to_char(MAX(created_at), 'DD/MM/YYYY HH24:MI') as ultima_formatada,
  EXTRACT(YEAR FROM MIN(created_at)) as ano_inicial,
  EXTRACT(YEAR FROM MAX(created_at)) as ano_final
FROM calls;

-- ===============================================================
-- 4. DISTRIBUIÇÃO POR DIA EM SETEMBRO/OUTUBRO 2025 (APÓS CORREÇÃO)
-- ===============================================================

SELECT 
  'DISTRIBUIÇÃO POR DIA' as info,
  DATE(created_at) as data,
  to_char(created_at, 'DD/MM/YYYY (Day)') as data_amigavel,
  COUNT(*) as chamadas_no_dia,
  COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) as atendidas,
  ROUND(COUNT(CASE WHEN status_voip = 'normal_clearing' THEN 1 END) * 100.0 / COUNT(*), 1) as taxa_atendimento
FROM calls 
WHERE EXTRACT(YEAR FROM created_at) = 2025
  AND EXTRACT(MONTH FROM created_at) IN (9, 10, 11) -- setembro, outubro, novembro
GROUP BY DATE(created_at), to_char(created_at, 'DD/MM/YYYY (Day)')
ORDER BY data
LIMIT 30; -- Primeiros 30 dias

-- ===============================================================
-- 5. VERIFICAR TOTAIS POR MÊS
-- ===============================================================

SELECT 
  'TOTAIS POR MÊS EM 2025' as info,
  EXTRACT(MONTH FROM created_at) as mes,
  CASE EXTRACT(MONTH FROM created_at)
    WHEN 9 THEN 'Setembro'
    WHEN 10 THEN 'Outubro'  
    WHEN 11 THEN 'Novembro'
    WHEN 12 THEN 'Dezembro'
    ELSE 'Outro'
  END as mes_nome,
  COUNT(*) as chamadas_no_mes,
  MIN(created_at) as primeira_do_mes,
  MAX(created_at) as ultima_do_mes
FROM calls
WHERE EXTRACT(YEAR FROM created_at) = 2025
GROUP BY EXTRACT(MONTH FROM created_at)
ORDER BY mes;
