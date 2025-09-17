#!/usr/bin/env node

/**
 * 🧪 TESTE REAL - Deal ID 56934
 * 
 * Testa GET e POST para validar as melhorias implementadas
 */

const https = require('https');
const http = require('http');

// Configurações
const DEAL_ID = '56934';
const BASE_URL = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';

console.log('🧪 TESTANDO DEAL ID:', DEAL_ID);
console.log('🎯 URL BASE:', BASE_URL);
console.log('=' .repeat(70));

// Função para fazer requisição HTTP/HTTPS
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'GGV-Diagnostic-Test/1.0',
                'Accept': 'application/json',
                ...options.headers
            },
            timeout: 15000
        };
        
        const req = client.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
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

// Teste GET
async function testGet() {
    console.log('\n📥 TESTE GET - Verificando se o endpoint responde');
    console.log('-'.repeat(50));
    
    const getUrl = `${BASE_URL}?deal_id=${DEAL_ID}&action=test&timestamp=${Date.now()}`;
    
    console.log('🔗 URL GET:', getUrl);
    
    try {
        const startTime = Date.now();
        const response = await makeRequest(getUrl);
        const duration = Date.now() - startTime;
        
        console.log('📊 RESULTADO GET:');
        console.log(`  ✓ Status: ${response.status} ${response.statusText}`);
        console.log(`  ✓ Duração: ${duration}ms`);
        console.log(`  ✓ Headers:`, JSON.stringify(response.headers, null, 2));
        console.log(`  ✓ Body: ${response.body.substring(0, 500)}${response.body.length > 500 ? '...' : ''}`);
        
        const success = response.status >= 200 && response.status < 300;
        console.log(`  ✓ Sucesso: ${success ? '✅ SIM' : '❌ NÃO'}`);
        
        return { success, status: response.status, duration, body: response.body };
        
    } catch (error) {
        console.log('❌ ERRO GET:', error.message);
        return { success: false, error: error.message };
    }
}

// Teste POST
async function testPost() {
    console.log('\n📤 TESTE POST - Enviando payload completo');
    console.log('-'.repeat(50));
    
    // Payload similar ao que seria enviado pelo diagnóstico real
    const payload = {
        deal_id: DEAL_ID,
        timestamp: new Date().toISOString(),
        action: 'ai_analysis_completed',
        source: 'test-validation',
        
        body: {
            results: {
                maturityPercentage: 75
            },
            resultUrl: `https://app.grupoggv.com/r/test-${DEAL_ID}-${Date.now()}`,
            deal_id: DEAL_ID,
            
            // Análise IA simulada
            aiAnalysis: {
                summaryInsights: {
                    specialistInsight: 'Teste de validação das melhorias implementadas',
                    recommendations: ['Implementar CRM', 'Melhorar processo de vendas']
                },
                detailedAnalysis: {
                    strengths: ['Boa equipe comercial', 'Produto diferenciado'],
                    improvements: ['Processo de follow-up', 'Métricas de conversão'],
                    nextSteps: ['Implementar pipeline', 'Treinar equipe']
                }
            },
            
            // Respostas do diagnóstico simuladas
            diagnosticAnswers: [
                {
                    questionId: 1,
                    question: "A empresa possui um processo estruturado de prospecção?",
                    answer: "Parcialmente",
                    description: "Possui processo, mas não está completamente estruturado",
                    score: 5
                },
                {
                    questionId: 2,
                    question: "Existe um CRM implementado e sendo utilizado?",
                    answer: "Sim",
                    description: "CRM implementado e utilizado pela equipe",
                    score: 10
                }
            ]
        },
        
        // Dados da empresa simulados
        companyData: {
            companyName: `Empresa Teste ${DEAL_ID}`,
            email: `teste${DEAL_ID}@example.com`,
            activityBranch: 'Tecnologia',
            monthlyBilling: 'R$ 100.000 - R$ 500.000',
            salesTeamSize: '3-5 pessoas',
            salesChannels: ['Inbound', 'Outbound']
        },
        
        segment: {
            name: 'Tecnologia',
            id: 'tecnologia'
        },
        
        version: 'test-validation-1.0'
    };
    
    console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('📦 Deal ID no payload:', payload.deal_id);
    console.log('📦 Action:', payload.action);
    
    try {
        const startTime = Date.now();
        const response = await makeRequest(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Test-Deal-ID': DEAL_ID,
                'X-Request-ID': `test-${DEAL_ID}-${Date.now()}`
            },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - startTime;
        
        console.log('📊 RESULTADO POST:');
        console.log(`  ✓ Status: ${response.status} ${response.statusText}`);
        console.log(`  ✓ Duração: ${duration}ms`);
        console.log(`  ✓ Headers:`, JSON.stringify(response.headers, null, 2));
        console.log(`  ✓ Body: ${response.body.substring(0, 500)}${response.body.length > 500 ? '...' : ''}`);
        
        const success = response.status >= 200 && response.status < 300;
        console.log(`  ✓ Sucesso: ${success ? '✅ SIM' : '❌ NÃO'}`);
        
        return { success, status: response.status, duration, body: response.body };
        
    } catch (error) {
        console.log('❌ ERRO POST:', error.message);
        return { success: false, error: error.message };
    }
}

// Executar testes
async function runTests() {
    console.log(`🚀 INICIANDO TESTES PARA DEAL ${DEAL_ID}`);
    
    const results = {
        dealId: DEAL_ID,
        timestamp: new Date().toISOString(),
        tests: {}
    };
    
    // Teste GET
    console.log('\n' + '='.repeat(70));
    results.tests.get = await testGet();
    
    // Aguardar um pouco entre os testes
    console.log('\n⏳ Aguardando 2 segundos entre testes...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Teste POST
    console.log('\n' + '='.repeat(70));
    results.tests.post = await testPost();
    
    // Resumo
    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO DOS TESTES');
    console.log('='.repeat(70));
    
    console.log(`🆔 Deal ID: ${DEAL_ID}`);
    console.log(`📥 GET: ${results.tests.get.success ? '✅ SUCESSO' : '❌ FALHA'} (${results.tests.get.status || 'N/A'})`);
    console.log(`📤 POST: ${results.tests.post.success ? '✅ SUCESSO' : '❌ FALHA'} (${results.tests.post.status || 'N/A'})`);
    
    if (results.tests.get.duration) {
        console.log(`⏱️ Tempo GET: ${results.tests.get.duration}ms`);
    }
    if (results.tests.post.duration) {
        console.log(`⏱️ Tempo POST: ${results.tests.post.duration}ms`);
    }
    
    // Análise dos resultados
    console.log('\n🔍 ANÁLISE:');
    
    if (results.tests.get.success && results.tests.post.success) {
        console.log('🎉 AMBOS OS TESTES PASSARAM!');
        console.log('✓ Endpoint está respondendo corretamente');
        console.log('✓ Melhorias implementadas devem funcionar');
    } else if (results.tests.post.success) {
        console.log('✅ POST funcionou - Principal funcionalidade OK');
        console.log('⚠️ GET pode não estar configurado (normal)');
    } else if (results.tests.get.success) {
        console.log('⚠️ GET funcionou mas POST falhou');
        console.log('🔧 Pode precisar ajustar formato do payload');
    } else {
        console.log('❌ AMBOS FALHARAM');
        console.log('🔧 Endpoint pode estar indisponível ou configuração incorreta');
    }
    
    // Salvar resultados
    const fs = require('fs');
    const reportFile = `test-deal-${DEAL_ID}-report.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Relatório salvo em: ${reportFile}`);
    
    return results;
}

// Executar se for chamado diretamente
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testGet, testPost };
