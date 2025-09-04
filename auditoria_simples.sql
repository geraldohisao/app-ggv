-- AUDITORIA SIMPLES E DIRETA
-- Comparar tabela vs função RPC

-- 1. Contagem total
SELECT 'CONTAGEM TOTAL:' as info;

SELECT 
  'Tabela calls' as origem,
  COUNT(*) as total
FROM calls;

SELECT 
  'Função RPC' as origem,
  COUNT(*) as total
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1000, 0);

-- 2. Verificar últimas 20 chamadas
SELECT 'ÚLTIMAS 20 CHAMADAS NA TABELA:' as info;
SELECT 
  id,
  enterprise,
  person,
  agent_id,
  duration_formated,
  call_type,
  recording_url IS NOT NULL as tem_audio,
  transcription IS NOT NULL as tem_transcricao,
  created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 20;

-- 3. Verificar últimas 20 chamadas via função
SELECT 'ÚLTIMAS 20 CHAMADAS VIA FUNÇÃO:' as info;
SELECT 
  id,
  enterprise,
  person,
  agent_id,
  duration_formated,
  call_type,
  recording_url IS NOT NULL as tem_audio,
  transcription IS NOT NULL as tem_transcricao,
  created_at
FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 20, 0)
ORDER BY created_at DESC;

-- 4. Verificar se há diferenças
SELECT 'ANÁLISE DE DIFERENÇAS:' as info;

-- IDs que estão na tabela mas não na função (amostra)
SELECT 
  'IDs na tabela mas possivelmente não na função' as problema,
  c.id,
  c.agent_id,
  c.sdr_name,
  c.created_at
FROM calls c
LEFT JOIN (
  SELECT id FROM get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 100, 0)
) f ON c.id = f.id
WHERE f.id IS NULL
ORDER BY c.created_at DESC
LIMIT 5;

-- 5. Verificar RLS (Row Level Security)
SELECT 'VERIFICANDO RLS:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'calls';

-- 6. Verificar políticas RLS ativas
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  pol.polroles as roles,
  pol.polqual as qual_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'calls';

SELECT 'Auditoria simples concluída!' as resultado;
