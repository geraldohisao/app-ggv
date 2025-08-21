const fetch = require('node-fetch');

async function testCorrectAnswers() {
    console.log('🎯 TESTE - Respostas EXATAS do formulário (não números)');
    
    // Baseado nas imagens que você mostrou, as respostas devem ser EXATAMENTE:
    const correctPayload = {
        deal_id: "62719",
        timestamp: new Date().toISOString(),
        action: "diagnostic_completed",
        
        body: {
            results: {
                maturityPercentage: 50  // Exemplo
            },
            resultUrl: "https://app.grupoggv.com/r/1755802345678-abc123def-627",
            deal_id: "62719",
            
            // RESPOSTAS EXATAS DO FORMULÁRIO (não números!)
            diagnosticAnswers: [
                {
                    questionId: 1,
                    question: "Você já realizou o mapeamento de processos da área comercial?",
                    answer: "Parcialmente",  // ← Texto exato, não número
                    score: 5
                },
                {
                    questionId: 2,
                    question: "Você utiliza algum sistema de CRM?",
                    answer: "Não",  // ← Texto exato, não número
                    score: 0
                },
                {
                    questionId: 3,
                    question: "Você tem um script comercial redigido e seguido pelo seu time de vendas?",
                    answer: "Não",  // ← Texto exato, não número
                    score: 0
                },
                {
                    questionId: 4,
                    question: "Seu time de vendas já realizou algum teste de perfil comportamental?",
                    answer: "Não",  // ← Texto exato, não número
                    score: 0
                },
                {
                    questionId: 5,
                    question: "Você tem um plano de metas e comissionamento para o setor comercial?",
                    answer: "Sim",  // ← Texto exato, não número
                    score: 10
                },
                {
                    questionId: 6,
                    question: "A área de vendas realiza reuniões semanais para verificar indicadores comerciais?",
                    answer: "Às vezes",  // ← Texto exato, não número
                    score: 5
                },
                {
                    questionId: 7,
                    question: "Você realiza treinamentos periódicos para seu time de vendas?",
                    answer: "Não",  // ← Texto exato, não número
                    score: 0
                },
                {
                    questionId: 8,
                    question: "Você realiza alguma ação de pós-venda com os seus clientes?",
                    answer: "Às vezes",  // ← Texto exato, não número
                    score: 5
                },
                {
                    questionId: 9,
                    question: "Você realiza algum tipo de prospecção ativa com os seus clientes?",
                    answer: "Não",  // ← Texto exato, não número
                    score: 0
                }
            ]
        }
    };

    console.log('\n📝 RESPOSTAS CORRETAS (texto, não números):');
    correctPayload.body.diagnosticAnswers.forEach((answer, index) => {
        console.log(`${index + 1}. "${answer.answer}" (${answer.score} pts)`);
    });

    console.log('\n✅ OPÇÕES VÁLIDAS DO FORMULÁRIO:');
    console.log('- "Sim"');
    console.log('- "Não"');
    console.log('- "Parcialmente"');
    console.log('- "Às vezes"');
    console.log('- "(Nenhum)" (quando aplicável)');

    console.log('\n📤 ENVIANDO TESTE...');
    
    try {
        const response = await fetch('https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(correctPayload)
        });

        const result = await response.text();
        console.log('📥 RESPONSE STATUS:', response.status);
        console.log('📥 RESPONSE:', result);

    } catch (error) {
        console.error('❌ ERRO:', error);
    }
}

testCorrectAnswers();
