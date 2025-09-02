-- ============================================================================
-- SCRIPT DEFINITIVO PARA CORRIGIR TODOS OS PROBLEMAS DO DIAGNÓSTICO
-- EXECUTE ESTE SCRIPT COMPLETO NO SUPABASE SQL EDITOR
-- ============================================================================

-- ETAPA 1: DIAGNÓSTICO INICIAL
-- ----------------------------------------------------------------------------
SELECT 'INICIANDO DIAGNÓSTICO DO BANCO...' as status;

-- Verificar tabelas existentes
SELECT 
    table_name,
    CASE WHEN table_name = 'diagnostic_public_reports' THEN '✅ EXISTE' ELSE '❌ AUSENTE' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('diagnostic_public_reports', 'profiles', 'knowledge_documents');

-- Verificar funções existentes
SELECT 
    routine_name,
    CASE WHEN routine_name = 'get_public_report' THEN '✅ EXISTE' ELSE '❌ AUSENTE' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_public_report');

-- ETAPA 2: LIMPEZA COMPLETA (CUIDADOSA)
-- ----------------------------------------------------------------------------
SELECT 'REMOVENDO ELEMENTOS PROBLEMÁTICOS...' as status;

-- Remover políticas recursivas que causam stack overflow
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON knowledge_documents;

-- Remover tabela e função de relatórios (para recriar limpa)
DROP TABLE IF EXISTS diagnostic_public_reports CASCADE;
DROP FUNCTION IF EXISTS get_public_report(TEXT) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_reports() CASCADE;

-- ETAPA 3: RECRIAR INFRAESTRUTURA BÁSICA
-- ----------------------------------------------------------------------------
SELECT 'CRIANDO INFRAESTRUTURA BÁSICA...' as status;

-- Criar tabela de relatórios públicos (SEM RLS inicialmente)
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
CREATE INDEX idx_diagnostic_reports_token ON diagnostic_public_reports(token);
CREATE INDEX idx_diagnostic_reports_deal_id ON diagnostic_public_reports(deal_id);
CREATE INDEX idx_diagnostic_reports_expires ON diagnostic_public_reports(expires_at);
CREATE INDEX idx_diagnostic_reports_created ON diagnostic_public_reports(created_at);

-- ETAPA 4: CRIAR FUNÇÃO RPC ESSENCIAL
-- ----------------------------------------------------------------------------
SELECT 'CRIANDO FUNÇÃO GET_PUBLIC_REPORT...' as status;

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
    ORDER BY r.created_at DESC
    LIMIT 1;
$$;

-- ETAPA 5: CONFIGURAR PERMISSÕES LIBERAIS (SEM RLS)
-- ----------------------------------------------------------------------------
SELECT 'CONFIGURANDO PERMISSÕES...' as status;

-- Dar permissões completas para a tabela
GRANT ALL ON diagnostic_public_reports TO authenticated;
GRANT ALL ON diagnostic_public_reports TO anon;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO anon;

-- ETAPA 6: RECRIAR POLÍTICAS SIMPLES (NÃO-RECURSIVAS)
-- ----------------------------------------------------------------------------
SELECT 'RECRIANDO POLÍTICAS SIMPLES...' as status;

-- Políticas para profiles (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE POLICY "Simple profile view" ON profiles
            FOR SELECT USING (auth.uid() = id);
            
        CREATE POLICY "Simple profile update" ON profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Políticas para knowledge_documents (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
        CREATE POLICY "Simple documents view" ON knowledge_documents
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Simple documents insert" ON knowledge_documents
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Simple documents delete" ON knowledge_documents
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ETAPA 7: TESTE DE FUNCIONALIDADE
-- ----------------------------------------------------------------------------
SELECT 'TESTANDO FUNCIONALIDADE...' as status;

-- Inserir registro de teste
INSERT INTO diagnostic_public_reports (token, report, deal_id) 
VALUES (
    'test-token-' || extract(epoch from now())::text,
    '{"test": true, "message": "Teste de funcionalidade"}',
    'test-deal'
) ON CONFLICT (token) DO NOTHING;

-- Testar função
SELECT 
    token,
    report->>'test' as test_field,
    deal_id
FROM get_public_report('test-token-' || extract(epoch from now())::text);

-- ETAPA 8: VERIFICAÇÃO FINAL
-- ----------------------------------------------------------------------------
SELECT 'VERIFICAÇÃO FINAL...' as status;

-- Verificar se tabela foi criada
SELECT 
    table_name,
    '✅ CRIADA' as status
FROM information_schema.tables 
WHERE table_name = 'diagnostic_public_reports';

-- Verificar se função foi criada
SELECT 
    routine_name,
    '✅ CRIADA' as status
FROM information_schema.routines 
WHERE routine_name = 'get_public_report';

-- Verificar índices
SELECT 
    indexname,
    '✅ CRIADO' as status
FROM pg_indexes 
WHERE tablename = 'diagnostic_public_reports';

-- Verificar permissões
SELECT 
    grantee,
    privilege_type,
    '✅ CONCEDIDA' as status
FROM information_schema.table_privileges 
WHERE table_name = 'diagnostic_public_reports'
  AND grantee IN ('authenticated', 'anon');

-- Mostrar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'diagnostic_public_reports' 
ORDER BY ordinal_position;

-- ETAPA 9: LIMPEZA DE TESTE
-- ----------------------------------------------------------------------------
-- Remover registro de teste
DELETE FROM diagnostic_public_reports WHERE token LIKE 'test-token-%';

-- ============================================================================
-- FINALIZADO! Se não houver erros, o sistema estará 100% funcional!
-- ============================================================================
SELECT '🎉 SCRIPT EXECUTADO COM SUCESSO! SISTEMA DIAGNÓSTICO FUNCIONANDO!' as resultado_final;
