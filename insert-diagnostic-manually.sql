-- Script para inserir manualmente o diagnóstico diagnostic-1755874448033
-- Execute este script no Supabase SQL Editor após executar fix-public-reports-system.sql

-- Baseado nos dados visíveis no N8N, vamos inserir um diagnóstico de exemplo
-- Você deve substituir os dados pelos dados reais do diagnóstico

INSERT INTO diagnostic_public_reports (
    token, 
    report, 
    deal_id, 
    expires_at, 
    created_at
) VALUES (
    'diagnostic-1755874448033',
    jsonb_build_object(
        'companyData', jsonb_build_object(
            'companyName', 'Empresa Teste', -- SUBSTITUIR pelo nome real
            'email', 'contato@empresa.com', -- SUBSTITUIR pelo email real
            'activityBranch', 'Tecnologia', -- SUBSTITUIR
            'activitySector', 'Software', -- SUBSTITUIR
            'monthlyBilling', 'R$ 50.000 - R$ 100.000',
            'salesTeamSize', '2-5 pessoas',
            'salesChannels', ARRAY['B2B', 'Online']
        ),
        'segment', jsonb_build_object(
            'name', 'Geral'
        ),
        'totalScore', 45, -- SUBSTITUIR pela pontuação real
        'maturity', jsonb_build_object(
            'level', 'Média',
            'color', 'text-yellow-600',
            'bgColor', 'bg-yellow-100',
            'description', 'Em Desenvolvimento'
        ),
        'summaryInsights', jsonb_build_object(
            'specialistInsight', 'A empresa apresenta fragilidades significativas em suas operações comerciais, refletindo na baixa pontuação (10/90). A ausência de CRM, mapeamento de processos, script de vendas e treinamentos regulares compromete a previsibilidade e performance. A falta de prospecção ativa limita o crescimento.'
        ),
        'detailedAnalysis', jsonb_build_object(
            'strengths', ARRAY[
                'Empresa demonstra carência de estrutura e métodos comerciais eficazes',
                'Oportunidade de implementação de melhorias significativas'
            ],
            'nextSteps', ARRAY[
                'Implementar sistema de CRM',
                'Mapear e documentar processos comerciais',
                'Criar script de vendas padronizado'
            ]
        ),
        'scoresByArea', jsonb_build_object(
            'Processos', jsonb_build_object('score', 5, 'maxScore', 20),
            'Tecnologia', jsonb_build_object('score', 10, 'maxScore', 20),
            'Equipe', jsonb_build_object('score', 15, 'maxScore', 30),
            'Estratégia', jsonb_build_object('score', 15, 'maxScore', 20)
        )
    ),
    NULL, -- deal_id (não há deal_id neste caso)
    NOW() + INTERVAL '90 days', -- expires_at
    '2025-08-22T11:54:08.033Z' -- created_at (timestamp do token)
);

-- Verificar se foi inserido corretamente
SELECT 
    token,
    report->'companyData'->>'companyName' as company_name,
    report->'totalScore' as total_score,
    created_at,
    expires_at
FROM diagnostic_public_reports 
WHERE token = 'diagnostic-1755874448033';

-- Testar a função RPC
SELECT * FROM get_public_report('diagnostic-1755874448033');
