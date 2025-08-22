-- Script para corrigir o sistema de relatórios públicos de diagnóstico
-- Execute este script no SQL Editor do seu projeto Supabase

-- ============================================================================
-- ETAPA 1: CRIAR TABELA DE RELATÓRIOS PÚBLICOS
-- ============================================================================

-- Criar tabela para armazenar relatórios públicos de diagnóstico
CREATE TABLE IF NOT EXISTS diagnostic_public_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    report JSONB NOT NULL,
    recipient_email TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    deal_id TEXT, -- Para mapear com deal do Pipedrive/N8N
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_diagnostic_public_reports_token ON diagnostic_public_reports(token);
CREATE INDEX IF NOT EXISTS idx_diagnostic_public_reports_deal_id ON diagnostic_public_reports(deal_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_public_reports_expires_at ON diagnostic_public_reports(expires_at);

-- ============================================================================
-- ETAPA 2: CONFIGURAR SEGURANÇA (RLS)
-- ============================================================================

-- Habilitar Row Level Security
ALTER TABLE diagnostic_public_reports ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura pública de relatórios não expirados
CREATE POLICY "Allow public read of non-expired reports" ON diagnostic_public_reports
    FOR SELECT USING (expires_at IS NULL OR expires_at > NOW());

-- Política: Usuários autenticados podem inserir relatórios
CREATE POLICY "Authenticated users can insert reports" ON diagnostic_public_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política: Criadores podem atualizar seus próprios relatórios
CREATE POLICY "Creators can update own reports" ON diagnostic_public_reports
    FOR UPDATE USING (auth.uid() = created_by);

-- ============================================================================
-- ETAPA 3: CRIAR FUNÇÃO RPC PARA RECUPERAR RELATÓRIOS
-- ============================================================================

-- Função para recuperar relatório público por token
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
SET search_path = public
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

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO authenticated;

-- ============================================================================
-- ETAPA 4: FUNÇÃO DE LIMPEZA (OPCIONAL)
-- ============================================================================

-- Função para limpar relatórios expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH deleted AS (
        DELETE FROM diagnostic_public_reports
        WHERE expires_at IS NOT NULL 
          AND expires_at < NOW()
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER FROM deleted;
$$;

-- ============================================================================
-- ETAPA 5: VERIFICAÇÃO
-- ============================================================================

-- Verificar se tudo foi criado corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'diagnostic_public_reports'
ORDER BY ordinal_position;

-- Verificar se as funções existem
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_public_report', 'cleanup_expired_reports')
  AND routine_schema = 'public';

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'diagnostic_public_reports';

COMMENT ON TABLE diagnostic_public_reports IS 'Armazena relatórios públicos de diagnóstico comercial com tokens seguros';
COMMENT ON FUNCTION get_public_report(TEXT) IS 'Recupera relatório público por token, respeitando expiração';
COMMENT ON FUNCTION cleanup_expired_reports() IS 'Remove relatórios expirados para limpeza periódica';
