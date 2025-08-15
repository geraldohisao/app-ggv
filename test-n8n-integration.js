// Script de teste para a integração N8N/Pipedrive
// Execute no console do navegador: copy(testN8nIntegration); testN8nIntegration();

window.testN8nIntegration = async function(dealId = '569934') {
    console.log('🧪 TESTE N8N/PIPEDRIVE INTEGRATION');
    console.log('===================================');
    
    const ENDPOINT = 'https://automation-test.ggvinteligencia.com.br/webhook-test/diag-ggv-register';
    
    console.log('🔗 Endpoint:', ENDPOINT);
    console.log('🆔 Deal ID:', dealId);
    
    try {
        // 1. Testar a requisição GET
        const url = `${ENDPOINT}?deal_id=${encodeURIComponent(dealId)}`;
        console.log('📍 URL completa:', url);
        
        console.log('🔄 Fazendo requisição GET...');
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        
        console.log('📊 Status:', response.status);
        console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
        
        // 2. Processar resposta
        const responseText = await response.text();
        console.log('📄 Resposta raw:', responseText);
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log('📦 Dados JSON:', responseData);
        } catch (parseError) {
            console.warn('⚠️ Não foi possível fazer parse JSON:', parseError.message);
            responseData = { raw: responseText };
        }
        
        // 3. Verificar se a requisição foi bem-sucedida
        if (response.ok) {
            console.log('✅ REQUISIÇÃO SUCESSO!');
            
            // 4. Testar mapeamento de dados
            const mappedData = {
                companyName: responseData.companyName || responseData.company_name || responseData.org_name || '',
                email: responseData.email || responseData.contact_email || responseData.person_email || '',
                activityBranch: responseData.activityBranch || responseData.activity_branch || responseData.ramo || '',
                activitySector: responseData.activitySector || responseData.activity_sector || responseData.setor || '',
                monthlyBilling: responseData.monthlyBilling || responseData.monthly_billing || responseData.faturamento_mensal || '',
                salesTeamSize: responseData.salesTeamSize || responseData.sales_team_size || responseData.tamanho_equipe_vendas || '',
                salesChannels: Array.isArray(responseData.salesChannels) 
                    ? responseData.salesChannels 
                    : Array.isArray(responseData.sales_channels)
                    ? responseData.sales_channels
                    : Array.isArray(responseData.canais_vendas)
                    ? responseData.canais_vendas
                    : [],
            };
            
            console.log('🗺️ Dados mapeados:', mappedData);
            
            // 5. Verificar quais campos foram preenchidos
            const filledFields = Object.entries(mappedData).filter(([key, value]) => {
                return value && (Array.isArray(value) ? value.length > 0 : value.toString().trim() !== '');
            });
            
            console.log('✅ Campos preenchidos:', filledFields.length);
            filledFields.forEach(([key, value]) => {
                console.log(`   - ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
            });
            
            // 6. Verificar campos vazios
            const emptyFields = Object.entries(mappedData).filter(([key, value]) => {
                return !value || (Array.isArray(value) ? value.length === 0 : value.toString().trim() === '');
            });
            
            if (emptyFields.length > 0) {
                console.log('⚠️ Campos vazios:', emptyFields.length);
                emptyFields.forEach(([key]) => {
                    console.log(`   - ${key}`);
                });
            }
            
            return {
                success: true,
                status: response.status,
                rawData: responseData,
                mappedData: mappedData,
                filledFields: filledFields.length,
                emptyFields: emptyFields.length
            };
            
        } else {
            console.error('❌ REQUISIÇÃO FALHOU!');
            console.error('Status:', response.status, response.statusText);
            console.error('Dados:', responseData);
            
            return {
                success: false,
                status: response.status,
                error: `${response.status} ${response.statusText}`,
                rawData: responseData
            };
        }
        
    } catch (error) {
        console.error('❌ ERRO NA REQUISIÇÃO:', error);
        return {
            success: false,
            error: error.message,
        };
    } finally {
        console.log('===================================');
    }
};

// Testar com deal_id da URL atual se disponível
window.testCurrentDealId = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const dealId = urlParams.get('deal_id');
    
    if (dealId) {
        console.log('🔍 Deal ID encontrado na URL:', dealId);
        return window.testN8nIntegration(dealId);
    } else {
        console.log('ℹ️ Nenhum deal_id encontrado na URL, usando deal_id padrão');
        return window.testN8nIntegration();
    }
};

console.log('🧪 Funções de teste carregadas!');
console.log('📋 Comandos disponíveis:');
console.log('   testN8nIntegration() - Testa com deal_id padrão');
console.log('   testN8nIntegration("SEU_DEAL_ID") - Testa com deal_id específico');
console.log('   testCurrentDealId() - Testa com deal_id da URL atual');
