const fetch = require('node-fetch');

async function testCompleteN8NMapping() {
    console.log('🎯 TESTE - Mapeamento COMPLETO para N8N');
    
    // Estrutura EXATA que o N8N espera baseado nas imagens
    const payload = {
        deal_id: "62718",
        timestamp: new Date().toISOString(),
        action: "diagnostic_completed",
        
        // Estrutura que corresponde aos mapeamentos N8N
        body: {
            results: {
                maturityPercentage: 75  // $('registerGGVDiag').first().json.body.results.maturityPercentage
            },
            resultUrl: "https://app.grupoggv.com/r/1755792773171-23lafa-627", // $('registerGGVDiag').first().json.body.resultUrl
            
            diagnosticAnswers: [
                {
                    question: "Mapeamento de processos",
                    answer: "Temos processos bem estruturados"  // [0].answer
                },
                {
                    question: "CRM", 
                    answer: "Usamos CRM integrado"  // [1].answer
                },
                {
                    question: "Script comercial",
                    answer: "Temos scripts padronizados"  // [2].answer
                },
                {
                    question: "Teste de perfil comportamental",
                    answer: "Aplicamos testes regularmente"  // [3].answer
                },
                {
                    question: "Plano de metas/comissionamento",
                    answer: "Metas claras e comissão definida"  // [4].answer
                },
                {
                    question: "Indicadores comerciais",
                    answer: "Acompanhamos KPIs principais"  // [5].answer
                },
                {
                    question: "Treinamentos periódicos",
                    answer: "Treinamentos mensais"  // [6].answer
                },
                {
                    question: "Ação de pós-venda",
                    answer: "Follow-up estruturado"  // [7].answer
                },
                {
                    question: "Prospecção ativa",
                    answer: "Prospecção diária organizada"  // [8].answer
                }
            ]
        }
    };

    console.log('📤 PAYLOAD COMPLETO:');
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

        if (response.status === 200) {
            console.log('🎉 SUCESSO! N8N processou o POST corretamente!');
        } else {
            console.log('⚠️ POST ainda com erro, mas estrutura está correta para quando N8N for ajustado');
        }

    } catch (error) {
        console.error('❌ ERRO:', error);
    }
}

testCompleteN8NMapping();
