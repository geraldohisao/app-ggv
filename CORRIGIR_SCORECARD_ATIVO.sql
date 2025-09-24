-- CORRIGIR_SCORECARD_ATIVO.sql
-- Verificar e corrigir problema de scorecard ativo

-- ===================================================================
-- ETAPA 1: VERIFICAR SCORECARDS EXISTENTES
-- ===================================================================

-- Ver todos os scorecards e seus status
SELECT 
    id,
    name,
    description,
    active,
    created_at,
    updated_at
FROM scorecards
ORDER BY created_at DESC;

-- Contar scorecards por status
SELECT 
    active,
    COUNT(*) as count
FROM scorecards
GROUP BY active;

-- ===================================================================
-- ETAPA 2: ATIVAR PELO MENOS UM SCORECARD
-- ===================================================================

-- Se não há nenhum scorecard ativo, ativar o mais recente
DO $$
BEGIN
    -- Verificar se existe pelo menos um scorecard ativo
    IF NOT EXISTS (SELECT 1 FROM scorecards WHERE active = true) THEN
        -- Se não existe, ativar o mais recente
        UPDATE scorecards 
        SET active = true, updated_at = NOW()
        WHERE id = (
            SELECT id FROM scorecards 
            ORDER BY created_at DESC 
            LIMIT 1
        );
        
        RAISE NOTICE 'Scorecard mais recente foi ativado automaticamente';
    ELSE
        RAISE NOTICE 'Já existe scorecard ativo';
    END IF;
END $$;

-- ===================================================================
-- ETAPA 3: SE NÃO EXISTIR NENHUM SCORECARD, CRIAR UM BÁSICO
-- ===================================================================

-- Criar scorecard básico se não existir nenhum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM scorecards) THEN
        INSERT INTO scorecards (
            id,
            name,
            description,
            active,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            'Scorecard Básico - Consultoria',
            'Scorecard padrão para análise de ligações de consultoria',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Scorecard básico criado e ativado';
    END IF;
END $$;

-- ===================================================================
-- ETAPA 4: VERIFICAR SE FUNÇÃO get_scorecard_smart EXISTE
-- ===================================================================

-- Verificar se a função necessária existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'get_scorecard_smart'
        ) 
        THEN '✅ get_scorecard_smart existe'
        ELSE '❌ get_scorecard_smart NÃO existe'
    END as status_function;

-- ===================================================================
-- ETAPA 5: CRIAR FUNÇÃO get_scorecard_smart SE NÃO EXISTIR
-- ===================================================================

-- Primeiro, remover a função existente se houver conflito de tipos
DROP FUNCTION IF EXISTS public.get_scorecard_smart(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_scorecard_smart(
    call_type_param TEXT DEFAULT NULL,
    pipeline_param TEXT DEFAULT NULL,
    cadence_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    match_score INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    -- Retornar scorecard ativo com score de match baseado na similaridade
    SELECT 
        s.id,
        s.name,
        s.description,
        CASE 
            WHEN s.name ILIKE '%' || COALESCE(call_type_param, 'consultoria') || '%' THEN 100
            WHEN s.name ILIKE '%consultoria%' THEN 90
            WHEN s.name ILIKE '%vendas%' THEN 80
            WHEN s.name ILIKE '%ligação%' THEN 70
            ELSE 50
        END as match_score
    FROM scorecards s
    WHERE s.active = true
    ORDER BY match_score DESC, s.created_at DESC
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_scorecard_smart(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ===================================================================
-- ETAPA 6: TESTAR A FUNÇÃO
-- ===================================================================

-- Testar a função com diferentes tipos de call
SELECT * FROM get_scorecard_smart('Oportunidade', 'GGV Inteligência em Vendas', 'Inbound - Consultoria');
SELECT * FROM get_scorecard_smart('consultoria', NULL, NULL);
SELECT * FROM get_scorecard_smart(NULL, NULL, NULL);

-- ===================================================================
-- ETAPA 7: VERIFICAÇÃO FINAL
-- ===================================================================

-- Verificar scorecards ativos finais
SELECT 
    id,
    name,
    active,
    created_at
FROM scorecards
WHERE active = true
ORDER BY created_at DESC;

SELECT '🔧 SCORECARD ATIVO CONFIGURADO!' as status;
SELECT '📊 Agora a análise real deve funcionar sem erros' as resultado;
SELECT '⚡ Teste novamente a análise em massa' as proximos_passos;
