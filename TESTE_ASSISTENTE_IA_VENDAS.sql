-- TESTE_ASSISTENTE_IA_VENDAS.sql
-- Script para testar as funcionalidades do assistente IA de vendas

-- 1. Verificar se a persona SDR está otimizada
SELECT 
    'Configuração da persona SDR:' as info,
    name,
    description,
    CASE 
        WHEN systemPrompt LIKE '%análise%' AND systemPrompt LIKE '%vendas%' THEN '✅ Otimizada para análise de vendas'
        ELSE '❌ Precisa de otimização'
    END as configuracao_system,
    CASE 
        WHEN directives LIKE '%BANT%' AND directives LIKE '%vendedor%' THEN '✅ Diretrizes de vendas configuradas'
        ELSE '❌ Precisa de diretrizes de vendas'
    END as configuracao_directives,
    array_length(personalityTraits, 1) as total_traits
FROM ai_personas 
WHERE id = 'SDR';

-- 2. Verificar transcrições disponíveis para teste
SELECT 
    'Transcrições disponíveis para teste:' as info,
    deal_id,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN transcription IS NOT NULL AND transcription != '' THEN 1 END) as calls_com_transcricao,
    AVG(LENGTH(transcription)) as tamanho_medio_transcricao
FROM calls 
WHERE deal_id IS NOT NULL 
  AND transcription IS NOT NULL 
  AND transcription != ''
  AND status = 'processed'
GROUP BY deal_id
ORDER BY calls_com_transcricao DESC
LIMIT 5;

-- 3. Verificar se as funções de análise estão funcionando
SELECT 'Teste da função get_deal_transcriptions:' as teste;
SELECT 
    deal_id,
    COUNT(*) as transcricoes_encontradas
FROM get_deal_transcriptions('64722')
GROUP BY deal_id;

-- 4. Verificar estrutura das transcrições
SELECT 
    'Estrutura das transcrições:' as info,
    call_id,
    call_type,
    duration,
    LENGTH(transcription) as tamanho_transcricao,
    created_at
FROM get_deal_transcriptions('64722')
LIMIT 3;

-- 5. Teste de contexto personalizado
SELECT 
    'Teste de contexto personalizado:' as info,
    'O assistente deve usar as transcrições para análise de vendas' as funcionalidade_esperada;
