-- Verificar estrutura real da tabela calls
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'calls'
ORDER BY ordinal_position;
