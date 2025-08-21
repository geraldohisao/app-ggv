const fetch = require('node-fetch');

async function testN8NExact() {
    console.log('🎯 TESTE - Estrutura EXATA baseada no N8N');
    
    // Analisando a imagem, o N8N espera:
    // $('registerGGVDiag').first().json.body.results.maturityPercentage
    // $('registerGGVDiag').item.json.body.diagnosticAnswers[0].answer
    
    const payload = {
        // Simular estrutura de webhook que o N8N reconhece
        json: {
            body: {
                deal_id: "62718",
                results: {
                    maturityPercentage: 75
                },
                diagnosticAnswers: [
                    {
                        question: "Mapeamento de processos",
                        answer: "Temos processos bem estruturados"
                    },
                    {
                        question: "CRM", 
                        answer: "Usamos CRM integrado"
                    }
                ]
            }
        }
    };

    console.log('📤 PAYLOAD EXATO:');
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

    // Teste 2: Payload direto sem json wrapper
    console.log('\n🔄 TESTE 2 - Payload direto:');
    
    const directPayload = {
        deal_id: "62718",
        results: {
            maturityPercentage: 75
        },
        diagnosticAnswers: [
            {
                question: "Mapeamento de processos",
                answer: "Temos processos bem estruturados"
            },
            {
                question: "CRM",
                answer: "Usamos CRM integrado"
            }
        ]
    };

    try {
        const response2 = await fetch('https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(directPayload)
        });

        const result2 = await response2.text();
        console.log('📥 RESPONSE 2 STATUS:', response2.status);
        console.log('📥 RESPONSE 2:', result2);

    } catch (error) {
        console.error('❌ ERRO 2:', error);
    }
}

testN8NExact();
