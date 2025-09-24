-- 🚀 PROCESSAR AS 71 ANÁLISES RESTANTES
-- Execute no Supabase SQL Editor

-- Processar todas as restantes usando a função
DO $$
DECLARE
  total_processed INTEGER := 0;
  batch_result INTEGER;
BEGIN
  -- Loop até processar todas
  WHILE (SELECT COUNT(*) FROM analysis_queue WHERE status = 'pending') > 0 LOOP
    -- Processar lote de 5
    SELECT process_analysis_queue() INTO batch_result;
    total_processed := total_processed + batch_result;
    
    -- Log progresso
    RAISE NOTICE 'Processado lote: % análises. Total: %', batch_result, total_processed;
    
    -- Pequena pausa
    PERFORM pg_sleep(0.5);
  END LOOP;
  
  RAISE NOTICE '✅ PROCESSAMENTO COMPLETO! Total: % análises processadas', total_processed;
END $$;

-- Verificar resultado final
SELECT 
  'RESULTADO FINAL' as info,
  status,
  COUNT(*) as quantidade
FROM analysis_queue
GROUP BY status;

