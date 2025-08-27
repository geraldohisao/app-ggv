-- Verificar se a função get_unique_users_with_calls existe e funciona
-- Execute no Supabase SQL Editor

-- 1. Verificar se a função existe
SELECT 'VERIFICANDO SE A FUNÇÃO EXISTE' as status;
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'get_unique_users_with_calls';

-- 2. Testar a função diretamente
SELECT 'TESTANDO A FUNÇÃO DIRETAMENTE' as status;
SELECT * FROM get_unique_users_with_calls();

-- 3. Se a função não existir, criar novamente
CREATE OR REPLACE FUNCTION get_unique_users_with_calls()
RETURNS TABLE(
    id TEXT,
    name TEXT,
    email TEXT,
    call_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id::TEXT as id,
        p.full_name as name,
        p.email,
        COALESCE(call_counts.total, 0) as call_count
    FROM profiles p
    LEFT JOIN (
        SELECT 
            agent_id,
            COUNT(*) as total
        FROM calls 
        WHERE agent_id IS NOT NULL
        GROUP BY agent_id
    ) call_counts ON p.id::TEXT = call_counts.agent_id
    WHERE p.full_name IS NOT NULL 
      AND p.full_name != ''
      AND p.full_name NOT LIKE 'Usuário%'
      AND call_counts.total > 0
    ORDER BY call_counts.total DESC, p.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Dar permissões
GRANT EXECUTE ON FUNCTION get_unique_users_with_calls() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unique_users_with_calls() TO anon;

-- 4. Testar novamente
SELECT 'TESTANDO APÓS RECRIAR' as status;
SELECT * FROM get_unique_users_with_calls();

SELECT 'TESTE CONCLUÍDO!' as status;
