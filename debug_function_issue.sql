-- =========================================
-- DEBUG: VERIFICAR SE AS FUNÇÕES EXISTEM
-- =========================================

-- 1. Verificar se a função map_status_voip existe
SELECT 
    routine_name, 
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'map_status_voip' 
AND routine_schema = 'public';

-- 2. Verificar se a função get_calls_with_filters existe
SELECT 
    routine_name, 
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_calls_with_filters' 
AND routine_schema = 'public';

-- 3. Testar função map_status_voip diretamente
SELECT 
    'normal_clearing' as status_voip,
    public.map_status_voip('normal_clearing') as status_amigavel;

-- 4. Verificar estrutura da tabela calls
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name LIKE '%status%'
ORDER BY column_name;

-- 5. Teste simples da tabela calls
SELECT 
    id,
    status_voip,
    enterprise,
    person,
    duration
FROM calls 
LIMIT 3;
