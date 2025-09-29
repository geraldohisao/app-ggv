-- 🔍 DEBUG: Dados do Frontend
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar dados brutos da tabela calls com JOIN
SELECT '1. Dados brutos da tabela calls com JOIN:' as info;
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.call_type,
    c.status_voip,
    c.status_voip_friendly,
    c.duration,
    c.transcription,
    c.insights,
    c.scorecard,
    ca.final_grade,
    ca.general_feedback,
    ca.created_at as analysis_created_at
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE ca.final_grade IS NOT NULL
ORDER BY ca.created_at DESC
LIMIT 5;

-- 2. Verificar se há dados de telefone na tabela calls
SELECT '2. Verificando dados de telefone na tabela calls:' as info;
SELECT 
    id,
    enterprise,
    person,
    insights,
    scorecard,
    created_at
FROM calls 
WHERE person IS NOT NULL 
AND person != 'N/A'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar insights para telefone
SELECT '3. Verificando insights para telefone:' as info;
SELECT 
    id,
    enterprise,
    person,
    insights->>'phone' as phone_from_insights,
    insights->>'telefone' as telefone_from_insights,
    insights->>'contact_phone' as contact_phone_from_insights,
    insights
FROM calls 
WHERE insights IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verificar se há dados de telefone em outros campos
SELECT '4. Verificando outros campos para telefone:' as info;
SELECT 
    id,
    enterprise,
    person,
    from_number,
    to_number,
    insights,
    created_at
FROM calls 
WHERE from_number IS NOT NULL 
OR to_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verificar estrutura completa da tabela calls
SELECT '5. Estrutura completa da tabela calls:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
AND column_name IN ('person', 'enterprise', 'from_number', 'to_number', 'insights', 'scorecard')
ORDER BY ordinal_position;
