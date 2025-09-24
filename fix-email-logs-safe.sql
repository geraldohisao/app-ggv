-- 🚨 CORREÇÃO SEGURA: CRIAR TABELA EMAIL_LOGS
-- Este script verifica se já existe antes de criar

-- 1. Criar tabela se não existir
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deal_id TEXT NOT NULL,
    company_name TEXT,
    user_email TEXT,
    recipient_email TEXT NOT NULL,
    subject TEXT,
    email_type TEXT DEFAULT 'diagnostic_report',
    status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'success', 'failed', 'retry')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    gmail_message_id TEXT,
    gmail_thread_id TEXT,
    token_source TEXT,
    client_id_used TEXT,
    error_message TEXT,
    error_code TEXT,
    error_details JSONB,
    user_agent TEXT,
    ip_address INET,
    session_id TEXT,
    first_attempt_at TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    success_at TIMESTAMP WITH TIME ZONE,
    report_token TEXT,
    report_url TEXT,
    report_size INTEGER,
    retry_delays INTEGER[],
    timeout_seconds INTEGER DEFAULT 30,
    metadata JSONB DEFAULT '{}'
);

-- 2. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_email_logs_deal_id ON email_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- 3. Configurar RLS se não estiver habilitado
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes se houver conflito
DROP POLICY IF EXISTS "Users can view their own email logs" ON email_logs;
DROP POLICY IF EXISTS "Authenticated users can insert email logs" ON email_logs;
DROP POLICY IF EXISTS "Users can update their own email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can view all email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can update email logs" ON email_logs;

-- 5. Criar políticas novas
CREATE POLICY "Admins can view all email logs" ON email_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Authenticated users can insert email logs" ON email_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update email logs" ON email_logs
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
        )
    );

-- 6. Criar views se não existirem
CREATE OR REPLACE VIEW email_logs_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE status = 'success') as successful_emails,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_emails,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_emails,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'success')::DECIMAL / COUNT(*) * 100, 
        2
    ) as success_rate_percent,
    AVG(attempts) as avg_attempts,
    MAX(attempts) as max_attempts_used
FROM email_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW email_logs_errors AS
SELECT 
    error_code,
    error_message,
    COUNT(*) as error_count,
    MAX(created_at) as last_occurrence,
    ARRAY_AGG(DISTINCT recipient_email) as affected_emails
FROM email_logs
WHERE status = 'failed' AND error_code IS NOT NULL
GROUP BY error_code, error_message
ORDER BY error_count DESC;

-- 7. Inserir log de teste apenas se não existir
INSERT INTO email_logs (
    deal_id, 
    recipient_email, 
    subject, 
    status, 
    attempts, 
    max_attempts,
    user_email,
    company_name
) 
SELECT 
    'TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'teste@exemplo.com',
    'Teste de Log de E-mail',
    'success',
    1,
    3,
    'admin@exemplo.com',
    'Empresa de Teste'
WHERE NOT EXISTS (
    SELECT 1 FROM email_logs 
    WHERE deal_id LIKE 'TEST-%' 
    AND recipient_email = 'teste@exemplo.com'
);

-- 8. Verificar se funcionou
SELECT 
    'Tabela email_logs configurada com sucesso!' as status,
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE status = 'success') as successful_logs
FROM email_logs;
