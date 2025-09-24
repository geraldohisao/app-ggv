-- CORRIGIR_SYSTEM_PROMPT.sql
-- Script para corrigir o systemPrompt da persona SDR

-- 1. Verificar o systemPrompt atual
SELECT 
    'SystemPrompt atual:' as info,
    systemPrompt
FROM ai_personas 
WHERE id = 'SDR';

-- 2. Atualizar apenas o systemPrompt
UPDATE ai_personas 
SET systemPrompt = 'Você é um assistente IA especializado em análise de ligações de vendas e prospecção. Sua função é ajudar vendedores a analisar suas chamadas, identificar oportunidades de melhoria e sugerir estratégias baseadas nas transcrições reais das ligações.'
WHERE id = 'SDR';

-- 3. Verificar se a atualização funcionou
SELECT 
    'SystemPrompt após correção:' as info,
    CASE 
        WHEN systemPrompt LIKE '%transcrição%' AND systemPrompt LIKE '%análise%' THEN '✅ Configurado corretamente'
        ELSE '❌ Ainda precisa de ajustes'
    END as status,
    LENGTH(systemPrompt) as tamanho
FROM ai_personas 
WHERE id = 'SDR';

-- 4. Verificação final completa
SELECT 
    'Verificação final da persona SDR:' as info,
    name,
    description,
    CASE 
        WHEN systemPrompt LIKE '%transcrição%' AND systemPrompt LIKE '%análise%' THEN '✅ SystemPrompt correto'
        ELSE '❌ SystemPrompt incorreto'
    END as systemprompt_status,
    CASE 
        WHEN directives LIKE '%BANT%' AND directives LIKE '%vendedor%' THEN '✅ Diretrizes corretas'
        ELSE '❌ Diretrizes incorretas'
    END as directives_status,
    array_length(personalityTraits, 1) as total_traits
FROM ai_personas 
WHERE id = 'SDR';
