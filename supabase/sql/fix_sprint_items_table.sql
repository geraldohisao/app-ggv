-- Script para verificar e corrigir a tabela sprint_items
-- Execute este script no SQL Editor do Supabase se houver problemas ao salvar itens

-- =========================================
-- 1. CRIAR/VERIFICAR TABELA SPRINT_ITEMS
-- =========================================

CREATE TABLE IF NOT EXISTS sprint_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('iniciativa', 'impedimento', 'decisão', 'atividade', 'marco')),
    title TEXT NOT NULL CHECK (char_length(title) >= 3),
    description TEXT,
    responsible TEXT,
    responsible_user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em andamento', 'concluído')),
    due_date DATE,
    is_carry_over BOOLEAN DEFAULT false,
    project_id UUID,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_sprint_items_sprint_id ON sprint_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_items_type ON sprint_items(type);
CREATE INDEX IF NOT EXISTS idx_sprint_items_status ON sprint_items(status);
CREATE INDEX IF NOT EXISTS idx_sprint_items_created_by ON sprint_items(created_by);

-- =========================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- =========================================

ALTER TABLE sprint_items ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 4. POLÍTICAS DE SEGURANÇA (RLS POLICIES)
-- =========================================

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Permitir leitura de itens de sprint" ON sprint_items;
DROP POLICY IF EXISTS "Permitir criação de itens de sprint" ON sprint_items;
DROP POLICY IF EXISTS "Permitir atualização de itens de sprint" ON sprint_items;
DROP POLICY IF EXISTS "Permitir exclusão de itens de sprint" ON sprint_items;

-- Política de LEITURA: Todos usuários autenticados podem ler
CREATE POLICY "Permitir leitura de itens de sprint"
    ON sprint_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Política de CRIAÇÃO: Todos usuários autenticados podem criar
CREATE POLICY "Permitir criação de itens de sprint"
    ON sprint_items
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política de ATUALIZAÇÃO: Todos usuários autenticados podem atualizar
CREATE POLICY "Permitir atualização de itens de sprint"
    ON sprint_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política de EXCLUSÃO: Todos usuários autenticados podem deletar
CREATE POLICY "Permitir exclusão de itens de sprint"
    ON sprint_items
    FOR DELETE
    TO authenticated
    USING (true);

-- =========================================
-- 5. TRIGGER PARA UPDATED_AT
-- =========================================

CREATE OR REPLACE FUNCTION update_sprint_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sprint_items_updated_at ON sprint_items;

CREATE TRIGGER trigger_sprint_items_updated_at
    BEFORE UPDATE ON sprint_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sprint_items_updated_at();

-- =========================================
-- 6. VERIFICAÇÃO DE TABELAS RELACIONADAS
-- =========================================

-- Verificar se a tabela sprints existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sprints') THEN
        RAISE EXCEPTION 'Tabela "sprints" não existe. Execute o script de criação de sprints primeiro.';
    END IF;
END $$;

-- =========================================
-- 7. DADOS DE TESTE (OPCIONAL)
-- =========================================

-- Comentar as linhas abaixo se não quiser dados de teste
/*
-- Buscar uma sprint existente para teste
DO $$
DECLARE
    test_sprint_id UUID;
    test_user_id UUID;
BEGIN
    -- Buscar primeira sprint
    SELECT id INTO test_sprint_id FROM sprints LIMIT 1;
    
    -- Buscar usuário autenticado
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_sprint_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Criar itens de teste
        INSERT INTO sprint_items (sprint_id, type, title, description, status, created_by)
        VALUES 
            (test_sprint_id, 'iniciativa', 'Teste de Iniciativa', 'Descrição de teste', 'pendente', test_user_id),
            (test_sprint_id, 'impedimento', 'Teste de Impedimento', 'Descrição de teste', 'pendente', test_user_id),
            (test_sprint_id, 'decisão', 'Teste de Decisão', 'Descrição de teste', 'pendente', test_user_id)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Itens de teste criados com sucesso!';
    ELSE
        RAISE NOTICE 'Não foi possível criar itens de teste. Verifique se existe uma sprint e usuário.';
    END IF;
END $$;
*/

-- =========================================
-- 8. VERIFICAÇÃO FINAL
-- =========================================

-- Verificar estrutura da tabela
SELECT 
    'Tabela sprint_items criada com sucesso!' as status,
    COUNT(*) as total_items
FROM sprint_items;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'sprint_items'
ORDER BY policyname;

-- Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sprint_items'
ORDER BY indexname;
