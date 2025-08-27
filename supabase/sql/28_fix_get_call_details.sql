-- 28_fix_get_call_details.sql
-- Corrige a função get_call_details que está causando erro 500
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- CRIAR FUNÇÃO get_call_details COMPLETA
-- =========================================

CREATE OR REPLACE FUNCTION public.get_call_details(p_call_id UUID)
RETURNS TABLE (
    id UUID,
    provider_call_id TEXT,
    company TEXT,
    deal_id TEXT,
    sdr_id UUID,
    sdr_name TEXT,
    sdr_email TEXT,
    sdr_avatar_url TEXT,
    status TEXT,
    duration INTEGER,
    call_type TEXT,
    direction TEXT,
    recording_url TEXT,
    audio_bucket TEXT,
    audio_path TEXT,
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
    processed_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id,
        c.provider_call_id,
        COALESCE(
            (c.insights->>'company'), 
            (c.insights->'metadata'->>'company'),
            CASE 
                WHEN c.deal_id IS NOT NULL THEN 'Empresa ' || c.deal_id
                ELSE 'Empresa não informada'
            END
        ) AS company,
        c.deal_id,
        c.sdr_id,
        COALESCE(p.full_name, 'SDR não identificado') as sdr_name,
        p.email as sdr_email,
        p.avatar_url as sdr_avatar_url,
        c.status,
        c.duration,
        c.call_type,
        c.direction,
        c.recording_url,
        c.audio_bucket,
        c.audio_path,
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
        c.processed_at
    FROM calls c
    LEFT JOIN profiles p ON c.sdr_id = p.id
    WHERE c.id = p_call_id;
$$;

-- =========================================
-- GRANT PERMISSIONS
-- =========================================

GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_call_details(UUID) TO service_role;

-- =========================================
-- VERIFICAR SE EXISTEM DADOS DE TESTE
-- =========================================

-- Inserir uma chamada de teste se não existir nenhuma
INSERT INTO calls (
    id,
    provider_call_id,
    from_number,
    to_number,
    agent_id,
    sdr_id,
    deal_id,
    call_type,
    direction,
    status,
    duration,
    recording_url,
    transcription,
    insights,
    scorecard,
    created_at
)
SELECT 
    '214608c6-62bc-4bf0-848d-f1cc2bb9a5ec'::UUID,
    '020ea87-fc74-4dec-a2a4-2af693554c1e',
    '+5511999999999',
    '+5511888888888',
    'agent_123',
    (SELECT id FROM profiles WHERE role IN ('sdr', 'closer') LIMIT 1),
    '63073',
    'outbound',
    'outbound',
    'processed',
    372,
    'https://drive.google.com/file/d/1BxGKJ8vQZgJ4mVcX2nP9rL7sK3fH6wE/view?usp=sharing',
    'Bom dia! Meu nome é João Silva do Grupo GGV. Estou entrando em contato com a Empresa 63073 para falar sobre soluções de vendas. Qual é o principal desafio que vocês enfrentam no processo de vendas atualmente? Como vocês fazem o acompanhamento dos leads hoje? Nossa solução pode ajudar a aumentar a taxa de conversão em até 40% através de automação inteligente. Entendo sua preocupação, mas vamos analisar o valor que isso pode gerar. Podemos agendar uma reunião esta semana? Obrigado pelo tempo e até breve!',
    '{"company": "Empresa 63073", "segment": "Technology", "leadScore": 8}',
    '{"finalScore": 8, "analysisDate": "2025-01-27T15:30:00Z", "version": "2.0"}',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM calls WHERE id = '214608c6-62bc-4bf0-848d-f1cc2bb9a5ec'::UUID
);

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Este script:
-- 1. Cria a função get_call_details que estava faltando
-- 2. Inclui LEFT JOIN com profiles para dados do SDR
-- 3. Trata casos onde não há SDR associado
-- 4. Insere dados de teste se necessário
-- 5. Garante que a função funcione corretamente
