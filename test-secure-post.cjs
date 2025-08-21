const fetch = require('node-fetch');

// Simular exatamente o que o frontend faz
async function testSecurePost() {
    console.log('🧪 TESTE - Simulando POST do frontend com token seguro');
    
    // Gerar token seguro igual ao frontend
    const generateSecureToken = (dealId) => {
        const timestamp = Date.now();
        const randomSalt = Math.random().toString(36).substring(2, 15);
        const dataToHash = `${dealId}-${timestamp}-${randomSalt}`;
        
        let hash = 0;
        for (let i = 0; i < dataToHash.length; i++) {
            const char = dataToHash.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const shortDealId = dealId.substring(0, 3);
        return `${timestamp}-${Math.abs(hash).toString(36)}-${shortDealId}`;
    };

    const dealId = '62718';
    const secureToken = generateSecureToken(dealId);
    const publicReportUrl = `https://app.grupoggv.com/r/${secureToken}`;
    
    console.log('🔒 TOKEN SEGURO GERADO:', secureToken);
    console.log('🔗 URL PÚBLICA:', publicReportUrl);

    // Payload exatamente como o frontend envia
    const diagnosticPayload = {
        deal_id: dealId,
        timestamp: new Date().toISOString(),
        companyData: {
            companyName: "Empresa Teste Segura",
            email: "teste@empresa.com",
            segment: "Tecnologia",
            employeeCount: "11-50"
        },
        diagnosticAnswers: [
            {
                questionId: 1,
                question: "Como você avalia o processo de prospecção da sua empresa?",
                answer: "Temos um processo estruturado",
                description: "Processo bem definido com etapas claras",
                score: 4
            },
            {
                questionId: 2,
                question: "Qual o nível de uso do CRM na sua empresa?",
                answer: "Usamos CRM avançado",
                description: "CRM integrado com automações",
                score: 5
            }
        ],
        totalScore: 45,
        maturityLevel: "Intermediário",
        publicReportUrl: publicReportUrl,
        action: "diagnostic_completed"
    };

    console.log('📤 PAYLOAD:', JSON.stringify(diagnosticPayload, null, 2));

    try {
        // Tentar POST primeiro
        console.log('\n🚀 TENTANDO POST...');
        const postResponse = await fetch('https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(diagnosticPayload)
        });

        const postResult = await postResponse.text();
        console.log('📥 POST RESPONSE STATUS:', postResponse.status);
        console.log('📥 POST RESPONSE:', postResult);

        // Se POST falhar, tentar GET como fallback
        if (postResponse.status >= 400) {
            console.log('\n🔄 POST FALHOU - TENTANDO GET FALLBACK...');
            
            const getUrl = `https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register?deal_id=${dealId}&action=diagnostic_completed&timestamp=${encodeURIComponent(new Date().toISOString())}&publicReportUrl=${encodeURIComponent(publicReportUrl)}`;
            
            const getResponse = await fetch(getUrl);
            const getResult = await getResponse.text();
            
            console.log('📥 GET RESPONSE STATUS:', getResponse.status);
            console.log('📥 GET RESPONSE:', getResult);
        }

    } catch (error) {
        console.error('❌ ERRO:', error);
    }
}

testSecurePost();
