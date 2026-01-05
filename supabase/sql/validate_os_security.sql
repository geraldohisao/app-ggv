-- =========================================
-- VALIDAÇÃO E REFORÇO DE SEGURANÇA DO SISTEMA DE OS
-- Execute este script para validar políticas RLS e índices
-- =========================================

-- 1. VERIFICAR SE RLS ESTÁ HABILITADO
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('service_orders', 'os_signers', 'os_audit_log');

-- 2. LISTAR POLÍTICAS ATIVAS
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
WHERE schemaname = 'public' 
AND tablename IN ('service_orders', 'os_signers', 'os_audit_log')
ORDER BY tablename, policyname;

-- 3. VERIFICAR ÍNDICES
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('service_orders', 'os_signers', 'os_audit_log')
ORDER BY tablename, indexname;

-- 4. VERIFICAR SE COLUNAS DE SEGURANÇA EXISTEM
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('service_orders', 'os_signers')
AND column_name IN ('file_hash', 'final_file_hash', 'signature_hash', 'signature_data', 'ip_address')
ORDER BY table_name, column_name;

-- 5. VALIDAR DADOS DE PROVA DE ASSINATURA
-- Verificar se todas as assinaturas SIGNED têm dados completos
SELECT 
    s.id,
    s.email,
    s.name,
    s.status,
    s.signature_hash IS NOT NULL as has_signature_hash,
    s.signature_data IS NOT NULL as has_signature_data,
    s.ip_address IS NOT NULL as has_ip,
    s.user_agent IS NOT NULL as has_user_agent,
    s.signed_at IS NOT NULL as has_signed_at,
    (s.signature_data->>'cpf') IS NOT NULL as has_cpf,
    (s.signature_data->>'birthDate') IS NOT NULL as has_birthdate,
    (s.signature_data->>'documentHash') IS NOT NULL as has_doc_hash
FROM os_signers s
WHERE s.status = 'SIGNED'
ORDER BY s.signed_at DESC
LIMIT 20;

-- 6. VALIDAR INTEGRIDADE DOS DOCUMENTOS
-- Verificar se service_orders têm file_hash
SELECT 
    id,
    file_name,
    status,
    file_hash IS NOT NULL as has_file_hash,
    final_file_hash IS NOT NULL as has_final_hash,
    signed_count,
    total_signers,
    created_at
FROM service_orders
WHERE status != 'DRAFT'
ORDER BY created_at DESC
LIMIT 10;

-- 7. VERIFICAR AUDIT LOG
-- Eventos importantes devem estar registrados
SELECT 
    event_type,
    COUNT(*) as count
FROM os_audit_log
GROUP BY event_type
ORDER BY count DESC;

-- 8. VALIDAR STORAGE POLICIES
-- Execute separadamente no Storage > Policies
/*
SELECT 
    name,
    definition
FROM storage.policies
WHERE bucket_id = 'service-orders';
*/

-- =========================================
-- OBSERVAÇÕES:
-- =========================================
-- 1. RLS deve estar habilitado em todas as tabelas
-- 2. Todas as assinaturas SIGNED devem ter signature_hash e signature_data
-- 3. Todos os documentos devem ter file_hash
-- 4. Documentos COMPLETED devem ter final_file_hash
-- 5. Audit log deve ter eventos: created, sent, signed, completed, cancelled
-- 6. Storage deve permitir INSERT/UPDATE/DELETE para admins e SELECT para authenticated

