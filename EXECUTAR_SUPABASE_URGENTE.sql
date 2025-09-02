-- ============================================================================
-- SCRIPT URGENTE PARA CORRIGIR DIAGNÓSTICO - EXECUTE NO SUPABASE SQL EDITOR
-- ============================================================================

-- ETAPA 1: CORRIGIR ERRO "stack depth limit exceeded"
-- ----------------------------------------------------------------------------

-- Remover políticas recursivas problemáticas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON knowledge_documents;

-- Criar políticas simples e não-recursivas
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Para knowledge_documents (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
        CREATE POLICY "Users can view own documents" ON knowledge_documents
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can insert own documents" ON knowledge_documents
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Users can delete own documents" ON knowledge_documents
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ETAPA 2: CRIAR SISTEMA DE RELATÓRIOS PÚBLICOS
-- ----------------------------------------------------------------------------

-- Limpar tabela anterior se existir
DROP TABLE IF EXISTS diagnostic_public_reports CASCADE;
DROP FUNCTION IF EXISTS get_public_report(TEXT) CASCADE;

-- Criar tabela de relatórios públicos
CREATE TABLE diagnostic_public_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    report JSONB NOT NULL,
    recipient_email TEXT,
    created_by UUID,
    deal_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_diagnostic_public_reports_token ON diagnostic_public_reports(token);
CREATE INDEX idx_diagnostic_public_reports_deal_id ON diagnostic_public_reports(deal_id);
CREATE INDEX idx_diagnostic_public_reports_expires_at ON diagnostic_public_reports(expires_at);

-- Criar função para recuperar relatórios
CREATE OR REPLACE FUNCTION get_public_report(p_token TEXT)
RETURNS TABLE (
    id UUID,
    token TEXT,
    report JSONB,
    recipient_email TEXT,
    created_by UUID,
    deal_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        r.id,
        r.token,
        r.report,
        r.recipient_email,
        r.created_by,
        r.deal_id,
        r.expires_at,
        r.created_at
    FROM diagnostic_public_reports r
    WHERE r.token = p_token
      AND (r.expires_at IS NULL OR r.expires_at > NOW())
    LIMIT 1;
$$;

-- ETAPA 3: CONFIGURAR PERMISSÕES SIMPLES
-- ----------------------------------------------------------------------------

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO authenticated;

-- Dar permissões básicas para a tabela (sem RLS para evitar problemas)
GRANT SELECT ON diagnostic_public_reports TO anon;
GRANT SELECT ON diagnostic_public_reports TO authenticated;
GRANT INSERT ON diagnostic_public_reports TO authenticated;

-- ETAPA 4: VERIFICAÇÃO
-- ----------------------------------------------------------------------------

-- Verificar se tudo foi criado corretamente
SELECT 'Tabela diagnostic_public_reports criada!' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnostic_public_reports');

SELECT 'Função get_public_report criada!' as status
WHERE EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_public_report');

-- Mostrar estrutura da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'diagnostic_public_reports' 
ORDER BY ordinal_position;

-- Verificar políticas ativas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'knowledge_documents', 'diagnostic_public_reports')
ORDER BY tablename, policyname;

-- ============================================================================
-- FINALIZADO - Se não houver erros, o sistema estará funcionando!
-- ============================================================================
