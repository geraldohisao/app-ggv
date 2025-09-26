-- 🔧 CORRIGIR: Status de ligações com "Status desconhecido"
-- Este script corrige o status de ligações que estão impedindo o reprocessamento

-- 1. Verificar ligações com status desconhecido
SELECT 'Ligações com status desconhecido:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.status_voip,
    c.status_voip_friendly,
    c.call_type,
    c.duration,
    c.created_at
FROM calls c
WHERE c.status_voip_friendly = 'Status desconhecido'
   OR c.status_voip_friendly IS NULL
   OR c.status_voip_friendly = ''
ORDER BY c.created_at DESC;

-- 2. Verificar status_voip original
SELECT 'Status VOIP original:' as info;
SELECT 
    c.id,
    c.status_voip,
    c.status_voip_friendly,
    c.status
FROM calls c
WHERE c.status_voip_friendly = 'Status desconhecido'
   OR c.status_voip_friendly IS NULL
   OR c.status_voip_friendly = ''
LIMIT 5;

-- 3. Corrigir status baseado no status_voip original
UPDATE calls 
SET 
    status_voip_friendly = CASE 
        WHEN status_voip = 'answered' THEN 'Atendida'
        WHEN status_voip = 'no-answer' THEN 'Não atendida'
        WHEN status_voip = 'busy' THEN 'Ocupado'
        WHEN status_voip = 'failed' THEN 'Falhou'
        WHEN status_voip = 'cancelled' THEN 'Cancelada pela SDR'
        WHEN status_voip = 'rejected' THEN 'Rejeitada'
        WHEN status_voip = 'timeout' THEN 'Timeout'
        WHEN status_voip = 'unavailable' THEN 'Indisponível'
        WHEN status_voip = 'ringing' THEN 'Tocando'
        WHEN status_voip = 'in-progress' THEN 'Em andamento'
        WHEN status_voip = 'completed' THEN 'Concluída'
        WHEN status_voip = 'hangup' THEN 'Desligada'
        WHEN status_voip = 'voicemail' THEN 'Caixa postal'
        WHEN status_voip = 'forwarded' THEN 'Transferida'
        WHEN status_voip = 'conference' THEN 'Conferência'
        WHEN status_voip = 'hold' THEN 'Em espera'
        WHEN status_voip = 'mute' THEN 'Silenciada'
        WHEN status_voip = 'unmute' THEN 'Ativada'
        WHEN status_voip = 'park' THEN 'Estacionada'
        WHEN status_voip = 'unpark' THEN 'Desestacionada'
        WHEN status_voip = 'transfer' THEN 'Transferida'
        WHEN status_voip = 'consult' THEN 'Consulta'
        WHEN status_voip = 'dial' THEN 'Discando'
        WHEN status_voip = 'dialing' THEN 'Discando'
        WHEN status_voip = 'ring' THEN 'Tocando'
        WHEN status_voip = 'ringing' THEN 'Tocando'
        WHEN status_voip = 'connected' THEN 'Conectada'
        WHEN status_voip = 'disconnected' THEN 'Desconectada'
        WHEN status_voip = 'ended' THEN 'Finalizada'
        WHEN status_voip = 'terminated' THEN 'Terminada'
        WHEN status_voip = 'abandoned' THEN 'Abandonada'
        WHEN status_voip = 'lost' THEN 'Perdida'
        WHEN status_voip = 'missed' THEN 'Perdida'
        WHEN status_voip = 'dropped' THEN 'Caiu'
        WHEN status_voip = 'error' THEN 'Erro'
        WHEN status_voip = 'unknown' THEN 'Desconhecido'
        WHEN status_voip IS NULL THEN 'Não informado'
        WHEN status_voip = '' THEN 'Não informado'
        ELSE 'Status desconhecido'
    END,
    updated_at = NOW()
WHERE status_voip_friendly = 'Status desconhecido'
   OR status_voip_friendly IS NULL
   OR status_voip_friendly = '';

-- 4. Verificar quantas ligações foram corrigidas
SELECT 'Ligações corrigidas:' as info;
SELECT 
    COUNT(*) as total_corrigidas
FROM calls 
WHERE updated_at >= NOW() - INTERVAL '1 minute';

-- 5. Verificar status após correção
SELECT 'Status após correção:' as info;
SELECT 
    c.id,
    c.status_voip,
    c.status_voip_friendly,
    c.call_type,
    c.duration
FROM calls c
WHERE c.updated_at >= NOW() - INTERVAL '1 minute'
ORDER BY c.updated_at DESC
LIMIT 10;

-- 6. Verificar se ainda há ligações com status desconhecido
SELECT 'Ligações ainda com status desconhecido:' as info;
SELECT 
    COUNT(*) as total_ainda_desconhecido
FROM calls c
WHERE c.status_voip_friendly = 'Status desconhecido'
   OR c.status_voip_friendly IS NULL
   OR c.status_voip_friendly = '';
