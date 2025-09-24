-- TESTE_SEGURANCA_FUNCAO.sql
-- Script para testar a função cleanup_expired_call_analysis de forma segura

-- 1. Verificar se a tabela existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache') 
        THEN '✅ Tabela call_analysis_cache EXISTE' 
        ELSE '❌ Tabela call_analysis_cache NÃO EXISTE - Execute primeiro o script 21_call_analysis_ai.sql' 
    END as status_tabela;

-- 2. Verificar se há dados (apenas se a tabela existir)
DO $$
DECLARE
    table_exists BOOLEAN;
    record_count INTEGER;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache') INTO table_exists;
    
    IF table_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM call_analysis_cache' INTO record_count;
        IF record_count > 0 THEN
            RAISE NOTICE '✅ Tabela tem % registros', record_count;
        ELSE
            RAISE NOTICE 'ℹ️ Tabela existe mas está vazia';
        END IF;
    ELSE
        RAISE NOTICE '❌ Tabela não existe';
    END IF;
END $$;

-- 3. Verificar se a função existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_call_analysis') 
        THEN '✅ Função cleanup_expired_call_analysis EXISTE' 
        ELSE '❌ Função cleanup_expired_call_analysis NÃO EXISTE' 
    END as status_funcao;

-- 4. Se tudo existir, testar a função
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache') 
       AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_call_analysis') 
    THEN
        RAISE NOTICE '🧪 Testando função cleanup_expired_call_analysis...';
        RAISE NOTICE 'Registros removidos: %', cleanup_expired_call_analysis();
        RAISE NOTICE '✅ Teste concluído com sucesso!';
    ELSE
        RAISE NOTICE '❌ Não é possível testar: tabela ou função não existe';
        RAISE NOTICE 'Execute primeiro o script completo: supabase/sql/21_call_analysis_ai.sql';
    END IF;
END $$;
