-- DIAGNOSTICO_COMPLETO_ASSISTENTE_IA.sql
-- Script completo para diagnosticar o assistente IA

-- 1. Verificar todas as tabelas necessárias
SELECT 
    'call_analysis_history' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_history') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

SELECT 
    'calls' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calls') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

-- 2. Verificar todas as funções necessárias
SELECT 
    'get_deal_transcriptions' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_transcriptions') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

SELECT 
    'get_deal_call_stats' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_call_stats') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

SELECT 
    'save_analysis_permanent' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'save_analysis_permanent') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

SELECT 
    'get_latest_analysis' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_latest_analysis') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

-- 3. Verificar persona
SELECT 
    'call_analyst persona' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM ai_personas WHERE id = 'call_analyst') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status;

-- 4. Testar função com dados de exemplo
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calls') THEN
        RAISE NOTICE '🧪 Testando função get_deal_transcriptions com deal_id teste...';
        
        -- Testar se a função funciona
        PERFORM get_deal_transcriptions('teste123');
        RAISE NOTICE '✅ Função get_deal_transcriptions funciona!';
        
    ELSE
        RAISE NOTICE '❌ Tabela calls não existe';
    END IF;
END $$;

-- 5. Verificar dados de teste na tabela calls
SELECT 
    'Dados de teste' as info,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Existem ' || COUNT(*) || ' registros na tabela calls'
        ELSE '❌ Tabela calls está vazia'
    END as status
FROM calls;

-- 6. Mostrar estrutura da tabela call_analysis_history
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_analysis_history' 
ORDER BY ordinal_position;

-- 7. Verificar se há dados na tabela call_analysis_history
SELECT 
    'call_analysis_history' as tabela,
    COUNT(*) as total_registros
FROM call_analysis_history;

-- 8. Resumo final
SELECT 
    'RESUMO FINAL' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_history')
           AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calls')
           AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_transcriptions')
           AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_call_stats')
           AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'save_analysis_permanent')
           AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_latest_analysis')
           AND EXISTS (SELECT 1 FROM ai_personas WHERE id = 'call_analyst')
        THEN '🎉 TODOS OS COMPONENTES EXISTEM - O problema está no frontend!'
        ELSE '⚠️ FALTAM COMPONENTES - Execute os scripts SQL necessários'
    END as status;
