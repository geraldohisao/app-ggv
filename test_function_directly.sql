-- =========================================
-- TESTE DIRETO DA FUNÇÃO
-- =========================================

-- 1. Verificar se a função existe
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_calls_with_filters' 
AND routine_schema = 'public';

-- 2. Testar chamada simples da função (sem especificar colunas)
SELECT * FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1, 0);

-- 3. Se o teste 2 funcionar, então testar apenas algumas colunas
-- SELECT id, status_voip FROM public.get_calls_with_filters(NULL, NULL, NULL, NULL, NULL, 1, 0);

-- 4. Teste alternativo: criar uma view temporária
CREATE OR REPLACE VIEW test_calls_view AS
SELECT 
    c.id,
    c.status_voip,
    public.map_status_voip(c.status_voip) as status_voip_friendly,
    c.enterprise,
    c.person,
    c.duration
FROM calls c
LIMIT 3;

-- 5. Testar a view
SELECT * FROM test_calls_view;
