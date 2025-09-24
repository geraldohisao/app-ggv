-- 📧 SISTEMA DE LOGS DE E-MAIL - DIAGNÓSTICO GGV
-- Tabela para rastrear todos os envios de e-mail do diagnóstico

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Identificação do diagnóstico
    deal_id TEXT NOT NULL,
    company_name TEXT,
    user_email TEXT,
    
    -- Dados do e-mail
    recipient_email TEXT NOT NULL,
    subject TEXT,
    email_type TEXT DEFAULT 'diagnostic_report', -- diagnostic_report, reminder, etc.
    
    -- Status do envio
    status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'success', 'failed', 'retry')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Detalhes técnicos
    gmail_message_id TEXT, -- ID da mensagem no Gmail
    gmail_thread_id TEXT,  -- ID do thread no Gmail
    token_source TEXT,     -- supabase, oauth, manual
    client_id_used TEXT,   -- Client ID usado para autenticação
    
    -- Logs de erro
    error_message TEXT,
    error_code TEXT,
    error_details JSONB,
    
    -- Metadados
    user_agent TEXT,
    ip_address INET,
    session_id TEXT,
    
    -- Timestamps de tentativas
    first_attempt_at TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    success_at TIMESTAMP WITH TIME ZONE,
    
    -- Dados do relatório
    report_token TEXT,     -- Token do relatório público
    report_url TEXT,       -- URL do relatório
    report_size INTEGER,   -- Tamanho do HTML em bytes
    
    -- Configurações
    retry_delays INTEGER[], -- Delays entre tentativas em ms
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Dados adicionais
    metadata JSONB DEFAULT '{}',
    
    -- Índices para performance
    CONSTRAINT email_logs_deal_id_check CHECK (deal_id != ''),
    CONSTRAINT email_logs_recipient_email_check CHECK (recipient_email != ''),
    CONSTRAINT email_logs_attempts_check CHECK (attempts >= 0),
    CONSTRAINT email_logs_max_attempts_check CHECK (max_attempts > 0)
);

-- 📊 ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_email_logs_deal_id ON email_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_email ON email_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_success_at ON email_logs(success_at) WHERE success_at IS NOT NULL;

-- 🔍 ÍNDICE COMPOSTO PARA CONSULTAS FREQUENTES
CREATE INDEX IF NOT EXISTS idx_email_logs_deal_status ON email_logs(deal_id, status, created_at);

-- 📈 ÍNDICE PARA ANÁLISE DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_email_logs_attempts_status ON email_logs(attempts, status, created_at);

-- 🎯 COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE email_logs IS 'Logs detalhados de envio de e-mails do sistema de diagnóstico';
COMMENT ON COLUMN email_logs.deal_id IS 'ID do deal no Pipedrive';
COMMENT ON COLUMN email_logs.recipient_email IS 'E-mail do destinatário';
COMMENT ON COLUMN email_logs.status IS 'Status atual do envio: pending, sending, success, failed, retry';
COMMENT ON COLUMN email_logs.attempts IS 'Número de tentativas realizadas';
COMMENT ON COLUMN email_logs.gmail_message_id IS 'ID da mensagem retornado pelo Gmail API';
COMMENT ON COLUMN email_logs.token_source IS 'Fonte do token: supabase, oauth, manual';
COMMENT ON COLUMN email_logs.error_details IS 'Detalhes técnicos do erro em formato JSON';
COMMENT ON COLUMN email_logs.metadata IS 'Dados adicionais do envio em formato JSON';

-- 🔐 POLÍTICAS RLS (Row Level Security)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados verem seus próprios logs
CREATE POLICY "Users can view their own email logs" ON email_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            user_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
            EXISTS (
                SELECT 1 FROM auth.users 
                WHERE id = auth.uid() 
                AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
            )
        )
    );

-- Política para inserir logs (qualquer usuário autenticado)
CREATE POLICY "Authenticated users can insert email logs" ON email_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para atualizar logs (apenas o próprio usuário ou admin)
CREATE POLICY "Users can update their own email logs" ON email_logs
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            user_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
            EXISTS (
                SELECT 1 FROM auth.users 
                WHERE id = auth.uid() 
                AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
            )
        )
    );

-- 📊 VIEW PARA ESTATÍSTICAS DE E-MAIL
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

-- 📈 VIEW PARA ANÁLISE DE ERROS
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

-- 🎯 FUNÇÃO PARA LIMPEZA AUTOMÁTICA (manter apenas últimos 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_email_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 🕐 AGENDAR LIMPEZA AUTOMÁTICA (executar diariamente)
-- Nota: Isso precisa ser configurado no Supabase Dashboard > Database > Extensions > pg_cron
-- SELECT cron.schedule('cleanup-email-logs', '0 2 * * *', 'SELECT cleanup_old_email_logs();');

-- ✅ VERIFICAÇÃO FINAL
DO $$
BEGIN
    RAISE NOTICE '📧 Tabela email_logs criada com sucesso!';
    RAISE NOTICE '📊 Views de estatísticas criadas';
    RAISE NOTICE '🔐 Políticas RLS configuradas';
    RAISE NOTICE '📈 Índices de performance criados';
    RAISE NOTICE '🧹 Função de limpeza automática criada';
END $$;
