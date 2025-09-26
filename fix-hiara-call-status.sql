-- 🔧 CORRIGIR: Status da ligação da Hiara
-- Script simples para corrigir o status_voip_friendly baseado no status_voip real

-- 1. Verificar a ligação da Hiara
SELECT 'Ligação da Hiara:' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.status,
    c.status_voip,
    c.call_type,
    c.duration,
    c.created_at
FROM calls c
WHERE c.id = '495aca80-b525-41e6-836e-0e9208e6c73a'
   OR c.provider_call_id LIKE '%495aca80%'
   OR c.agent_id LIKE '%Hiara%'
ORDER BY c.created_at DESC
LIMIT 5;

-- 2. Verificar se existe coluna status_voip_friendly
SELECT 'Verificando se existe coluna status_voip_friendly:' as info;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
AND column_name = 'status_voip_friendly';

-- 3. Se a coluna não existir, criar ela
ALTER TABLE calls ADD COLUMN IF NOT EXISTS status_voip_friendly TEXT;

-- 4. Atualizar status_voip_friendly baseado no status_voip
UPDATE calls 
SET 
    status_voip_friendly = CASE 
        WHEN status_voip = 'normal_clearing' THEN 'Atendida'
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
WHERE id = '495aca80-b525-41e6-836e-0e9208e6c73a'
   OR provider_call_id LIKE '%495aca80%'
   OR agent_id LIKE '%Hiara%';

-- 5. Verificar se a correção funcionou
SELECT 'Status após correção:' as info;
SELECT 
    c.id,
    c.status,
    c.status_voip,
    c.status_voip_friendly,
    c.call_type,
    c.duration
FROM calls c
WHERE c.id = '495aca80-b525-41e6-836e-0e9208e6c73a'
   OR c.provider_call_id LIKE '%495aca80%'
   OR c.agent_id LIKE '%Hiara%';

-- 6. Verificar quantas ligações foram atualizadas
SELECT 'Ligações atualizadas:' as info;
SELECT 
    COUNT(*) as total_atualizadas
FROM calls 
WHERE updated_at >= NOW() - INTERVAL '1 minute';
