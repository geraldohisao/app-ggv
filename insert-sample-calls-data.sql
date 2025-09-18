-- =============================================
-- SCRIPT PARA INSERIR DADOS DE TESTE - CALLS
-- Execute no SQL Editor do Supabase
-- =============================================

-- Primeiro, verificar se já existem dados
DO $$
DECLARE
    call_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO call_count FROM calls;
    
    IF call_count = 0 THEN
        RAISE NOTICE 'Tabela calls está vazia. Inserindo dados de exemplo...';
        
        -- Inserir chamadas de exemplo com dados realistas
        INSERT INTO calls (
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
            created_at,
            updated_at
        ) VALUES 
        -- Chamada 1: Atendida com sucesso
        (
            'call_' || extract(epoch from now())::text || '_001',
            '+5511999887766',
            '+5511888776655',
            'camila.santos',
            (SELECT id FROM profiles LIMIT 1),
            'DEAL_12345',
            'prospeccao',
            'outbound',
            'processed',
            245,
            'https://recordings.example.com/call1.mp3',
            'Olá, boa tarde! Estou ligando da Grupo GGV para falar sobre nossas soluções de vendas. Você teria alguns minutos para conversar? Sim, claro! Estamos interessados em melhorar nosso processo comercial...',
            jsonb_build_object(
                'sentiment', 'positive',
                'company', 'Tech Solutions LTDA',
                'interest_level', 'high',
                'next_steps', 'Enviar proposta comercial'
            ),
            jsonb_build_object(
                'total_score', 85,
                'criteria', jsonb_build_object(
                    'rapport', 9,
                    'discovery', 8,
                    'presentation', 8,
                    'closing', 7
                )
            ),
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '2 hours'
        ),
        -- Chamada 2: Não atendida
        (
            'call_' || extract(epoch from now())::text || '_002',
            '+5511777665544',
            '+5511666554433',
            'camila.santos',
            (SELECT id FROM profiles LIMIT 1),
            'DEAL_12346',
            'follow_up',
            'outbound',
            'processed',
            0,
            null,
            null,
            jsonb_build_object(
                'status', 'no_answer',
                'attempts', 1,
                'next_attempt', 'tomorrow',
                'company', 'Empresa ABC'
            ),
            jsonb_build_object(
                'total_score', 0,
                'criteria', jsonb_build_object()
            ),
            NOW() - INTERVAL '4 hours',
            NOW() - INTERVAL '4 hours'
        ),
        -- Chamada 3: Chamada longa com boa qualidade
        (
            'call_' || extract(epoch from now())::text || '_003',
            '+5511555443322',
            '+5511444332211',
            'andressa.oliveira',
            (SELECT id FROM profiles LIMIT 1),
            'DEAL_12347',
            'demo',
            'outbound',
            'processed',
            892,
            'https://recordings.example.com/call3.mp3',
            'Bom dia! Aqui é a Andressa da Grupo GGV. Conforme combinado, vou apresentar nossa plataforma de gestão comercial. Posso compartilhar a tela? Perfeito! Vamos começar pela visão geral do dashboard...',
            jsonb_build_object(
                'sentiment', 'very_positive',
                'company', 'Inovação Empresarial SA',
                'interest_level', 'very_high',
                'decision_maker', true,
                'budget_confirmed', true,
                'next_steps', 'Proposta técnica detalhada'
            ),
            jsonb_build_object(
                'total_score', 92,
                'criteria', jsonb_build_object(
                    'rapport', 10,
                    'discovery', 9,
                    'presentation', 9,
                    'closing', 9
                )
            ),
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '1 day'
        ),
        -- Chamada 4: Chamada de hoje
        (
            'call_' || extract(epoch from now())::text || '_004',
            '+5511333221100',
            '+5511222110099',
            'camila.santos',
            (SELECT id FROM profiles LIMIT 1),
            'DEAL_12348',
            'prospeccao',
            'inbound',
            'processing',
            156,
            'https://recordings.example.com/call4.mp3',
            'Olá! Recebi seu contato através do nosso site. Gostaria de saber mais sobre as soluções da Grupo GGV. Claro! Vou te explicar como podemos ajudar...',
            jsonb_build_object(
                'sentiment', 'neutral',
                'company', 'StartUp Digital',
                'interest_level', 'medium',
                'lead_source', 'website'
            ),
            jsonb_build_object(
                'total_score', 68,
                'criteria', jsonb_build_object(
                    'rapport', 7,
                    'discovery', 6,
                    'presentation', 7,
                    'closing', 6
                )
            ),
            NOW() - INTERVAL '30 minutes',
            NOW() - INTERVAL '30 minutes'
        ),
        -- Chamada 5: Chamada cancelada
        (
            'call_' || extract(epoch from now())::text || '_005',
            '+5511111009988',
            '+5511000998877',
            'andressa.oliveira',
            (SELECT id FROM profiles LIMIT 1),
            'DEAL_12349',
            'follow_up',
            'outbound',
            'failed',
            23,
            null,
            'Desculpe, agora não é um bom momento. Pode ligar mais tarde?',
            jsonb_build_object(
                'status', 'cancelled_by_prospect',
                'reason', 'bad_timing',
                'reschedule_requested', true,
                'company', 'Consultoria XYZ'
            ),
            jsonb_build_object(
                'total_score', 15,
                'criteria', jsonb_build_object(
                    'rapport', 2,
                    'discovery', 0,
                    'presentation', 0,
                    'closing', 0
                )
            ),
            NOW() - INTERVAL '6 hours',
            NOW() - INTERVAL '6 hours'
        );
        
        RAISE NOTICE 'Inseridas 5 chamadas de exemplo com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela calls já contém % registros. Não inserindo dados de exemplo.', call_count;
    END IF;
END $$;

-- Verificar se os dados foram inseridos
SELECT 
    'Dados inseridos:' as status,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM calls;

