const fetch = require('node-fetch');

async function testDiagnosticResponses() {
    console.log('🧪 TESTE - Respostas exatas do diagnóstico para N8N');
    
    // Baseado nas imagens, as respostas são:
    const diagnosticResponses = {
        1: "Não", // Mapeamento de processos
        2: "Não", // CRM  
        3: "Não", // Script comercial
        4: "Não", // Teste de perfil comportamental
        5: "Não", // Plano de metas/comissionamento
        6: "Às vezes", // Indicadores comerciais
        7: "Não", // Treinamentos periódicos
        8: "Não", // Ação de pós-venda
        9: "Não"  // Prospecção ativa
    };
    
    // Calcular maturidade baseado nas respostas
    const scores = {
        "Sim": 10,
        "Parcialmente": 5,
        "Às vezes": 5,
        "Não": 0,
        "N/A": 0
    };
    
    let totalScore = 0;
    const maxScore = 90; // 9 perguntas x 10 pontos
    
    Object.values(diagnosticResponses).forEach(response => {
        totalScore += scores[response] || 0;
    });
    
    const maturityPercentage = Math.round((totalScore / maxScore) * 100);
    
    console.log('📊 CÁLCULO DE MATURIDADE:');
    console.log('Total Score:', totalScore);
    console.log('Max Score:', maxScore);
    console.log('Maturidade:', maturityPercentage + '%');
    
    // Estrutura exata para N8N
    const payload = {
        deal_id: "62719",
        timestamp: new Date().toISOString(),
        action: "diagnostic_completed",
        
        body: {
            results: {
                maturityPercentage: maturityPercentage
            },
            resultUrl: "https://app.grupoggv.com/r/1755794123456-9x3k2p-627",
            deal_id: "62719",
            
            // Respostas exatas das perguntas
            diagnosticAnswers: [
                {
                    questionId: 1,
                    question: "Você já realizou o mapeamento de processos da área comercial?",
                    answer: "Não",
                    score: 0
                },
                {
                    questionId: 2,
                    question: "Você utiliza algum sistema de CRM?",
                    answer: "Não", 
                    score: 0
                },
                {
                    questionId: 3,
                    question: "Você tem um script comercial redigido e seguido pelo seu time de vendas?",
                    answer: "Não",
                    score: 0
                },
                {
                    questionId: 4,
                    question: "Seu time de vendas já realizou algum teste de perfil comportamental?",
                    answer: "Não",
                    score: 0
                },
                {
                    questionId: 5,
                    question: "Você tem um plano de metas e comissionamento para o setor comercial?",
                    answer: "Não",
                    score: 0
                },
                {
                    questionId: 6,
                    question: "A área de vendas realiza reuniões semanais para verificar indicadores comerciais?",
                    answer: "Às vezes",
                    score: 5
                },
                {
                    questionId: 7,
                    question: "Você realiza treinamentos periódicos para seu time de vendas?",
                    answer: "Não",
                    score: 0
                },
                {
                    questionId: 8,
                    question: "Você realiza alguma ação de pós-venda com os seus clientes?",
                    answer: "Não",
                    score: 0
                },
                {
                    questionId: 9,
                    question: "Você realiza algum tipo de prospecção ativa com os seus clientes?",
                    answer: "Não",
                    score: 0
                }
            ]
        }
    };

    console.log('\n📤 PAYLOAD PARA N8N:');
    console.log(JSON.stringify(payload, null, 2));

    try {
        console.log('\n🚀 ENVIANDO POST...');
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

    } catch (error) {
        console.error('❌ ERRO:', error);
    }
}

testDiagnosticResponses();
