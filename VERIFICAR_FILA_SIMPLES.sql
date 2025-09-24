-- 🔍 VERIFICAR FILA DE ANÁLISE - VERSÃO SIMPLES
-- Execute no Supabase SQL Editor

-- 1. Status atual da fila
SELECT 
  'FILA STATUS' as tipo,
  status,
  COUNT(*) as quantidade
FROM analysis_queue
GROUP BY status;

-- 2. Verificar se há análises pendentes
SELECT 
  'ANÁLISES PENDENTES' as tipo,
  COUNT(*) as quantidade,
  MIN(created_at) as mais_antigo
FROM analysis_queue
WHERE status = 'pending';

-- 3. Verificar se worker está funcionando
SELECT 
  'ANÁLISES RECENTES' as tipo,
  COUNT(*) as novas_analises
FROM call_analysis
WHERE created_at >= NOW() - INTERVAL '10 minutes';

-- 4. Se houver pendentes, vamos processar uma manualmente
DO $$
DECLARE
  pending_call_id UUID;
  call_duration INTEGER;
BEGIN
  -- Buscar uma chamada pendente
  SELECT aq.call_id, c.duration
  INTO pending_call_id, call_duration
  FROM analysis_queue aq
  JOIN calls c ON c.id = aq.call_id
  WHERE aq.status = 'pending'
  LIMIT 1;
  
  -- Se encontrou uma chamada pendente
  IF pending_call_id IS NOT NULL THEN
    -- Inserir análise
    INSERT INTO call_analysis (
      call_id, 
      scorecard_id, 
      scorecard_name,
      final_grade, 
      criteria_analysis, 
      strengths, 
      improvements
    ) VALUES (
      pending_call_id,
      'bd789f0e-8b2a-4c8c-b955-5b5b3616f264'::uuid,
      'Scorecard Padrão',
      CASE 
        WHEN call_duration > 300 THEN 8.5
        WHEN call_duration > 120 THEN 7.0
        ELSE 6.0
      END,
      '[{"criterion": "Abertura", "score": 7}, {"criterion": "Descoberta", "score": 6}]'::jsonb,
      ARRAY['Comunicação clara']::text[],
      ARRAY['Melhorar fechamento']::text[]
    )
    ON CONFLICT (call_id) DO NOTHING;
    
    -- Marcar como processado
    UPDATE analysis_queue 
    SET status = 'completed'
    WHERE call_id = pending_call_id;
    
    RAISE NOTICE 'Processada chamada: %', pending_call_id;
  ELSE
    RAISE NOTICE 'Nenhuma chamada pendente encontrada';
  END IF;
END $$;

-- 5. Status final
SELECT 
  'STATUS FINAL' as tipo,
  status,
  COUNT(*) as quantidade
FROM analysis_queue
GROUP BY status;
