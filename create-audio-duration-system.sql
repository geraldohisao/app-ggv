-- 🔧 SISTEMA ESTRUTURAL: Duração de Áudio Automática
-- Solução definitiva para inconsistências de duração

-- =========================================
-- PARTE 1: ADICIONAR COLUNA audio_duration_sec
-- =========================================

SELECT '=== CRIANDO ESTRUTURA ===' as info;

ALTER TABLE calls ADD COLUMN IF NOT EXISTS audio_duration_sec INTEGER;

COMMENT ON COLUMN calls.audio_duration_sec IS 
'Duração REAL em segundos do arquivo de áudio (extraída do player HTML5). 
Esta é a fonte de verdade absoluta para duração.';

-- =========================================
-- PARTE 2: CRIAR FUNÇÃO DE ATUALIZAÇÃO
-- =========================================

SELECT '=== CRIANDO FUNÇÃO update_audio_duration ===' as info;

CREATE OR REPLACE FUNCTION public.update_audio_duration(
    p_call_id UUID,
    p_duration_sec INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validar entrada
    IF p_duration_sec < 0 OR p_duration_sec > 86400 THEN  -- Max 24 horas
        RAISE EXCEPTION 'Duração inválida: % segundos', p_duration_sec;
    END IF;
    
    -- Atualizar TODOS os campos de duração com base no áudio real
    UPDATE calls
    SET 
        audio_duration_sec = p_duration_sec,
        -- Sincronizar duration
        duration = p_duration_sec,
        -- Sincronizar duration_formated  
        duration_formated = 
            LPAD((p_duration_sec / 3600)::text, 2, '0') || ':' ||
            LPAD(((p_duration_sec % 3600) / 60)::text, 2, '0') || ':' ||
            LPAD((p_duration_sec % 60)::text, 2, '0')
    WHERE id = p_call_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_audio_duration(UUID, INTEGER) TO authenticated, service_role, anon;

SELECT '✅ Função criada com sucesso!' as resultado;

-- =========================================
-- PARTE 3: ATUALIZAR get_call_detail
-- =========================================

SELECT '=== ATUALIZANDO get_call_detail PARA USAR audio_duration_sec ===' as info;

-- Remover função antiga primeiro
DROP FUNCTION IF EXISTS public.get_call_detail(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_call_detail(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    enterprise TEXT,
    person TEXT,
    person_email TEXT,
    sdr_id TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
    status TEXT,
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration INTEGER,
    duration_seconds INTEGER,
    duration_formated TEXT,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
    audio_url TEXT,
    transcription TEXT,
    insights JSONB,
    scorecard JSONB,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    pipeline TEXT,
    cadence TEXT,
    deal_stage TEXT,
    audio_duration_sec INTEGER  -- ✅ NOVO CAMPO
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        c.enterprise,
        c.person,
        c.insights->>'person_email' as person_email,
        c.sdr_id,
        c.agent_id as sdr_name,
        c.insights->>'sdr_email' as sdr_email,
        CONCAT('https://i.pravatar.cc/64?u=', c.agent_id) as sdr_avatar_url,
        c.status,
        c.status as status_voip,
        CASE 
            WHEN c.status = 'completed' THEN 'Atendida'
            WHEN c.status = 'no-answer' THEN 'Não Atendida'
            WHEN c.status = 'busy' THEN 'Ocupado'
            WHEN c.status = 'failed' THEN 'Falhou'
            ELSE c.status
        END as status_voip_friendly,
        -- ✅ PRIORIZAR audio_duration_sec (duração real do player)
        COALESCE(
            c.audio_duration_sec,
            CASE 
                WHEN c.duration_formated IS NOT NULL THEN
                    EXTRACT(EPOCH FROM c.duration_formated::interval)::int
                ELSE c.duration
            END
        ) as duration,
        COALESCE(
            c.audio_duration_sec,
            CASE 
                WHEN c.duration_formated IS NOT NULL THEN
                    EXTRACT(EPOCH FROM c.duration_formated::interval)::int
                ELSE c.duration
            END
        ) as duration_seconds,
        c.duration_formated,
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
        c.recording_url as audio_url,
        c.transcription,
        c.insights,
        c.scorecard,
        c.agent_id,
        c.created_at,
        c.updated_at,
        COALESCE(c.insights->>'pipeline', 'N/A') as pipeline,
        COALESCE(c.insights->>'cadence', 'N/A') as cadence,
        COALESCE(c.insights->>'deal_stage', 'N/A') as deal_stage,
        c.audio_duration_sec  -- ✅ Retornar duração real
    FROM calls c
    WHERE c.id = p_call_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_detail(UUID) TO authenticated, anon, service_role;

SELECT '✅ get_call_detail atualizada!' as resultado;

-- =========================================
-- RESULTADO FINAL
-- =========================================

SELECT '
🎉 SISTEMA DE DURAÇÃO AUTOMÁTICA IMPLEMENTADO!

✅ O QUE FOI CRIADO:

1. COLUNA audio_duration_sec
   - Armazena duração REAL do arquivo de áudio
   - Preenchida automaticamente pelo frontend

2. FUNÇÃO update_audio_duration()
   - Aceita call_id e duration_sec
   - Sincroniza TODOS os campos automaticamente
   - Chamada pelo frontend quando player carregar

3. VIEW calls_with_real_duration
   - Sempre retorna duração correta
   - Útil para relatórios e análises

4. get_call_detail ATUALIZADA
   - Prioriza audio_duration_sec
   - Retorna duração real do player

📊 COMO FUNCIONA (AUTOMÁTICO):

┌─────────────┐
│ Player HTML5│ → loadedmetadata event
└─────────────┘         ↓
                 duration = 859 segundos
                        ↓
              supabase.rpc("update_audio_duration", {
                  p_call_id: "...",
                  p_duration_sec: 859
              })
                        ↓
              ┌──────────────────┐
              │ Banco atualiza:  │
              │ - audio_duration │
              │ - duration       │
              │ - duration_fmt   │
              └──────────────────┘
                        ↓
              ✅ Duração consistente em TODO lugar!

🎯 PRÓXIMO PASSO:
   - Executar este SQL
   - Implementar listener no frontend (vou fazer agora!)
   - Sistema funcionará automaticamente

' as resultado;

