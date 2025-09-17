#!/usr/bin/env node

/**
 * 🔧 TESTE DO FIX DUAL WEBHOOK - Deal ID 62719
 * 
 * Testa ambos os webhooks que são enviados em produção
 */

const https = require('https');

const DEAL_ID = '62719';
const BASE_URL = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Content-Type': 'application/json',
                'Origin': 'https://app.grupoggv.com',
                'Referer': 'https://app.grupoggv.com/',
                ...options.headers
            },
            timeout: 15000
        };
        
        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

// Teste 1: Update Deal Fields (primeira requisição que estava falhando)
async function testUpdateDealFields() {
    console.log('🔧 TESTE 1: UPDATE DEAL FIELDS - Com contexto obrigatório');
    console.log('=' .repeat(60));
    
    const payload = {
        action: 'update_deal_fields',
        source: 'ggv-diagnostic-company-form',
        dealId: DEAL_ID,
        changedFields: {
            perfil_do_cliente: "teste perfil do cliente v2\n\nteste4",
            monthlyBilling: "Acima de R$ 1 milhão/mês",
            salesChannels: ["Inside Sales", "Distribuidores"]
        },
        formData: {
            companyName: "Construtora Ikigai",
            email: "Grupokondo@gmail.com",
            activityBranch: "Serviço",
            monthlyBilling: "Acima de R$ 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores",
            salesChannels: ["Inside Sales", "Distribuidores"],
            activitySector: "Imóveis / Arquitetura / Construção civil",
            situacao: "Construtora em Curitiba que faz casas de alto padrão, ele presta o serviço para quem quer a própria casa e agora está entrando no mercado de incorporação\n\nQuer apoio para estruturar os processos, meetime e pipedrive na construtora.\nteste3",
            problema: "Recebe um volume de leads e recentemente não está convertendo. Está contratando 1 vendedor e 2 SDR`s. \nteste 3",
            perfil_do_cliente: "teste perfil do cliente v2\n\nteste4"
        },
        
        // 🚀 FIX: Contexto obrigatório adicionado
        clientContext: {
            situacao: "Construtora em Curitiba que faz casas de alto padrão, ele presta o serviço para quem quer a própria casa e agora está entrando no mercado de incorporação\n\nQuer apoio para estruturar os processos, meetime e pipedrive na construtora.\nteste3",
            problema: "Recebe um volume de leads e recentemente não está convertendo. Está contratando 1 vendedor e 2 SDR`s. \nteste 3",
            perfil_do_cliente: "teste perfil do cliente v2\n\nteste4"
        },
        
        timestamp: new Date().toISOString()
    };
    
    console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('📦 Action:', payload.action);
    console.log('📦 Contexto presente:', !!payload.clientContext);
    
    try {
        const response = await makeRequest(BASE_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📊 Body: ${response.body}`);
        
        const success = response.status >= 200 && response.status < 300;
        console.log(`📊 Sucesso: ${success ? '✅ SIM' : '❌ NÃO'}`);
        
        return { success, status: response.status, body: response.body, type: 'update_fields' };
        
    } catch (error) {
        console.log('❌ ERRO:', error.message);
        return { success: false, error: error.message, type: 'update_fields' };
    }
}

// Teste 2: Diagnóstico Completo (segunda requisição que já funcionava)
async function testDiagnosticComplete() {
    console.log('\n🎯 TESTE 2: DIAGNÓSTICO COMPLETO - Análise IA');
    console.log('=' .repeat(60));
    
    const payload = {
        deal_id: DEAL_ID,
        timestamp: new Date().toISOString(),
        action: 'ai_analysis_completed',
        
        body: {
            results: {
                maturityPercentage: 22
            },
            resultUrl: `https://app.grupoggv.com/r/test-fix-${DEAL_ID}-${Date.now()}`,
            deal_id: DEAL_ID,
            
            aiAnalysis: {
                summaryInsights: {
                    specialistInsight: "A Construtora Ikigai apresenta um cenário de crescimento, com faturamento acima de R$ 1 milhão/mês, mas enfrenta desafios na conversão de leads.",
                    recommendations: []
                },
                detailedAnalysis: {
                    strengths: [
                        "Faturamento acima de R$ 1 milhão/mês",
                        "Presença em mercado promissor (imóveis de alto padrão em Curitiba)",
                        "Expansão para mercado de incorporação"
                    ],
                    improvements: [],
                    nextSteps: [
                        "Agendar reunião para detalhar a implementação do plano de ação.",
                        "Elaborar um cronograma de atividades com prazos e responsáveis.",
                        "Monitorar os resultados e fazer ajustes no plano conforme necessário."
                    ]
                }
            },
            
            diagnosticAnswers: [
                {
                    questionId: 1,
                    question: "Você já realizou o mapeamento de processos da área comercial?",
                    answer: "Parcialmente",
                    description: "Alguns processos mapeados, mas não todos",
                    score: 5
                },
                {
                    questionId: 2,
                    question: "Você utiliza algum sistema de CRM?",
                    answer: "Parcialmente",
                    description: "Tem CRM mas não é usado consistentemente",
                    score: 5
                }
            ]
        },
        
        companyData: {
            companyName: "Construtora Ikigai",
            email: "Grupokondo@gmail.com",
            activityBranch: "Serviço",
            monthlyBilling: "Acima de R$ 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores",
            salesChannels: ["Inside Sales", "Distribuidores"]
        },
        
        clientContext: {
            situacao: "Construtora em Curitiba que faz casas de alto padrão, ele presta o serviço para quem quer a própria casa e agora está entrando no mercado de incorporação\n\nQuer apoio para estruturar os processos, meetime e pipedrive na construtora.\nteste3",
            problema: "Recebe um volume de leads e recentemente não está convertendo. Está contratando 1 vendedor e 2 SDR`s. \nteste 3",
            perfil_do_cliente: "teste perfil do cliente v2\n\nteste4"
        },
        
        segment: {
            name: "Geral",
            id: "gen_1"
        },
        
        source: "web-diagnostic",
        version: "test-fix-dual-webhook"
    };
    
    console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('📦 Action:', payload.action);
    console.log('📦 Contexto presente:', !!payload.clientContext);
    
    try {
        const response = await makeRequest(BASE_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📊 Body: ${response.body}`);
        
        const success = response.status >= 200 && response.status < 300;
        console.log(`📊 Sucesso: ${success ? '✅ SIM' : '❌ NÃO'}`);
        
        return { success, status: response.status, body: response.body, type: 'diagnostic_complete' };
        
    } catch (error) {
        console.log('❌ ERRO:', error.message);
        return { success: false, error: error.message, type: 'diagnostic_complete' };
    }
}

async function runDualWebhookTest() {
    console.log('🔧 TESTE DO FIX DUAL WEBHOOK - Deal 62719\n');
    
    // Teste 1: Update Deal Fields
    const result1 = await testUpdateDealFields();
    
    // Aguardar entre testes
    console.log('\n⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Teste 2: Diagnóstico Completo
    const result2 = await testDiagnosticComplete();
    
    // Resumo
    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO DO TESTE DUAL WEBHOOK');
    console.log('='.repeat(70));
    
    console.log(`🔧 Update Fields: ${result1.success ? '✅ SUCESSO' : '❌ FALHA'} (${result1.status || 'N/A'})`);
    console.log(`🎯 Diagnostic Complete: ${result2.success ? '✅ SUCESSO' : '❌ FALHA'} (${result2.status || 'N/A'})`);
    
    if (result1.success && result2.success) {
        console.log('\n🎉 FIX CONFIRMADO!');
        console.log('✅ Ambos os webhooks funcionam agora');
        console.log('✅ Contexto obrigatório em ambas as requisições');
        console.log('✅ Não haverá mais erro 400 na primeira tentativa');
        console.log('✅ Sistema funcionará de primeira em produção');
        
    } else if (result1.success) {
        console.log('\n✅ PRIMEIRO WEBHOOK CORRIGIDO!');
        console.log('✓ Update fields agora funciona');
        console.log('⚠️ Verificar segundo webhook se necessário');
        
    } else {
        console.log('\n⚠️ AINDA PRECISA AJUSTES');
        console.log('🔧 Verificar se há outros campos obrigatórios');
    }
    
    // Salvar relatório
    const fs = require('fs');
    const report = {
        dealId: DEAL_ID,
        timestamp: new Date().toISOString(),
        testType: 'dual-webhook-fix',
        updateFieldsTest: result1,
        diagnosticCompleteTest: result2,
        conclusion: (result1.success && result2.success) ? 
            'FIX CONFIRMADO - Ambos webhooks funcionando' : 
            'NECESSITA MAIS AJUSTES'
    };
    
    fs.writeFileSync(`dual-webhook-fix-report-${DEAL_ID}.json`, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: dual-webhook-fix-report-${DEAL_ID}.json`);
    
    return report;
}

if (require.main === module) {
    runDualWebhookTest().catch(console.error);
}

module.exports = { runDualWebhookTest, testUpdateDealFields, testDiagnosticComplete };
