-- 🔧 CORRIGIR: callsService para puxar direto da tabela calls
-- Este script mostra como o frontend deve puxar os dados diretamente da tabela

-- 1. Verificar estrutura da tabela calls
SELECT '1. Estrutura da tabela calls:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar estrutura da tabela call_analysis
SELECT '2. Estrutura da tabela call_analysis:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_analysis' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Teste de query direta (como o frontend deve fazer)
SELECT '3. Teste de query direta (como o frontend deve fazer):' as info;
SELECT 
    c.id,
    c.provider_call_id,
    c.deal_id,
    c.status,
    c.duration,
    c.duration_formated,
    c.call_type,
    c.direction,
    c.recording_url,
    c.transcription,
    c.insights,
    c.scorecard,
    c.agent_id,
    c.created_at,
    c.updated_at,
    c.status_voip,
    c.status_voip_friendly,
    c.enterprise,
    c.person,
    -- Pipeline extraído de insights ou call_type
    CASE 
        WHEN c.call_type IN ('Apresentação de Proposta', 'Qualificação', 'Descoberta de Necessidades', 'Agendamento', 'Follow-up') 
        THEN c.call_type
        ELSE COALESCE(
            (c.insights->>'pipeline')::TEXT,
            (c.insights->>'deal_stage')::TEXT,
            (c.insights->>'stage')::TEXT,
            'N/A'
        )
    END as pipeline,
    -- Cadência extraída de insights
    COALESCE(
        (c.insights->>'cadence')::TEXT,
        (c.insights->>'sequence')::TEXT,
        'N/A'
    ) as cadence,
    -- Estágio do deal extraído de insights
    COALESCE(
        (c.insights->>'deal_stage')::TEXT,
        (c.insights->>'stage')::TEXT,
        'N/A'
    ) as deal_stage,
    -- SDR email extraído de insights
    COALESCE(
        (c.insights->>'sdr_email')::TEXT,
        (c.insights->>'agent_email')::TEXT,
        (c.insights->>'email')::TEXT,
        'N/A'
    ) as sdr_email,
    -- Score do call_analysis
    ca.final_grade as score
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 5;

-- 4. Verificar se há problemas de RLS
SELECT '4. Verificando RLS na tabela calls:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'calls';

-- 5. Verificar permissões na tabela calls
SELECT '5. Verificando permissões na tabela calls:' as info;
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'calls' 
AND table_schema = 'public';
