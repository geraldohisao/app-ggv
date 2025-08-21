const fetch = require('node-fetch');

async function testCompletePayload() {
    console.log('🎯 TESTE FINAL - Payload COMPLETO com TODAS as 9 perguntas');
    
    // Estrutura EXATA que o frontend envia
    const payload = {
        deal_id: "62719",
        timestamp: new Date().toISOString(),
        action: "diagnostic_completed",
        
        body: {
            results: {
                maturityPercentage: 56  // Exemplo: 50 pontos / 90 = 56%
            },
            resultUrl: "https://app.grupoggv.com/r/1755801234567-xyz789abc-627",
            deal_id: "62719",
            
            // TODAS AS 9 PERGUNTAS - RESPOSTAS COMPLETAS
            diagnosticAnswers: [
                {
                    questionId: 1,
                    question: "Você já realizou o mapeamento de processos da área comercial?",
                    answer: "Parcialmente",
                    description: "Alguns processos mapeados, mas não todos",
                    score: 5
                },
                {
                    questionId: 2,
                    question: "Você utiliza algum sistema de CRM?",
                    answer: "Sim",
                    description: "CRM implementado e utilizado pela equipe",
                    score: 10
                },
                {
                    questionId: 3,
                    question: "Você tem um script comercial redigido e seguido pelo seu time de vendas?",
                    answer: "Não",
                    description: "Não existe script comercial definido",
                    score: 0
                },
                {
                    questionId: 4,
                    question: "Seu time de vendas já realizou algum teste de perfil comportamental?",
                    answer: "Parcialmente",
                    description: "Apenas alguns membros foram avaliados",
                    score: 5
                },
                {
                    questionId: 5,
                    question: "Você tem um plano de metas e comissionamento para o setor comercial?",
                    answer: "Sim",
                    description: "Plano estruturado de metas e comissões",
                    score: 10
                },
                {
                    questionId: 6,
                    question: "A área de vendas realiza reuniões semanais para verificar indicadores comerciais?",
                    answer: "Às vezes",
                    description: "Reuniões esporádicas ou mensais",
                    score: 5
                },
                {
                    questionId: 7,
                    question: "Você realiza treinamentos periódicos para seu time de vendas?",
                    answer: "Às vezes",
                    description: "Treinamentos esporádicos",
                    score: 5
                },
                {
                    questionId: 8,
                    question: "Você realiza alguma ação de pós-venda com os seus clientes?",
                    answer: "Sim",
                    description: "Programa estruturado de pós-venda",
                    score: 10
                },
                {
                    questionId: 9,
                    question: "Você realiza algum tipo de prospecção ativa com os seus clientes?",
                    answer: "Não",
                    description: "Não faz prospecção ativa",
                    score: 0
                }
            ]
        },
        
        companyData: {
            companyName: "Construtora Ikigai",
            email: "Grupokondo@gmail.com",
            activityBranch: "Serviço",
            monthlyBilling: "Acima de 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores"
        }
    };

    console.log('\n📋 RESUMO DO QUE SERÁ ENVIADO:');
    console.log('✅ Deal ID:', payload.deal_id);
    console.log('✅ URL Pública:', payload.body.resultUrl);
    console.log('✅ Maturidade:', payload.body.results.maturityPercentage + '%');
    console.log('✅ Total de Perguntas:', payload.body.diagnosticAnswers.length);
    
    console.log('\n📝 RESPOSTAS DAS PERGUNTAS:');
    payload.body.diagnosticAnswers.forEach((answer, index) => {
        console.log(`${index + 1}. ${answer.answer} (${answer.score} pts)`);
    });

    console.log('\n📤 PAYLOAD COMPLETO:');
    console.log(JSON.stringify(payload, null, 2));

    try {
        console.log('\n🚀 ENVIANDO POST PARA N8N...');
        const response = await fetch('https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.text();
        console.log('📥 RESPONSE STATUS:', response.status);
        console.log('📥 RESPONSE:', result);

        if (response.status === 200 || result.includes('atualizado')) {
            console.log('🎉 SUCESSO! N8N recebeu todas as informações!');
        }

    } catch (error) {
        console.error('❌ ERRO:', error);
    }
}

testCompletePayload();
