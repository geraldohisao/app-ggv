-- CORRIGIR_SYSTEM_PROMPT_DEFINITIVO.sql
-- Script para corrigir definitivamente o systemPrompt da persona SDR

-- 1. Limpar e recriar o systemPrompt com texto exato
UPDATE ai_personas 
SET systemPrompt = 'Você é um assistente IA especializado em análise de ligações de vendas e prospecção. Sua função é ajudar vendedores a analisar suas chamadas, identificar oportunidades de melhoria e sugerir estratégias baseadas nas transcrições reais das ligações.'
WHERE id = 'SDR';

-- 2. Verificar se a atualização funcionou
SELECT 
    'Verificação após correção:' as info,
    systemPrompt,
    LENGTH(systemPrompt) as tamanho,
    CASE 
        WHEN systemPrompt ILIKE '%transcrição%' AND systemPrompt ILIKE '%análise%' THEN '✅ CORRETO - Contém transcrição e análise'
        ELSE '❌ INCORRETO - Não contém as palavras necessárias'
    END as status_verificacao
FROM ai_personas 
WHERE id = 'SDR';

-- 3. Verificação final com teste específico
SELECT 
    'Teste final da persona SDR:' as info,
    name,
    CASE 
        WHEN systemPrompt LIKE '%transcrição%' AND systemPrompt LIKE '%análise%' THEN '✅ SystemPrompt correto'
        ELSE '❌ SystemPrompt incorreto'
    END as systemprompt_status,
    CASE 
        WHEN directives LIKE '%BANT%' AND directives LIKE '%vendedor%' THEN '✅ Diretrizes corretas'
        ELSE '❌ Diretrizes incorretas'
    END as directives_status,
    CASE 
        WHEN array_length(personalityTraits, 1) >= 4 THEN '✅ Personalidade rica'
        ELSE '❌ Personalidade insuficiente'
    END as personalidade_status,
    wordLimit
FROM ai_personas 
WHERE id = 'SDR';

-- 4. Teste de funcionalidade completa
SELECT 
    'Status final da persona SDR:' as info,
    CASE 
        WHEN systemPrompt LIKE '%transcrição%' AND systemPrompt LIKE '%análise%' 
         AND directives LIKE '%BANT%' AND directives LIKE '%vendedor%'
         AND array_length(personalityTraits, 1) >= 4
         AND wordLimit >= 2000
        THEN '✅ PERSONA COMPLETAMENTE CONFIGURADA'
        ELSE '❌ PERSONA PRECISA DE AJUSTES'
    END as status_final;
