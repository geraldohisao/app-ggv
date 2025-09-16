-- =========================================
-- CRIAR FOREIGN KEY ENTRE CALLS E PROFILES
-- Para permitir JOINs automáticos no PostgREST
-- =========================================

-- 1. Verificar estrutura atual das tabelas
SELECT 
    '=== VERIFICANDO COLUNAS DAS TABELAS ===' as info;

-- Colunas da tabela calls
SELECT 'calls' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND column_name IN ('agent_id', 'sdr_id')
ORDER BY column_name;

-- Colunas da tabela profiles  
SELECT 'profiles' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('id', 'email', 'email_voip')
ORDER BY column_name;

-- 2. Ver alguns dados para entender a relação
SELECT 
    '=== EXEMPLOS DE DADOS PARA MAPEAMENTO ===' as info;

SELECT 
    c.agent_id,
    p.email,
    p.email_voip,
    COUNT(*) as calls_count
FROM calls c
LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
WHERE c.agent_id IS NOT NULL
GROUP BY c.agent_id, p.email, p.email_voip
ORDER BY calls_count DESC
LIMIT 10;

-- 3. Criar coluna de referência se não existir
-- (Adicionar coluna profile_id na tabela calls)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' 
        AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE calls ADD COLUMN profile_id UUID;
        RAISE NOTICE 'Coluna profile_id adicionada à tabela calls';
    ELSE
        RAISE NOTICE 'Coluna profile_id já existe na tabela calls';
    END IF;
END $$;

-- 4. Atualizar profile_id baseado no agent_id
UPDATE calls 
SET profile_id = p.id
FROM profiles p 
WHERE LOWER(TRIM(calls.agent_id)) = LOWER(TRIM(p.email))
  AND calls.profile_id IS NULL;

-- 5. Criar foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_calls_profile_id'
    ) THEN
        ALTER TABLE calls 
        ADD CONSTRAINT fk_calls_profile_id 
        FOREIGN KEY (profile_id) 
        REFERENCES profiles(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint criada';
    ELSE
        RAISE NOTICE 'Foreign key constraint já existe';
    END IF;
END $$;

-- 6. Verificar resultado
SELECT 
    '=== VERIFICANDO FOREIGN KEY CRIADA ===' as resultado;

SELECT 
    COUNT(*) as total_calls,
    COUNT(profile_id) as calls_com_profile,
    COUNT(*) - COUNT(profile_id) as calls_sem_profile
FROM calls;

SELECT 'Foreign key entre calls e profiles criada com sucesso!' as status;
