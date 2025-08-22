-- Script SUPER SIMPLES - Sem RLS para evitar erros
-- Execute este script no SQL Editor do seu projeto Supabase

-- Criar tabela básica primeiro
CREATE TABLE IF NOT EXISTS diagnostic_public_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    report JSONB NOT NULL,
    recipient_email TEXT,
    created_by UUID,
    deal_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_diagnostic_public_reports_token ON diagnostic_public_reports(token);
CREATE INDEX IF NOT EXISTS idx_diagnostic_public_reports_deal_id ON diagnostic_public_reports(deal_id);

-- Função para recuperar relatório
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

-- Dar permissões
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO authenticated;

-- Verificar se funcionou
SELECT 'Tabela e função criadas com sucesso!' as status;

-- Mostrar estrutura da tabela
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'diagnostic_public_reports' 
ORDER BY ordinal_position;
