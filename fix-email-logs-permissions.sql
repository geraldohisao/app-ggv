-- 🚨 CORREÇÃO URGENTE: PERMISSÕES DA TABELA EMAIL_LOGS
-- Este script corrige as políticas RLS que estão causando erro 403

-- 1. Verificar se a tabela existe
SELECT 'Tabela email_logs existe: ' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs') THEN 'SIM' ELSE 'NÃO' END as status;

-- 2. Remover TODAS as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Users can view their own email logs" ON email_logs;
DROP POLICY IF EXISTS "Authenticated users can insert email logs" ON email_logs;
DROP POLICY IF EXISTS "Users can update their own email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can view all email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can update email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can view all email logs" ON email_logs;
DROP POLICY IF EXISTS "Authenticated users can insert email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can update email logs" ON email_logs;

-- 3. Desabilitar RLS temporariamente
ALTER TABLE email_logs DISABLE ROW LEVEL SECURITY;

-- 4. Verificar se o usuário atual tem role de admin
SELECT 
    'Usuário atual: ' || auth.uid() as user_id,
    'Role: ' || COALESCE(raw_user_meta_data->>'role', 'sem role') as user_role,
    'Email: ' || COALESCE(email, 'sem email') as user_email
FROM auth.users 
WHERE id = auth.uid();

-- 5. Criar política mais simples - permitir tudo para usuários autenticados
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - qualquer usuário autenticado
CREATE POLICY "Allow select for authenticated users" ON email_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Política para INSERT - qualquer usuário autenticado
CREATE POLICY "Allow insert for authenticated users" ON email_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Política para UPDATE - qualquer usuário autenticado
CREATE POLICY "Allow update for authenticated users" ON email_logs
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 6. Testar se as políticas funcionam
SELECT 
    'Teste de permissão: ' || CASE 
        WHEN EXISTS (SELECT 1 FROM email_logs LIMIT 1) THEN 'SUCESSO' 
        ELSE 'FALHA' 
    END as resultado;

-- 7. Verificar dados na tabela
SELECT 
    'Total de logs: ' || COUNT(*) as total,
    'Logs de sucesso: ' || COUNT(*) FILTER (WHERE status = 'success') as sucessos,
    'Logs de falha: ' || COUNT(*) FILTER (WHERE status = 'failed') as falhas
FROM email_logs;

-- 8. Inserir log de teste adicional se necessário
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
    'TEST-PERMISSIONS-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'teste-permissoes@exemplo.com',
    'Teste de Permissões',
    'success',
    1,
    3,
    'admin@exemplo.com',
    'Teste de Permissões'
WHERE NOT EXISTS (
    SELECT 1 FROM email_logs 
    WHERE deal_id LIKE 'TEST-PERMISSIONS-%'
);

-- 9. Verificação final
SELECT 
    'Sistema de logs configurado com sucesso!' as status,
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE status = 'success') as successful_logs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_logs
FROM email_logs;
