-- Script para LIMPAR e RECRIAR tudo do zero
-- Execute este script no SQL Editor do seu projeto Supabase

-- PASSO 1: Limpar tudo que pode estar causando conflito
DROP TABLE IF EXISTS diagnostic_public_reports CASCADE;
DROP FUNCTION IF EXISTS get_public_report(TEXT) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_reports() CASCADE;

-- PASSO 2: Criar tabela do zero
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

-- PASSO 3: Criar índices
CREATE INDEX idx_diagnostic_public_reports_token ON diagnostic_public_reports(token);
CREATE INDEX idx_diagnostic_public_reports_deal_id ON diagnostic_public_reports(deal_id);

-- PASSO 4: Criar função
CREATE FUNCTION get_public_report(p_token TEXT)
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

-- PASSO 5: Dar permissões
GRANT ALL ON TABLE diagnostic_public_reports TO authenticated;
GRANT ALL ON TABLE diagnostic_public_reports TO anon;
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_report(TEXT) TO anon;

-- PASSO 6: Verificar se funcionou
SELECT 'Tabela e função criadas com sucesso!' as status;

-- PASSO 7: Mostrar estrutura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'diagnostic_public_reports' 
ORDER BY ordinal_position;
