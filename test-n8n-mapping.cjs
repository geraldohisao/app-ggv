const fetch = require('node-fetch');

async function testN8NMapping() {
    console.log('🔧 TESTE - Mapeamento correto para N8N');
    
    // Estrutura que o N8N espera baseado na imagem
    const payload = {
        deal_id: "62718",
        timestamp: new Date().toISOString(),
        action: "diagnostic_completed",
        // Estrutura que corresponde aos mapeamentos do N8N
        body: {
            results: {
                maturityPercentage: 75, // Para: $('registerGGVDiag').first().json.body.results.maturityPercentage
            },
            diagnosticAnswers: [
                {
                    questionId: 1,
                    question: "Mapeamento de processos",
                    answer: "Temos processos bem estruturados", // Para: $('registerGGVDiag').item.json.body.diagnosticAnswers[0].answer
                    score: 4
                },
                {
                    questionId: 2, 
                    question: "CRM",
                    answer: "Usamos CRM integrado", // Para: $('registerGGVDiag').item.json.body.diagnosticAnswers[1].answer
                    score: 5
                }
            ]
        }
    };

    console.log('📤 PAYLOAD PARA N8N:');
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

        if (response.status >= 400) {
            console.log('\n🔄 TENTANDO GET FALLBACK...');
            const getUrl = `https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register?deal_id=62718&action=diagnostic_completed`;
            const getResponse = await fetch(getUrl);
            const getResult = await getResponse.text();
            console.log('📥 GET STATUS:', getResponse.status);
            console.log('📥 GET RESULT:', getResult);
        }

    } catch (error) {
        console.error('❌ ERRO:', error);
    }
}

testN8NMapping();
