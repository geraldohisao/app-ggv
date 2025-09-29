-- 🔍 Verificar se existe a função upsert_reactivated_lead
-- E se ela está funcionando corretamente

-- 1. Verificar se a função existe
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'upsert_reactivated_lead'
ORDER BY routine_name;

-- 2. Se não existir, vamos criar uma função básica
DO $$ 
BEGIN
    -- Verificar se a função já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_name = 'upsert_reactivated_lead'
    ) THEN
        -- Criar a função
        EXECUTE '
        CREATE OR REPLACE FUNCTION upsert_reactivated_lead(
            p_sdr TEXT,
            p_filter TEXT,
            p_status TEXT,
            p_count_leads INTEGER DEFAULT 0,
            p_cadence TEXT DEFAULT NULL,
            p_workflow_id TEXT DEFAULT NULL,
            p_execution_id TEXT DEFAULT NULL,
            p_n8n_data JSONB DEFAULT ''{}''::jsonb,
            p_error_message TEXT DEFAULT NULL
        ) RETURNS BIGINT AS $func$
        DECLARE
            result_id BIGINT;
        BEGIN
            -- Inserir novo registro
            INSERT INTO public.reactivated_leads (
                sdr,
                filter,
                status,
                count_leads,
                cadence,
                workflow_id,
                execution_id,
                n8n_data,
                error_message,
                created_at,
                updated_at
            ) VALUES (
                p_sdr,
                p_filter,
                p_status,
                p_count_leads,
                p_cadence,
                p_workflow_id,
                p_execution_id,
                p_n8n_data,
                p_error_message,
                NOW(),
                NOW()
            ) RETURNING id INTO result_id;
            
            RETURN result_id;
        END;
        $func$ LANGUAGE plpgsql;
        ';
        
        RAISE NOTICE '✅ Função upsert_reactivated_lead criada com sucesso';
    ELSE
        RAISE NOTICE '⚠️ Função upsert_reactivated_lead já existe';
    END IF;
END $$;

-- 3. Testar a função
SELECT upsert_reactivated_lead(
    'Teste SDR',
    'Lista de teste',
    'pending',
    0,
    'Cadência teste',
    'workflow_test_123',
    'execution_test_456',
    '{"test": true}'::jsonb,
    NULL
) as test_result;

-- 4. Verificar se o registro foi criado
SELECT 
    id,
    sdr,
    status,
    workflow_id,
    execution_id,
    created_at,
    updated_at
FROM public.reactivated_leads 
WHERE sdr = 'Teste SDR'
ORDER BY created_at DESC 
LIMIT 1;

-- 5. Limpar teste
DELETE FROM public.reactivated_leads WHERE sdr = 'Teste SDR';
