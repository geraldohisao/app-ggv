-- 🔧 Corrigir tabela reactivated_leads - Adicionar coluna updated_at
-- Problema: column "updated_at" of relation "reactivated_leads" does not exist

-- 1. Verificar estrutura atual da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Adicionar coluna updated_at se não existir
DO $$ 
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reactivated_leads' 
            AND column_name = 'updated_at'
            AND table_schema = 'public'
    ) THEN
        -- Adicionar a coluna
        ALTER TABLE public.reactivated_leads 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        RAISE NOTICE '✅ Coluna updated_at adicionada à tabela reactivated_leads';
    ELSE
        RAISE NOTICE '⚠️ Coluna updated_at já existe na tabela reactivated_leads';
    END IF;
END $$;

-- 3. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Aplicar trigger na tabela reactivated_leads
DROP TRIGGER IF EXISTS update_reactivated_leads_updated_at ON public.reactivated_leads;
CREATE TRIGGER update_reactivated_leads_updated_at
    BEFORE UPDATE ON public.reactivated_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Verificar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Testar inserção
INSERT INTO public.reactivated_leads (
    sdr,
    filter,
    status,
    count_leads,
    cadence,
    created_at
) VALUES (
    'Teste SDR',
    'Lista de teste',
    'pending',
    0,
    'Cadência teste',
    NOW()
) ON CONFLICT DO NOTHING;

-- 7. Verificar se o registro foi inserido com updated_at
SELECT 
    id,
    sdr,
    status,
    created_at,
    updated_at,
    (updated_at IS NOT NULL) as has_updated_at
FROM public.reactivated_leads 
WHERE sdr = 'Teste SDR'
ORDER BY created_at DESC 
LIMIT 1;

-- 8. Limpar teste
DELETE FROM public.reactivated_leads WHERE sdr = 'Teste SDR';

RAISE NOTICE '🎉 Tabela reactivated_leads corrigida com sucesso!';
