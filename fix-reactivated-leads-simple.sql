-- 🔧 Corrigir tabela reactivated_leads - Adicionar coluna updated_at
-- Versão simplificada sem erros de sintaxe

-- 1. Verificar estrutura atual
SELECT 'Estrutura atual da tabela:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Adicionar coluna updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reactivated_leads' 
            AND column_name = 'updated_at'
            AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.reactivated_leads 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE '✅ Coluna updated_at adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna updated_at já existe';
    END IF;
END $$;

-- 3. Criar função para trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger
DROP TRIGGER IF EXISTS update_reactivated_leads_updated_at ON public.reactivated_leads;
CREATE TRIGGER update_reactivated_leads_updated_at
    BEFORE UPDATE ON public.reactivated_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Verificar estrutura final
SELECT 'Estrutura após correção:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Confirmar sucesso
DO $$ 
BEGIN
    RAISE NOTICE '🎉 Correção concluída com sucesso!';
END $$;
