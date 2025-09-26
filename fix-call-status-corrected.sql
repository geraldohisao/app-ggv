-- 🔧 CORRIGIR: Status de ligações (versão corrigida)
-- Baseado na estrutura real da tabela calls

-- 1. Verificar ligações com status que podem estar causando problemas
SELECT 'Ligações com status que podem estar causando problemas:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.status_voip,
    c.call_type,
    c.duration,
    c.created_at
FROM calls c
WHERE c.status = 'received'  -- Ligações que ainda não foram processadas
   OR c.status IS NULL
   OR c.status = ''
ORDER BY c.created_at DESC
LIMIT 10;

-- 2. Verificar ligações que podem estar impedindo reprocessamento
SELECT 'Ligações que podem estar impedindo reprocessamento:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.status_voip,
    c.call_type,
    c.duration,
    c.ai_status,
    c.transcript_status,
    c.created_at
FROM calls c
WHERE c.status = 'received'  -- Status que pode estar impedindo reprocessamento
ORDER BY c.created_at DESC
LIMIT 10;

-- 3. Atualizar status de ligações que estão impedindo reprocessamento
-- Marcar como 'processed' para permitir reprocessamento
UPDATE calls 
SET 
    status = 'processed',
    updated_at = NOW()
WHERE status = 'received'  -- Ligações que ainda não foram processadas
   OR status IS NULL
   OR status = '';

-- 4. Verificar quantas ligações foram atualizadas
SELECT 'Ligações atualizadas:' as info;
SELECT 
    COUNT(*) as total_atualizadas
FROM calls 
WHERE updated_at >= NOW() - INTERVAL '1 minute';

-- 5. Verificar status após correção
SELECT 'Status após correção:' as info;
SELECT 
    c.id,
    c.status,
    c.status_voip,
    c.call_type,
    c.duration,
    c.ai_status
FROM calls c
WHERE c.updated_at >= NOW() - INTERVAL '1 minute'
ORDER BY c.updated_at DESC
LIMIT 10;

-- 6. Verificar se ainda há ligações com status 'received'
SELECT 'Ligações ainda com status received:' as info;
SELECT 
    COUNT(*) as total_ainda_received
FROM calls c
WHERE c.status = 'received';

-- 7. Estatísticas finais
SELECT 'Estatísticas finais:' as info;
SELECT 
    status,
    COUNT(*) as total
FROM calls 
GROUP BY status
ORDER BY total DESC;
