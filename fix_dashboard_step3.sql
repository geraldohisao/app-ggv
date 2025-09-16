-- PASSO 3: Atualizar get_call_details
-- Execute este bloco por último:

DROP FUNCTION IF EXISTS public.get_call_details CASCADE;

CREATE OR REPLACE FUNCTION public.get_call_details(p_call_id UUID)
RETURNS TABLE(
    id UUID,
    provider_call_id TEXT,
    deal_id TEXT,
    company_name TEXT,
    person_name TEXT,
    person_email TEXT,
    sdr_id TEXT,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
    status TEXT,
    status_voip TEXT,
    status_voip_friendly TEXT,
    duration INTEGER,
    duration_formatted TEXT,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
    audio_url TEXT,
    transcription TEXT,
    transcript_status TEXT,
    ai_status TEXT,
    insights JSONB,
    scorecard JSONB,
    from_number TEXT,
    to_number TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    comments JSONB,
    detailed_scores JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.provider_call_id,
        c.deal_id,
        COALESCE(
            c.insights->>'company', 
            c.insights->>'enterprise',
            c.insights->>'company_name',
            'Empresa não informada'
        ) as company_name,
        COALESCE(
            c.insights->>'person', 
            c.insights->>'person_name',
            c.insights->>'contact_name'
        ) as person_name,
        c.insights->>'person_email' as person_email,
        COALESCE(p.email_voip, c.agent_id) as sdr_id,
        COALESCE(p.full_name, c.agent_id) as sdr_name,
        COALESCE(p.email_voip, c.agent_id) as sdr_email,
        COALESCE(p.avatar_url, 'https://i.pravatar.cc/64?u=' || c.agent_id) as sdr_avatar_url,
        c.status,
        c.status_voip,
        CASE c.status_voip
            WHEN 'normal_clearing' THEN 'Atendida'
            WHEN 'no_answer' THEN 'Não atendida'
            WHEN 'originator_cancel' THEN 'Cancelada pela SDR'
            WHEN 'number_changed' THEN 'Numero mudou'
            WHEN 'recovery_on_timer_expire' THEN 'Tempo esgotado'
            WHEN 'unallocated_number' THEN 'Número não encontrado'
            ELSE COALESCE(c.status_voip, 'Status desconhecido')
        END as status_voip_friendly,
        c.duration,
        CASE 
            WHEN c.duration IS NULL OR c.duration = 0 THEN '00:00:00'
            WHEN c.duration >= 3600 THEN 
                LPAD(FLOOR(c.duration / 3600)::TEXT, 2, '0') || ':' ||
                LPAD(FLOOR((c.duration % 3600) / 60)::TEXT, 2, '0') || ':' ||
                LPAD((c.duration % 60)::TEXT, 2, '0')
            ELSE 
                '00:' ||
                LPAD(FLOOR(c.duration / 60)::TEXT, 2, '0') || ':' ||
                LPAD((c.duration % 60)::TEXT, 2, '0')
        END as duration_formatted,
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
        COALESCE(c.recording_url, CONCAT(COALESCE(c.audio_bucket, ''), '/', COALESCE(c.audio_path, ''))) as audio_url,
        c.transcription,
        c.transcript_status,
        c.ai_status,
        c.insights,
        c.scorecard,
        c.from_number,
        c.to_number,
        c.agent_id,
        c.created_at,
        c.updated_at,
        c.processed_at,
        c.comments,
        c.detailed_scores
    FROM calls c
    LEFT JOIN profiles p ON LOWER(TRIM(c.agent_id)) = LOWER(TRIM(p.email))
    WHERE c.id = p_call_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO authenticated, anon, service_role;
