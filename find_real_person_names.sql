-- ===================================================================
-- ENCONTRAR NOMES REAIS DAS PESSOAS - Não códigos genéricos
-- ===================================================================

-- 1. Verificar se existem tabelas com dados reais de contatos/pessoas
SELECT 
    'TABELAS QUE PODEM TER NOMES REAIS:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND (
        table_name LIKE '%contact%' OR
        table_name LIKE '%person%' OR 
        table_name LIKE '%lead%' OR
        table_name LIKE '%client%' OR
        table_name LIKE '%customer%' OR
        table_name LIKE '%deal%' OR
        table_name LIKE '%opportunity%' OR
        table_name LIKE '%pipedrive%' OR
        table_name LIKE '%crm%' OR
        table_name LIKE '%automation%'
    )
ORDER BY table_name;

-- 2. Verificar se automation_history tem dados reais
SELECT 
    'DADOS EM AUTOMATION_HISTORY:' as info,
    deal_id,
    contact_name,
    contact_email,
    company_name,
    created_at
FROM automation_history 
WHERE deal_id IN ('63021', '62379', '63236')
ORDER BY deal_id, created_at DESC;

-- 3. Verificar todas as colunas da tabela calls para ver se há nomes escondidos
SELECT 
    'TODAS AS COLUNAS DE CALLS:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'calls'
ORDER BY ordinal_position;

-- 4. Verificar dados completos de calls para ver se há nomes em outras colunas
SELECT 
    'DADOS COMPLETOS DE CALLS:' as info,
    deal_id,
    provider_call_id,
    from_number,
    to_number,
    agent_id,
    sdr_id,
    call_type,
    direction,
    transcription,
    -- Verificar se há nomes na transcrição
    CASE 
        WHEN transcription IS NOT NULL AND LENGTH(transcription) > 0 THEN 
            'TEM TRANSCRIÇÃO: ' || LEFT(transcription, 100) || '...'
        ELSE 'SEM TRANSCRIÇÃO'
    END as transcription_preview
FROM calls 
WHERE deal_id IN ('63021', '62379', '63236')
LIMIT 3;

-- 5. Verificar se há dados em scorecards que podem ter nomes
SELECT 
    'DADOS EM SCORECARDS:' as info,
    deal_id,
    scorecard
FROM calls 
WHERE deal_id IN ('63021', '62379', '63236')
    AND scorecard IS NOT NULL 
    AND scorecard != '{}'::jsonb;

-- 6. Procurar por tabelas de profiles/users que podem ter nomes reais
SELECT 
    'VERIFICANDO TABELA PROFILES:' as info,
    id,
    email,
    full_name,
    first_name,
    last_name
FROM profiles 
LIMIT 5;

-- 7. Verificar se há relação entre deal_id e outras tabelas
-- Buscar tabelas que tenham coluna deal_id
SELECT 
    'TABELAS COM DEAL_ID:' as info,
    table_name,
    column_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND column_name = 'deal_id'
ORDER BY table_name;

-- 8. Se existir tabela de deals/opportunities, verificar dados
SELECT 
    'VERIFICANDO SE HÁ TABELA DE DEALS:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('deals', 'opportunities', 'pipedrive_deals', 'crm_deals');

-- 9. Verificar dados em reactivated_leads se existir
SELECT 
    'DADOS EM REACTIVATED_LEADS:' as info,
    deal_id,
    contact_name,
    contact_email,
    company_name
FROM reactivated_leads 
WHERE deal_id IN ('63021', '62379', '63236')
LIMIT 5;
