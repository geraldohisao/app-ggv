-- 🔍 VERIFICAR: Estrutura real da tabela calls
-- Este script verifica quais colunas existem na tabela calls

-- 1. Verificar todas as colunas da tabela calls
SELECT 'Estrutura da tabela calls:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar dados de exemplo de uma ligação
SELECT 'Dados de exemplo de uma ligação:' as info;
SELECT 
    id,
    status,
    status_voip,
    call_type,
    duration,
    created_at
FROM calls 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Verificar valores únicos de status_voip
SELECT 'Valores únicos de status_voip:' as info;
SELECT 
    status_voip,
    COUNT(*) as total
FROM calls 
WHERE status_voip IS NOT NULL
GROUP BY status_voip
ORDER BY total DESC;

-- 4. Verificar valores únicos de status
SELECT 'Valores únicos de status:' as info;
SELECT 
    status,
    COUNT(*) as total
FROM calls 
WHERE status IS NOT NULL
GROUP BY status
ORDER BY total DESC;