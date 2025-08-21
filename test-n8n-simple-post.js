// Teste com payload simples similar ao formato GET que funciona
import fetch from 'node-fetch';

const testSimplePost = async () => {
    const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
    
    // Payload simples similar ao formato que o GET retorna
    const payload = {
        empresa: "TechSolutions Brasil",
        email: "contato@techsolutions.com.br",
        ramo_de_atividade: "Tecnologia da Informação",
        setor_de_atuação: "Software e Desenvolvimento",
        faturamento_mensal: "R$ 100.000 - R$ 500.000",
        tamanho_equipe_comercial: "5-10 pessoas",
        
        // Resultados do diagnóstico
        pontuacao_total: 69,
        nivel_maturidade: "Média-Alta",
        porcentagem_maturidade: "69%",
        
        // Respostas (formato simplificado)
        respostas: {
            maturidade_comercial: "Às vezes",
            mapeamento_processos: "Sim",
            crm: "Sim",
            script_comercial: "Às vezes",
            teste_comportamental: "N/A",
            plano_metas: "Às vezes",
            indicadores_comerciais: "Sim",
            treinamentos: "N/A",
            pos_venda: "Às vezes",
            prospeccao_ativa: "Sim"
        },
        
        // Link do resultado
        link_resultado: "https://app.grupoggv.com/r/abc123def456ghi789",
        
        // Metadados
        deal_id: "62718",
        timestamp: new Date().toISOString(),
        tipo: "resultado_diagnostico"
    };
    
    console.log('🧪 TESTE SIMPLES - Enviando resultado com formato simplificado...');
    console.log('📍 URL:', webhookUrl);
    console.log('📊 Empresa:', payload.empresa);
    console.log('🎯 Pontuação:', `${payload.pontuacao_total}/100`);
    console.log('🔗 Link:', payload.link_resultado);
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
        
        const responseText = await response.text();
        console.log('Body:', responseText);
        
        if (response.ok) {
            console.log('\n✅ SUCESSO - Resultado enviado com formato simplificado!');
        } else {
            console.log('\n❌ ERRO - Falha no envio');
            
            // Tentar também via query parameters (como GET)
            console.log('\n🔄 TENTANDO VIA QUERY PARAMS...');
            const queryUrl = `${webhookUrl}?` + new URLSearchParams({
                empresa: payload.empresa,
                pontuacao: payload.pontuacao_total.toString(),
                nivel: payload.nivel_maturidade,
                link: payload.link_resultado,
                deal_id: payload.deal_id || '',
                tipo: 'resultado'
            }).toString();
            
            console.log('📍 Query URL:', queryUrl);
            
            const queryResponse = await fetch(queryUrl, { method: 'GET' });
            console.log('Query Status:', queryResponse.status);
            const queryText = await queryResponse.text();
            console.log('Query Body:', queryText);
        }
        
    } catch (error) {
        console.error('\n💥 ERRO DE CONEXÃO:', error.message);
    }
};

testSimplePost();
