-- CORRIGIR_BUSCA_TRANSCRICOES.sql
-- Script para corrigir a busca de transcrições para usar a mesma lógica do frontend

-- 1. Criar função que busca transcrições diretamente da tabela calls
CREATE OR REPLACE FUNCTION public.get_deal_transcriptions_direct(p_deal_id TEXT)
RETURNS TABLE(
    id UUID,
    deal_id TEXT,
    transcription TEXT,
    duration INTEGER,
    created_at TIMESTAMPTZ,
    agent_id TEXT,
    call_status TEXT,
    call_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.deal_id,
        c.transcription,
        c.duration,
        c.created_at,
        c.agent_id,
        c.status as call_status,
        c.call_type
    FROM calls c
    WHERE c.deal_id = p_deal_id
      AND c.transcription IS NOT NULL 
      AND c.transcription != ''
    ORDER BY c.created_at DESC;
END;
$$;

-- 2. Testar a nova função
SELECT 
    'Teste da nova função:' as info,
    COUNT(*) as transcricoes_encontradas
FROM get_deal_transcriptions_direct('64722');

-- 3. Verificar se a função antiga está filtrando incorretamente
SELECT 
    'Função antiga:' as info,
    COUNT(*) as transcricoes_antiga
FROM get_deal_transcriptions('64722');

-- 4. Verificar dados brutos da tabela calls
SELECT 
    'Dados brutos da tabela:' as info,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN transcription IS NOT NULL AND transcription != '' THEN 1 END) as com_transcricao,
    COUNT(CASE WHEN status = 'processed' THEN 1 END) as status_processed,
    COUNT(CASE WHEN status != 'processed' THEN 1 END) as status_nao_processed
FROM calls 
WHERE deal_id = '64722';
