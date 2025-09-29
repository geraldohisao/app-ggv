-- 🔍 VERIFICAR: Dados reais na tabela calls
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar dados reais na tabela calls
SELECT 
    'Dados reais na tabela calls:' as info,
    id,
    enterprise,
    person,
    status_voip_friendly,
    call_type,
    insights
FROM calls 
ORDER BY created_at DESC
LIMIT 5;

-- 2. Verificar se insights tem dados
SELECT 
    'Verificando insights:' as info,
    id,
    insights->>'enterprise' as insights_enterprise,
    insights->>'person' as insights_person,
    insights->>'company' as insights_company,
    insights->>'org_name' as insights_org_name,
    insights->>'person_name' as insights_person_name
FROM calls 
WHERE insights IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar se status_voip_friendly existe
SELECT 
    'Verificando status_voip_friendly:' as info,
    id,
    status_voip,
    status_voip_friendly,
    call_type
FROM calls 
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verificar estrutura real da tabela
SELECT 
    'Estrutura da tabela calls:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND table_schema = 'public'
AND column_name IN ('enterprise', 'person', 'status_voip_friendly', 'insights')
ORDER BY ordinal_position;
