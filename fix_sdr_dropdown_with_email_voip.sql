-- =========================================
-- CORRIGIR get_unique_sdrs PARA USAR email_voip
-- =========================================

-- 1. Verificar estrutura atual da tabela calls
SELECT 
    '=== VERIFICANDO COLUNAS DA TABELA CALLS ===' as info;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND column_name IN ('agent_id', 'email_voip')
ORDER BY column_name;

-- 2. Ver distribuição de dados
SELECT 
    '=== DISTRIBUIÇÃO DE DADOS ===' as info;

SELECT 
    'agent_id (calls)' as coluna,
    COUNT(*) as total,
    COUNT(DISTINCT agent_id) as unicos,
    COUNT(*) - COUNT(agent_id) as nulls
FROM calls
UNION ALL
SELECT 
    'email_voip (profiles)' as coluna,
    COUNT(*) as total,
    COUNT(DISTINCT email_voip) as unicos,
    COUNT(*) - COUNT(email_voip) as nulls
FROM profiles;

-- 3. Ver alguns exemplos com JOIN
SELECT 
    '=== EXEMPLOS DE DADOS COM JOIN ===' as info;

SELECT 
    c.agent_id,
    p.email_voip,
    p.email as profile_email,
    COUNT(*) as calls_count
FROM calls c
LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
WHERE c.agent_id IS NOT NULL
GROUP BY c.agent_id, p.email_voip, p.email
ORDER BY calls_count DESC
LIMIT 10;

-- 4. Recriar função get_unique_sdrs usando email_voip como prioridade
DROP FUNCTION IF EXISTS public.get_unique_sdrs();

CREATE OR REPLACE FUNCTION public.get_unique_sdrs()
RETURNS TABLE (
    sdr_email TEXT,
    sdr_name TEXT,
    sdr_avatar_url TEXT,
    call_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        -- Usar email_voip do profile se disponível, senão agent_id da call
        COALESCE(p.email_voip, c.agent_id) as sdr_email,
        -- Nome do profile ou extraído do email
        COALESCE(
            p.full_name,
            INITCAP(REPLACE(
                SPLIT_PART(COALESCE(p.email_voip, c.agent_id), '@', 1), 
                '.', ' '
            ))
        ) as sdr_name,
        -- Avatar do profile ou gerado
        COALESCE(
            p.avatar_url,
            'https://i.pravatar.cc/64?u=' || COALESCE(p.email_voip, c.agent_id)
        ) as sdr_avatar_url,
        COUNT(*) as call_count
    FROM calls c
    LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
    WHERE c.agent_id IS NOT NULL
    GROUP BY 
        COALESCE(p.email_voip, c.agent_id),
        p.full_name,
        p.avatar_url
    HAVING COUNT(*) > 0
    ORDER BY call_count DESC;
$$;

-- 5. Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs() TO anon;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs() TO service_role;

-- 6. Testar nova função
SELECT 
    '=== TESTANDO NOVA FUNÇÃO get_unique_sdrs ===' as teste;

SELECT 
    sdr_email,
    sdr_name,
    call_count
FROM public.get_unique_sdrs()
ORDER BY call_count DESC
LIMIT 10;

SELECT 'Função get_unique_sdrs atualizada para usar email_voip!' as status;
