-- 27_insert_sample_calls.sql
-- Insere dados de exemplo na tabela calls para teste
-- Execute este script no SQL Editor do Supabase

-- =========================================
-- INSERIR DADOS DE EXEMPLO
-- =========================================

-- Primeiro, vamos buscar alguns user IDs existentes para usar como SDRs
-- (você deve ajustar estes UUIDs para IDs reais do seu sistema)

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
    audio_bucket,
    audio_path,
    transcript_status,
    ai_status,
    transcription,
    insights,
    scorecard
) VALUES 
(
    'call_demo_001',
    '+5511999888777',
    '+5511888777666',
    'agent_001',
    NULL, -- Ajustar para UUID real de um SDR
    'DEAL-12345',
    'diagnostico',
    'outbound',
    'processed',
    450,
    'https://example.com/audio/call_demo_001.mp3',
    'calls-audio',
    'recordings/2024/01/call_demo_001.wav',
    'completed',
    'processed',
    'Olá, bom dia! Aqui é da Grupo GGV, tudo bem? Estou ligando para falar sobre a proposta que enviamos para vocês na semana passada. O Sr. João está disponível? 

[Cliente] Sim, sou eu mesmo. Olha, eu vi a proposta sim, mas ainda estou analisando com minha equipe.

Perfeito! Entendo que é uma decisão importante. Posso tirar algumas dúvidas que vocês possam ter? A nossa solução realmente pode ajudar a otimizar os processos de vocês em até 40%.

[Cliente] Sim, na verdade tenho algumas perguntas sobre a implementação...

Claro! Fique à vontade. Nossa equipe técnica tem muita experiência e o processo de implementação é bem tranquilo.',
    '{"company": "Tech Solutions LTDA", "contact_name": "João Silva", "interest_level": "high", "next_steps": "Enviar documentação técnica", "pain_points": ["processo manual", "falta de integração"], "budget_range": "50k-100k"}',
    '{"total_score": 85, "criteria": {"rapport": 9, "needs_identification": 8, "solution_presentation": 9, "closing": 7}, "notes": "Excelente rapport, cliente demonstrou interesse genuíno"}'
),
(
    'call_demo_002', 
    '+5511777666555',
    '+5511666555444',
    'agent_002',
    NULL, -- Ajustar para UUID real de um SDR
    'DEAL-12346',
    'ligacao',
    'inbound',
    'processing',
    280,
    NULL,
    'calls-audio',
    'recordings/2024/01/call_demo_002.wav',
    'in_progress',
    'analyzing',
    'Boa tarde! Vocês que ligaram para nós ontem sobre consultoria empresarial?

[Cliente] Isso mesmo! Recebi o contato de vocês e gostaria de saber mais sobre os serviços.

Que ótimo! Muito obrigada pelo retorno. Deixa eu te explicar um pouco melhor como funcionam nossos serviços de consultoria...

[Cliente] Perfeito, estou ouvindo.',
    '{"company": "Inovação & Cia", "contact_name": "Maria Santos", "interest_level": "medium", "call_source": "inbound_lead"}',
    '{}'
),
(
    'call_demo_003',
    '+5511555444333', 
    '+5511444333222',
    'agent_001',
    NULL, -- Ajustar para UUID real de um SDR
    'DEAL-12347',
    'proposta',
    'outbound',
    'failed',
    0,
    NULL,
    NULL,
    NULL,
    'failed',
    'failed',
    NULL,
    '{"company": "StartUp XYZ", "contact_name": "Pedro Costa", "call_result": "no_answer"}',
    '{}'
),
(
    'call_demo_004',
    '+5511333222111',
    '+5511222111000', 
    'agent_003',
    NULL, -- Ajustar para UUID real de um SDR
    'DEAL-12348',
    'diagnostico',
    'outbound',
    'processed',
    620,
    'https://example.com/audio/call_demo_004.mp3',
    'calls-audio',
    'recordings/2024/01/call_demo_004.wav',
    'completed',
    'processed',
    'Bom dia! Aqui é da Grupo GGV. Estou ligando para a Sra. Ana, responsável pela área comercial. Ela está?

[Cliente] Sim, sou eu. O que desejam?

Sra. Ana, muito prazer! Estou ligando porque identificamos que vocês podem se beneficiar muito dos nossos serviços de consultoria em vendas. Posso fazer algumas perguntas rápidas para entender melhor a situação atual de vocês?

[Cliente] Pode sim, mas seja breve por favor.

Claro! Quantos vendedores vocês têm na equipe atualmente?

[Cliente] Temos 8 vendedores.

E qual tem sido o principal desafio em relação às vendas?

[Cliente] Olha, a conversão está baixa. Muitos leads mas poucas vendas fechadas.

Entendo perfeitamente. Esse é um problema muito comum que já resolvemos para mais de 200 empresas. Nossa metodologia consegue aumentar a conversão em média 60%. Posso agendar uma apresentação de 30 minutos para mostrar como funciona?

[Cliente] Interessante... pode ser sim. Que tal na próxima terça?

Perfeito! Vou confirmar por email.',
    '{"company": "Vendas Premium", "contact_name": "Ana Paula", "interest_level": "high", "team_size": 8, "main_challenge": "low_conversion", "meeting_scheduled": true, "next_meeting": "2024-02-06T14:00:00"}',
    '{"total_score": 92, "criteria": {"rapport": 9, "needs_identification": 10, "solution_presentation": 9, "closing": 9}, "notes": "Excelente call, cliente muito receptivo e reunião agendada"}'
)
ON CONFLICT (provider_call_id) DO NOTHING;

-- =========================================
-- ATUALIZAR SDR_IDs COM DADOS REAIS
-- =========================================

-- Este comando vai pegar o primeiro usuário com role 'sdr' ou 'closer' 
-- e atribuir às calls de exemplo
-- ATENÇÃO: Execute apenas se existirem usuários com essas roles

DO $$
DECLARE
    sdr_user_id UUID;
BEGIN
    -- Buscar um SDR real do sistema
    SELECT id INTO sdr_user_id 
    FROM profiles 
    WHERE role IN ('sdr', 'closer', 'admin') 
    LIMIT 1;
    
    -- Se encontrou um usuário, atualizar as calls de exemplo
    IF sdr_user_id IS NOT NULL THEN
        UPDATE calls 
        SET sdr_id = sdr_user_id 
        WHERE provider_call_id LIKE 'call_demo_%';
        
        RAISE NOTICE 'SDR ID % atribuído às calls de exemplo', sdr_user_id;
    ELSE
        RAISE NOTICE 'Nenhum usuário SDR encontrado. Mantenha sdr_id como NULL';
    END IF;
END $$;

-- =========================================
-- COMENTÁRIOS
-- =========================================

-- Este script insere dados de exemplo para testar:
-- 1. Chamadas com diferentes status (processed, processing, failed)
-- 2. Diferentes tipos de chamada (diagnostico, ligacao, proposta)
-- 3. Transcrições realistas
-- 4. Insights e scorecards de exemplo
-- 5. Dados de áudio (URLs e paths)
-- 6. Associação com SDRs reais do sistema

-- Para testar completamente:
-- 1. Execute este script
-- 2. Execute o script 26_update_calls_functions.sql
-- 3. Teste no frontend
