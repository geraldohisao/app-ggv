-- 🔍 ANÁLISE COMPLETA: Fluxo de Dados das Chamadas
-- Identificar exatamente onde os dados se perdem

-- =========================================
-- PARTE 1: VERIFICAR DADOS NA TABELA
-- =========================================

SELECT '=== DADOS BRUTOS NA TABELA CALLS (Últimas 5) ===' as info;

SELECT 
    id,
    enterprise,
    person,
    deal_id,
    agent_id,
    sdr_id,
    to_number,
    from_number,
    status_voip_friendly,
    created_at
FROM calls
ORDER BY created_at DESC
LIMIT 5;

-- =========================================
-- PARTE 2: VERIFICAR FUNÇÃO get_calls_with_filters
-- =========================================

SELECT '=== VERIFICANDO DEFINIÇÃO DA FUNÇÃO ===' as info;

SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_calls_with_filters';

-- Ver colunas que a função retorna
SELECT 
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'get_calls_with_filters'
)
AND parameter_mode = 'OUT'
ORDER BY ordinal_position;

-- =========================================
-- PARTE 3: TESTAR FUNÇÃO DIRETAMENTE
-- =========================================

SELECT '=== TESTANDO get_calls_with_filters DIRETAMENTE ===' as info;

SELECT 
    id,
    enterprise,
    person,
    deal_id,
    agent_id,
    sdr_id,
    sdr_name,
    sdr_email,
    to_number,
    from_number,
    status_voip_friendly
FROM get_calls_with_filters(
    p_sdr := NULL,
    p_status := NULL,
    p_type := NULL,
    p_start_date := NULL,
    p_end_date := NULL,
    p_limit := 5,
    p_offset := 0,
    p_sort_by := 'created_at',
    p_min_duration := NULL,
    p_max_duration := NULL,
    p_min_score := NULL,
    p_search_query := NULL
)
LIMIT 5;

-- =========================================
-- PARTE 4: DIAGNÓSTICO
-- =========================================

SELECT '
🔍 DIAGNÓSTICO COMPLETO:

1. Se dados EXISTEM na tabela mas NÃO aparecem na função:
   ❌ A função get_calls_with_filters não está retornando os campos
   ✅ SOLUÇÃO: Recriar a função para incluir TODOS os campos

2. Se dados EXISTEM na função mas NÃO chegam no frontend:
   ❌ O mapeamento no JavaScript está perdendo os dados
   ✅ SOLUÇÃO: Corrigir CallsPage.tsx e callsService.ts

3. Se dados NÃO EXISTEM na tabela:
   ❌ Webhook não está salvando os dados corretamente
   ✅ SOLUÇÃO: Corrigir webhook de inserção

' as diagnostico;

