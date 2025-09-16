-- =========================================
-- VERIFICAR ESTRUTURA DA FUNÇÃO
-- =========================================

-- 1. Verificar se a função existe e sua estrutura
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_calls_with_filters' 
AND routine_schema = 'public';

-- 2. Testar função map_status_voip diretamente
SELECT 
    'normal_clearing' as input,
    public.map_status_voip('normal_clearing') as output;

-- 3. Verificar se a função get_calls_with_filters retorna as colunas corretas
-- (Execute apenas se a função existir)
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'get_calls_with_filters'
AND table_schema = 'public';
