-- =========================================
-- SOLUÇÃO: Adicionar coluna created_by à tabela sprint_items
-- Execute este script no SQL Editor do Supabase
-- =========================================

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sprint_items') THEN
        RAISE EXCEPTION 'Tabela sprint_items não existe. Execute o script de criação primeiro.';
    END IF;
END $$;

-- Adicionar coluna created_by se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sprint_items' 
        AND column_name = 'created_by'
    ) THEN
        -- Adicionar a coluna
        ALTER TABLE sprint_items 
        ADD COLUMN created_by UUID REFERENCES auth.users(id);
        
        RAISE NOTICE 'Coluna created_by adicionada com sucesso!';
        
        -- Atualizar registros existentes (se houver) com um valor padrão
        -- Pega o primeiro usuário encontrado ou deixa NULL
        UPDATE sprint_items 
        SET created_by = (SELECT id FROM auth.users LIMIT 1)
        WHERE created_by IS NULL;
        
        RAISE NOTICE 'Registros existentes atualizados!';
    ELSE
        RAISE NOTICE 'Coluna created_by já existe. Nenhuma alteração necessária.';
    END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_sprint_items_created_by ON sprint_items(created_by);

-- Verificar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sprint_items'
ORDER BY ordinal_position;

-- Contar registros
SELECT 
    COUNT(*) as total_items,
    COUNT(created_by) as items_with_creator
FROM sprint_items;

-- ✅ Script executado com sucesso! Verifique os resultados acima.
