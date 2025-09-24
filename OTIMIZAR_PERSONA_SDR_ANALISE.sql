-- OTIMIZAR_PERSONA_SDR_ANALISE.sql
-- Script para otimizar a persona SDR para análise de chamadas

-- 1. Atualizar persona SDR para análise de chamadas
UPDATE ai_personas 
SET 
    name = 'SDR - Análise de Chamadas',
    description = 'Especialista em análise de ligações de vendas e prospecção',
    systemPrompt = 'Você é um assistente IA especializado em análise de ligações de vendas e prospecção. Sua função é ajudar vendedores a analisar suas chamadas, identificar oportunidades de melhoria e sugerir estratégias baseadas nas transcrições reais das ligações.',
    directives = 'ANÁLISE DE CHAMADAS:
- Analise as transcrições fornecidas para identificar pontos fortes e oportunidades
- Identifique se o vendedor seguiu as melhores práticas de prospecção
- Avalie a qualificação BANT (Budget, Authority, Need, Timeline)
- Sugira melhorias específicas baseadas no conteúdo da ligação
- Identifique sinais de interesse do cliente
- Analise a abordagem do vendedor e sugira otimizações
- Foque em resultados práticos e acionáveis

CONTEXTO DE VENDAS:
- Use apenas as transcrições fornecidas como base para análise
- Seja específico e cite trechos das conversas
- Identifique oportunidades perdidas
- Sugira próximos passos baseados no que foi discutido
- Analise a efetividade da abordagem do vendedor',
    tone = 'profissional e consultivo',
    wordLimit = 2000,
    personalityTraits = ARRAY['Analítico', 'Consultivo', 'Focado em resultados', 'Estratégico', 'Questionador']
WHERE id = 'SDR';

-- 2. Verificar se a atualização funcionou
SELECT 
    'Persona SDR atualizada:' as info,
    id,
    name,
    description,
    LENGTH(systemPrompt) as tamanho_system_prompt,
    LENGTH(directives) as tamanho_directives,
    tone,
    wordLimit,
    personalityTraits
FROM ai_personas 
WHERE id = 'SDR';

-- 3. Testar se a persona está configurada corretamente
SELECT 
    'Verificação da configuração:' as info,
    CASE 
        WHEN systemPrompt LIKE '%transcrição%' AND systemPrompt LIKE '%análise%' THEN '✅ Configurada para análise de transcrições'
        ELSE '❌ Precisa de ajustes'
    END as configuracao_system,
    CASE 
        WHEN directives LIKE '%BANT%' AND directives LIKE '%vendedor%' THEN '✅ Diretrizes de vendas configuradas'
        ELSE '❌ Precisa de diretrizes de vendas'
    END as configuracao_directives,
    CASE 
        WHEN array_length(personalityTraits, 1) >= 4 THEN '✅ Personalidade rica configurada'
        ELSE '❌ Precisa de mais traços de personalidade'
    END as configuracao_personalidade,
    CASE 
        WHEN wordLimit >= 2000 THEN '✅ Limite de palavras adequado'
        ELSE '❌ Limite de palavras baixo'
    END as configuracao_wordlimit
FROM ai_personas 
WHERE id = 'SDR';
