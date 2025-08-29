
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'reactivated_leads';

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'reactivated_leads';

-- Testar acesso direto (sem RLS)
SET row_security = off;
SELECT COUNT(*) as total_sem_rls FROM reactivated_leads;
SET row_security = on;

