// Teste para envio de resultados do diagnóstico para N8N
import fetch from 'node-fetch';

const testDiagnosticResults = async () => {
    const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
    
    // Simular payload completo do diagnóstico
    const payload = {
        companyData: {
            companyName: "Empresa Teste",
            email: "teste@exemplo.com",
            activityBranch: "Tecnologia",
            activitySector: "Software",
            monthlyBilling: "R$ 50.000 - R$ 100.000",
            salesTeamSize: "3-5 pessoas",
            salesChannels: ["Inbound", "Outbound"]
        },
        segment: "TECH_STARTUP",
        answers: {
            1: 8,  // Maturidade comercial
            2: 6,  // Mapeamento de processos
            3: 7,  // CRM
            4: 5,  // Script comercial
            5: 4,  // Teste perfil comportamental
            6: 6,  // Plano de metas e comissionamento
            7: 7,  // Indicadores comerciais
            8: 5,  // Treinamentos periódicos
            9: 6,  // Ação pós-venda
            10: 8  // Prospecção ativa
        },
        totalScore: 62,
        timestamp: new Date().toISOString(),
        testMode: true // Indicar que é um teste
    };
    
    console.log('🧪 TESTE - Iniciando envio para N8N...');
    console.log('📍 URL:', webhookUrl);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        console.log('\n📊 RESPOSTA:');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers));
        
        const responseText = await response.text();
        console.log('Body:', responseText);
        
        if (response.ok) {
            console.log('\n✅ SUCESSO - Dados enviados para N8N!');
        } else {
            console.log('\n❌ ERRO - Falha no envio para N8N');
        }
        
    } catch (error) {
        console.error('\n💥 ERRO DE CONEXÃO:', error.message);
    }
};

// Executar teste
testDiagnosticResults();
