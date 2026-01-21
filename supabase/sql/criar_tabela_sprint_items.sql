-- =========================================
-- CRIAR TABELA sprint_items do Zero
-- Execute APENAS se a tabela não existir
-- =========================================

-- 1. Criar tabela sprint_items
CREATE TABLE IF NOT EXISTS sprint_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sprint_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('iniciativa', 'impedimento', 'decisão', 'atividade', 'marco')),
    title TEXT NOT NULL CHECK (char_length(title) >= 3),
    description TEXT,
    responsible TEXT,
    responsible_user_id UUID,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em andamento', 'concluído')),
    due_date DATE,
    is_carry_over BOOLEAN DEFAULT false,
    project_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_sprint_items_sprint_id ON sprint_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_items_type ON sprint_items(type);
CREATE INDEX IF NOT EXISTS idx_sprint_items_status ON sprint_items(status);
CREATE INDEX IF NOT EXISTS idx_sprint_items_created_by ON sprint_items(created_by);

-- 3. Habilitar RLS
ALTER TABLE sprint_items ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS (permissivas para todos usuários autenticados)
CREATE POLICY IF NOT EXISTS "Permitir leitura de itens de sprint"
    ON sprint_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY IF NOT EXISTS "Permitir criação de itens de sprint"
    ON sprint_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Permitir atualização de itens de sprint"
    ON sprint_items FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY IF NOT EXISTS "Permitir exclusão de itens de sprint"
    ON sprint_items FOR DELETE
    TO authenticated
    USING (true);

-- 5. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_sprint_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_sprint_items_updated_at
    BEFORE UPDATE ON sprint_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sprint_items_updated_at();

-- 6. Verificar criação
SELECT 
    'Tabela sprint_items criada com sucesso!' as status,
    COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sprint_items';

-- ✅ Pronto! A tabela foi criada com a coluna created_by incluída!
