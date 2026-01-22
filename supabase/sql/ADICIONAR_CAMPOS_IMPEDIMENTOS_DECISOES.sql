-- =============================================
-- ADICIONAR CAMPOS DE IMPEDIMENTOS E DECISÕES
-- na tabela sprint_items
-- =============================================

-- Verificar se as colunas já existem antes de adicionar

-- 1. Campo para status de impedimento
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sprint_items' AND column_name = 'impediment_status'
    ) THEN
        ALTER TABLE sprint_items 
        ADD COLUMN impediment_status TEXT DEFAULT 'aberto'
        CHECK (impediment_status IN ('aberto', 'bloqueado', 'em_risco', 'resolvido'));
        
        RAISE NOTICE 'Coluna impediment_status adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna impediment_status já existe';
    END IF;
END $$;

-- 2. Campo para tipo de decisão
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sprint_items' AND column_name = 'decision_type'
    ) THEN
        ALTER TABLE sprint_items 
        ADD COLUMN decision_type TEXT
        CHECK (decision_type IS NULL OR decision_type IN (
            'ajuste_okr', 'priorizacao', 'alocacao_recursos', 
            'cancelamento_pivot', 'estrategica', 'tatica'
        ));
        
        RAISE NOTICE 'Coluna decision_type adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna decision_type já existe';
    END IF;
END $$;

-- 3. Campo para status de decisão
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sprint_items' AND column_name = 'decision_status'
    ) THEN
        ALTER TABLE sprint_items 
        ADD COLUMN decision_status TEXT DEFAULT 'decidido'
        CHECK (decision_status IS NULL OR decision_status IN (
            'decidido', 'em_execucao', 'pausado', 'cancelado', 'concluido'
        ));
        
        RAISE NOTICE 'Coluna decision_status adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna decision_status já existe';
    END IF;
END $$;

-- 4. Campo para impacto da decisão
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sprint_items' AND column_name = 'decision_impact'
    ) THEN
        ALTER TABLE sprint_items 
        ADD COLUMN decision_impact TEXT;
        
        RAISE NOTICE 'Coluna decision_impact adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna decision_impact já existe';
    END IF;
END $$;

-- 5. Campo para prazo da decisão
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sprint_items' AND column_name = 'decision_deadline'
    ) THEN
        ALTER TABLE sprint_items 
        ADD COLUMN decision_deadline DATE;
        
        RAISE NOTICE 'Coluna decision_deadline adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna decision_deadline já existe';
    END IF;
END $$;

-- Verificar resultado
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sprint_items'
AND column_name IN ('impediment_status', 'decision_type', 'decision_status', 'decision_impact', 'decision_deadline')
ORDER BY column_name;
