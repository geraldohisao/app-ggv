-- ANÁLISE COMPLETA DA TABELA CALLS
-- Mapear todos os campos e dados reais

-- 1. Estrutura completa da tabela
SELECT 'ESTRUTURA DA TABELA CALLS:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'calls'
ORDER BY ordinal_position;

-- 2. Amostra de dados reais com mapeamento
SELECT 'AMOSTRA DE DADOS REAIS:' as info;
SELECT 
  id,
  enterprise,                    -- Empresa
  deal_id,                      -- Deal
  person,                       -- Pessoa
  duration_formated,            -- Duração da chamada
  call_type,                    -- Etapa
  transcription IS NOT NULL as tem_transcricao,  -- Transcrição
  recording_url IS NOT NULL as tem_recording_url, -- Audio
  agent_id,                     -- SDR (ID)
  sdr_name,                     -- SDR (Nome)
  sdr_email,                    -- SDR (Email)
  status_voip,
  created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar dados não nulos por campo
SELECT 'QUALIDADE DOS DADOS:' as info;
SELECT 
  COUNT(*) as total_chamadas,
  COUNT(enterprise) as enterprise_preenchido,
  COUNT(deal_id) as deal_id_preenchido,
  COUNT(person) as person_preenchido,
  COUNT(duration_formated) as duration_formated_preenchido,
  COUNT(call_type) as call_type_preenchido,
  COUNT(transcription) as transcription_preenchido,
  COUNT(recording_url) as recording_url_preenchido,
  COUNT(agent_id) as agent_id_preenchido,
  COUNT(sdr_name) as sdr_name_preenchido,
  COUNT(sdr_email) as sdr_email_preenchido
FROM calls;

-- 4. Verificar função get_calls_with_filters atual
SELECT 'TESTANDO FUNÇÃO ATUAL:' as info;
SELECT 
  COUNT(*) as total_retornado
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 10, 0);

-- 5. Comparar campos da função vs tabela
SELECT 'COMPARAÇÃO FUNÇÃO vs TABELA:' as info;
SELECT 
  'Tabela direta' as origem,
  COUNT(*) as total,
  COUNT(enterprise) as tem_enterprise,
  COUNT(person) as tem_person,
  COUNT(duration_formated) as tem_duration_formated
FROM calls
UNION ALL
SELECT 
  'Função RPC' as origem,
  COUNT(*) as total,
  COUNT(enterprise) as tem_enterprise,
  COUNT(person) as tem_person,
  COUNT(duration_formated) as tem_duration_formated
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0);

-- 6. Verificar se há problemas de permissão RLS
SELECT 'VERIFICANDO RLS:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'calls';

SELECT 'Análise completa concluída!' as resultado;
