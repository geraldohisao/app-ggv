-- TESTE_DEAL_ID_CHAMADA.sql
-- Script para testar se a chamada tem deal_id

-- 1. Verificar se a chamada existe
SELECT 
    'Chamada encontrada' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM calls WHERE id = 'b29348dc-fdab-4dad-9221-a3dd88fa1a03') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as resultado;

-- 2. Buscar dados da chamada específica
SELECT 
    id,
    deal_id,
    from_number,
    to_number,
    agent_id,
    status,
    duration,
    transcription,
    created_at
FROM calls 
WHERE id = 'b29348dc-fdab-4dad-9221-a3dd88fa1a03';

-- 3. Verificar se há deal_id
SELECT 
    'Deal ID da chamada' as info,
    CASE 
        WHEN deal_id IS NOT NULL AND deal_id != '' 
        THEN '✅ DEAL ID: ' || deal_id
        ELSE '❌ SEM DEAL ID'
    END as status
FROM calls 
WHERE id = 'b29348dc-fdab-4dad-9221-a3dd88fa1a03';

-- 4. Se não tiver deal_id, vamos inserir um de teste
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM calls WHERE id = 'b29348dc-fdab-4dad-9221-a3dd88fa1a03') THEN
        INSERT INTO calls (
            id,
            provider_call_id,
            deal_id,
            from_number,
            to_number,
            agent_id,
            status,
            duration,
            transcription,
            created_at
        ) VALUES (
            'b29348dc-fdab-4dad-9221-a3dd88fa1a03',
            'test_call_001',
            'deal_teste_123',
            '+5511999999999',
            '+5511888888888',
            'agent_teste',
            'processed',
            300,
            'Esta é uma transcrição de teste para verificar se o assistente IA funciona corretamente.',
            NOW()
        );
        RAISE NOTICE '✅ Chamada de teste criada com deal_id: deal_teste_123';
    ELSE
        RAISE NOTICE 'ℹ️ Chamada já existe, verificando deal_id...';
    END IF;
END $$;

-- 5. Verificar novamente após possível inserção
SELECT 
    id,
    deal_id,
    CASE 
        WHEN deal_id IS NOT NULL AND deal_id != '' 
        THEN '✅ ASSISTENTE IA FUNCIONARÁ'
        ELSE '❌ ASSISTENTE IA NÃO FUNCIONARÁ'
    END as status_assistente
FROM calls 
WHERE id = 'b29348dc-fdab-4dad-9221-a3dd88fa1a03';

-- 6. Testar função com o deal_id encontrado
DO $$
DECLARE
    test_deal_id TEXT;
BEGIN
    SELECT deal_id INTO test_deal_id 
    FROM calls 
    WHERE id = 'b29348dc-fdab-4dad-9221-a3dd88fa1a03';
    
    IF test_deal_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testando função get_deal_transcriptions com deal_id: %', test_deal_id;
        PERFORM get_deal_transcriptions(test_deal_id);
        RAISE NOTICE '✅ Função funciona com deal_id: %', test_deal_id;
    ELSE
        RAISE NOTICE '❌ Não é possível testar: deal_id é NULL';
    END IF;
END $$;
