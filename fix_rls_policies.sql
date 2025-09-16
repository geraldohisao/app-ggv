-- CORREÇÃO DAS POLÍTICAS RLS PARA TABELA CALLS
-- Execute este SQL no Supabase SQL Editor

-- 1. REMOVER todas as políticas existentes para começar do zero
DROP POLICY IF EXISTS "Authenticated users can view calls" ON calls;
DROP POLICY IF EXISTS "Service role can manage calls" ON calls;
DROP POLICY IF EXISTS "calls_insert_policy" ON calls;
DROP POLICY IF EXISTS "calls_select_policy" ON calls;
DROP POLICY IF EXISTS "calls_update_policy" ON calls;
DROP POLICY IF EXISTS "calls_read_policy" ON calls;
DROP POLICY IF EXISTS "calls_delete_policy" ON calls;

-- 2. CRIAR políticas simplificadas e funcionais

-- Política para SELECT (leitura) - permite acesso completo para usuários autenticados
CREATE POLICY "calls_read_policy" ON calls
    FOR SELECT
    USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

-- Política para INSERT (criação) - apenas service_role
CREATE POLICY "calls_insert_policy" ON calls
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Política para UPDATE (atualização) - apenas service_role
CREATE POLICY "calls_update_policy" ON calls
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Política para DELETE (exclusão) - apenas service_role
CREATE POLICY "calls_delete_policy" ON calls
    FOR DELETE
    USING (auth.role() = 'service_role');

-- 3. VERIFICAR se RLS está habilitado
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- 4. TESTAR a nova configuração
-- Esta query deve funcionar para usuários autenticados:
SELECT COUNT(*) as total_calls FROM calls;

-- Esta query deve funcionar com filtros:
SELECT COUNT(*) as calls_with_duration_100_plus 
FROM calls 
WHERE duration >= 100;

-- 5. VERIFICAR as novas políticas
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
WHERE tablename = 'calls' AND schemaname = 'public'
ORDER BY cmd, policyname;
