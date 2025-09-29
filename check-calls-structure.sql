-- 🔍 VERIFICAR: Estrutura da Tabela Calls
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar estrutura da tabela calls
SELECT 
    'Estrutura da Tabela Calls' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar se existe tabela de transcrições separada
SELECT 
    'Tabelas Relacionadas a Transcrições' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%transcript%' OR table_name ILIKE '%transcription%');

-- 3. Verificar colunas que podem conter transcrições
SELECT 
    'Colunas que Podem Conter Transcrições' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
AND (column_name ILIKE '%transcript%' OR column_name ILIKE '%text%' OR column_name ILIKE '%content%');

-- 4. Verificar dados de exemplo da tabela calls
SELECT 
    'Dados de Exemplo da Tabela Calls' as info,
    id,
    provider_call_id,
    status,
    duration,
    created_at
FROM calls 
ORDER BY created_at DESC
LIMIT 3;
