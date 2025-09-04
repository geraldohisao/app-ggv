-- CRIAR FUNÇÃO DE CHAMADAS DO ZERO
-- Baseada no mapeamento correto dos campos

-- 1. Remover função existente
DROP FUNCTION IF EXISTS get_calls_with_filters(text,text,text,text,text,integer,integer);
DROP FUNCTION IF EXISTS get_calls_simple();

-- 2. Criar função simples primeiro para testar
CREATE OR REPLACE FUNCTION get_calls_simple()
RETURNS TABLE (
  id UUID,
  enterprise TEXT,           -- Empresa
  deal_id TEXT,             -- Deal
  person TEXT,              -- Pessoa
  duration_formated TEXT,   -- Duração da chamada
  call_type TEXT,           -- Etapa
  transcription TEXT,       -- Transcrição
  recording_url TEXT,       -- Audio
  agent_id TEXT,            -- SDR (ID)
  sdr_name TEXT,            -- SDR (Nome)
  sdr_email TEXT,           -- SDR (Email)
  status_voip TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.enterprise,
    c.deal_id,
    c.person,
    c.duration_formated,
    c.call_type,
    c.transcription,
    c.recording_url,
    c.agent_id,
    c.sdr_name,
    c.sdr_email,
    c.status_voip,
    c.created_at
  FROM calls c
  ORDER BY c.created_at DESC
  LIMIT 50;
END;
$$;

-- 3. Testar função simples
SELECT 'Testando função simples...' as status;
SELECT 
  COUNT(*) as total,
  COUNT(enterprise) as tem_enterprise,
  COUNT(person) as tem_person,
  COUNT(sdr_name) as tem_sdr_name
FROM get_calls_simple();

-- 4. Criar função completa com filtros
CREATE OR REPLACE FUNCTION get_calls_with_filters(
  p_sdr_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_type TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_end_date TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  enterprise TEXT,           -- Empresa
  deal_id TEXT,             -- Deal
  person TEXT,              -- Pessoa
  duration_formated TEXT,   -- Duração formatada
  duration INTEGER,         -- Duração em segundos (convertida)
  call_type TEXT,           -- Etapa
  transcription TEXT,       -- Transcrição
  recording_url TEXT,       -- Audio
  agent_id TEXT,            -- SDR (ID)
  sdr_name TEXT,            -- SDR (Nome)
  sdr_email TEXT,           -- SDR (Email)
  status_voip TEXT,
  status TEXT,
  from_number TEXT,
  to_number TEXT,
  direction TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.enterprise,
    c.deal_id,
    c.person,
    c.duration_formated,
    -- Converter duration_formated para segundos
    CASE 
      WHEN c.duration_formated IS NOT NULL AND c.duration_formated != '00:00:00' THEN
        EXTRACT(EPOCH FROM c.duration_formated::TIME)::INTEGER
      ELSE COALESCE(c.duration, 0)
    END as duration,
    c.call_type,
    c.transcription,
    c.recording_url,
    c.agent_id,
    c.sdr_name,
    c.sdr_email,
    c.status_voip,
    c.status,
    c.from_number,
    c.to_number,
    c.direction,
    c.created_at
  FROM calls c
  WHERE 
    (p_sdr_email IS NULL OR c.sdr_email = p_sdr_email)
    AND (p_status IS NULL OR c.status_voip = p_status)
    AND (p_call_type IS NULL OR c.call_type = p_call_type)
    AND (p_start_date IS NULL OR c.created_at >= p_start_date::TIMESTAMPTZ)
    AND (p_end_date IS NULL OR c.created_at <= p_end_date::TIMESTAMPTZ)
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 5. Testar função completa
SELECT 'Testando função completa...' as status;
SELECT 
  COUNT(*) as total,
  COUNT(enterprise) as tem_enterprise,
  COUNT(person) as tem_person,
  COUNT(sdr_name) as tem_sdr_name,
  MAX(duration) as max_duration_convertida
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0);

-- 6. Mostrar amostra de dados
SELECT 'AMOSTRA DOS DADOS RETORNADOS:' as info;
SELECT 
  enterprise,
  deal_id,
  person,
  duration_formated,
  duration,
  sdr_name,
  call_type
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 5, 0);

SELECT 'Função criada do zero com mapeamento correto!' as resultado;
