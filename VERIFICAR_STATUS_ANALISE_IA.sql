-- VERIFICAR_STATUS_ANALISE_IA.sql
-- Script simples para verificar se tudo foi criado corretamente

-- 1. Verificar tabelas
SELECT 
    'call_analysis_cache' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status

UNION ALL

-- 2. Verificar funções
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
    'cleanup_expired_call_analysis' as componente,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_call_analysis') 
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

-- 4. Resumo
SELECT 
    'RESUMO' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache')
           AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_transcriptions')
           AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deal_call_stats')
           AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_call_analysis')
           AND EXISTS (SELECT 1 FROM ai_personas WHERE id = 'call_analyst')
        THEN '🎉 TUDO CRIADO COM SUCESSO!'
        ELSE '⚠️ FALTA ALGUM COMPONENTE - Execute o script 21_call_analysis_ai.sql'
    END as status;
