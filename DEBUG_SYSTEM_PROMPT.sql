-- DEBUG_SYSTEM_PROMPT.sql
-- Script para debugar o systemPrompt da persona SDR

-- 1. Verificar o systemPrompt atual completo
SELECT 
    'SystemPrompt atual completo:' as info,
    systemPrompt,
    LENGTH(systemPrompt) as tamanho
FROM ai_personas 
WHERE id = 'SDR';

-- 2. Verificar se contém as palavras-chave
SELECT 
    'Verificação de palavras-chave:' as info,
    CASE 
        WHEN systemPrompt ILIKE '%transcrição%' THEN '✅ Contém "transcrição"'
        ELSE '❌ NÃO contém "transcrição"'
    END as tem_transcricao,
    CASE 
        WHEN systemPrompt ILIKE '%análise%' THEN '✅ Contém "análise"'
        ELSE '❌ NÃO contém "análise"'
    END as tem_analise,
    CASE 
        WHEN systemPrompt ILIKE '%vendas%' THEN '✅ Contém "vendas"'
        ELSE '❌ NÃO contém "vendas"'
    END as tem_vendas
FROM ai_personas 
WHERE id = 'SDR';

-- 3. Verificar se há caracteres especiais ou problemas
SELECT 
    'Análise do systemPrompt:' as info,
    systemPrompt LIKE '%transcrição%' as tem_transcricao_exato,
    systemPrompt LIKE '%análise%' as tem_analise_exato,
    POSITION('transcrição' IN LOWER(systemPrompt)) as posicao_transcricao,
    POSITION('análise' IN LOWER(systemPrompt)) as posicao_analise
FROM ai_personas 
WHERE id = 'SDR';
