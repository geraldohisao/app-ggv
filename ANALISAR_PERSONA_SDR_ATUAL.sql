-- ANALISAR_PERSONA_SDR_ATUAL.sql
-- Script para analisar a persona SDR atual

-- 1. Verificar persona SDR atual
SELECT 
    'Persona SDR atual:' as info,
    id,
    name,
    description,
    systemPrompt,
    directives,
    tone,
    model,
    maxTokens,
    temperature,
    personalityTraits
FROM ai_personas 
WHERE id = 'SDR';

-- 2. Verificar se há outras personas relacionadas
SELECT 
    'Todas as personas disponíveis:' as info,
    id,
    name,
    description
FROM ai_personas 
ORDER BY id;

-- 3. Verificar se a persona SDR está configurada para análise de chamadas
SELECT 
    'Configuração da persona SDR:' as info,
    CASE 
        WHEN systemPrompt LIKE '%transcrição%' OR systemPrompt LIKE '%chamada%' THEN 'SIM - Configurada para transcrições'
        ELSE 'NÃO - Precisa ser configurada'
    END as configurada_para_transcricoes,
    CASE 
        WHEN directives LIKE '%análise%' OR directives LIKE '%vendas%' THEN 'SIM - Diretrizes de análise'
        ELSE 'NÃO - Precisa de diretrizes'
    END as tem_diretrizes_analise
FROM ai_personas 
WHERE id = 'SDR';
