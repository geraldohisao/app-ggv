// Teste GET para verificar se o webhook N8N funciona
import fetch from 'node-fetch';

const testN8nGet = async () => {
    const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
    const dealId = '62718'; // Deal ID de teste
    const fullUrl = `${webhookUrl}?deal_id=${dealId}`;
    
    console.log('🧪 TESTE GET - Verificando se webhook funciona...');
    console.log('📍 URL:', fullUrl);
    
    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('\n📊 RESPOSTA GET:');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        
        const responseText = await response.text();
        console.log('Body:', responseText);
        
        if (response.ok) {
            console.log('\n✅ GET FUNCIONA - Webhook responde a GET');
        } else {
            console.log('\n❌ GET FALHA - Webhook não responde a GET');
        }
        
    } catch (error) {
        console.error('\n💥 ERRO DE CONEXÃO GET:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Agora testar POST
    console.log('🧪 TESTE POST - Verificando se webhook aceita POST...');
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                test: true,
                message: "Teste simples POST"
            })
        });
        
        console.log('\n📊 RESPOSTA POST:');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        
        const responseText = await response.text();
        console.log('Body:', responseText);
        
        if (response.ok) {
            console.log('\n✅ POST FUNCIONA - Webhook aceita POST');
        } else {
            console.log('\n❌ POST FALHA - Webhook não aceita POST');
        }
        
    } catch (error) {
        console.error('\n💥 ERRO DE CONEXÃO POST:', error.message);
    }
};

testN8nGet();
