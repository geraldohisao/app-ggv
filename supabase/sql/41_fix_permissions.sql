-- 41_fix_permissions.sql
-- CORREÇÃO: Permissões para role 'anon' nas funções RPC
-- Execute este script para corrigir as permissões

-- =========================================
-- CONCEDER PERMISSÕES PARA ROLE 'ANON'
-- =========================================

-- Funções auxiliares
GRANT EXECUTE ON FUNCTION public.normalize_sdr_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_sdr_display_name(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.extract_company_name(JSONB, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.extract_person_data(JSONB) TO anon;

-- Funções principais
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_calls_with_filters(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_unique_sdrs() TO anon;
GRANT EXECUTE ON FUNCTION public.get_call_volume_chart(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_sdr_score_chart(INTEGER) TO anon;

-- =========================================
-- VERIFICAR PERMISSÕES
-- =========================================

-- Listar permissões das funções
SELECT 
    p.proname as function_name,
    array_to_string(p.proacl, ', ') as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
    AND p.proname LIKE 'get_%'
ORDER BY p.proname;

-- Testar uma função simples
SELECT 'Test normalize_sdr_email:' as test, normalize_sdr_email('test@ggvinteligencia.com.br') as result;
SELECT 'Test get_sdr_display_name:' as test, get_sdr_display_name('camila.ataliba@grupoggv.com') as result;
