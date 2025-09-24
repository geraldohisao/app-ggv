-- INSERIR_DADOS_TESTE_CACHE.sql
-- Script para inserir dados de teste na tabela call_analysis_cache

-- Verificar se a tabela existe primeiro
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache') THEN
        RAISE EXCEPTION '❌ Tabela call_analysis_cache não existe. Execute primeiro o script 21_call_analysis_ai.sql';
    END IF;
END $$;

-- Inserir dados de teste
INSERT INTO call_analysis_cache (
    deal_id,
    analysis_type,
    analysis_content,
    transcription_summary,
    call_count,
    total_duration,
    created_at,
    expires_at
) VALUES 
(
    'deal_teste_001',
    'comprehensive',
    'Esta é uma análise de teste para verificar se o sistema de cache está funcionando corretamente.',
    'Total: 3 ligações, 15 minutos',
    3,
    900,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '23 hours'  -- Expira em 23 horas
),
(
    'deal_teste_002',
    'comprehensive',
    'Análise de teste com dados expirados para testar a limpeza automática.',
    'Total: 2 ligações, 8 minutos',
    2,
    480,
    NOW() - INTERVAL '25 hours',
    NOW() - INTERVAL '1 hour'  -- JÁ EXPIRADO - deve ser removido pela função
),
(
    'deal_teste_003',
    'comprehensive',
    'Outra análise de teste com dados válidos.',
    'Total: 5 ligações, 25 minutos',
    5,
    1500,
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '22 hours'  -- Expira em 22 horas
);

-- Verificar os dados inseridos
SELECT 
    deal_id,
    analysis_type,
    call_count,
    total_duration,
    created_at,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN '🔴 EXPIRADO'
        ELSE '✅ VÁLIDO'
    END as status
FROM call_analysis_cache 
WHERE deal_id LIKE 'deal_teste_%'
ORDER BY created_at;

-- Mostrar total de registros
SELECT 
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as registros_expirados,
    COUNT(*) FILTER (WHERE expires_at >= NOW()) as registros_validos
FROM call_analysis_cache;
