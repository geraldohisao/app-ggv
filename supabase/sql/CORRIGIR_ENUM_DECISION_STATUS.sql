-- =============================================
-- CORRIGIR ENUM decision_status
-- Adicionar valores que faltam
-- =============================================

-- Primeiro, verificar os valores atuais do enum
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'decision_status');

-- Adicionar valor 'pausado' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'decision_status')
        AND enumlabel = 'pausado'
    ) THEN
        ALTER TYPE decision_status ADD VALUE 'pausado';
        RAISE NOTICE 'Valor pausado adicionado ao enum decision_status';
    ELSE
        RAISE NOTICE 'Valor pausado já existe no enum';
    END IF;
END $$;

-- Adicionar valor 'cancelado' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'decision_status')
        AND enumlabel = 'cancelado'
    ) THEN
        ALTER TYPE decision_status ADD VALUE 'cancelado';
        RAISE NOTICE 'Valor cancelado adicionado ao enum decision_status';
    ELSE
        RAISE NOTICE 'Valor cancelado já existe no enum';
    END IF;
END $$;

-- Adicionar valor 'concluido' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'decision_status')
        AND enumlabel = 'concluido'
    ) THEN
        ALTER TYPE decision_status ADD VALUE 'concluido';
        RAISE NOTICE 'Valor concluido adicionado ao enum decision_status';
    ELSE
        RAISE NOTICE 'Valor concluido já existe no enum';
    END IF;
END $$;

-- Verificar também o enum impediment_status se existir
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'impediment_status') THEN
        -- Verificar e adicionar valores se necessário
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'impediment_status')
            AND enumlabel = 'bloqueado'
        ) THEN
            ALTER TYPE impediment_status ADD VALUE 'bloqueado';
            RAISE NOTICE 'Valor bloqueado adicionado ao enum impediment_status';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'impediment_status')
            AND enumlabel = 'em_risco'
        ) THEN
            ALTER TYPE impediment_status ADD VALUE 'em_risco';
            RAISE NOTICE 'Valor em_risco adicionado ao enum impediment_status';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'impediment_status')
            AND enumlabel = 'resolvido'
        ) THEN
            ALTER TYPE impediment_status ADD VALUE 'resolvido';
            RAISE NOTICE 'Valor resolvido adicionado ao enum impediment_status';
        END IF;
    END IF;
END $$;

-- Verificar resultado final
SELECT 'decision_status' as enum_name, enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'decision_status')
UNION ALL
SELECT 'impediment_status' as enum_name, enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'impediment_status')
ORDER BY enum_name, enumlabel;
