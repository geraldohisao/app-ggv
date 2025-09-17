#!/usr/bin/env node

/**
 * 🔧 TESTE CORRIGIDO - Deal ID 56934
 * 
 * Teste com payload otimizado baseado no formato que funciona
 */

const https = require('https');

const DEAL_ID = '56934';
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
                'User-Agent': 'GGV-Diagnostic/2.0',
                'Accept': 'application/json',
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

async function testOptimizedPost() {
    console.log('🔧 TESTE POST OTIMIZADO - Deal ID 56934');
    console.log('=' .repeat(50));
    
    // Payload mais simples, baseado no formato que já funciona
    const payload = {
        deal_id: DEAL_ID,
        timestamp: new Date().toISOString(),
        action: 'diagnostic_completed', // Mudança: action mais simples
        source: 'web-diagnostic',
        
        // Estrutura mais simples
        results: {
            maturityPercentage: 75,
            totalScore: 68,
            maxScore: 90
        },
        
        // URL do resultado
        resultUrl: `https://app.grupoggv.com/r/test-${DEAL_ID}-${Date.now()}`,
        
        // Respostas simplificadas
        diagnosticAnswers: [
            {
                questionId: 1,
                question: "A empresa possui um processo estruturado de prospecção?",
                answer: "Parcialmente",
                score: 5
            },
            {
                questionId: 2,
                question: "Existe um CRM implementado e sendo utilizado?", 
                answer: "Sim",
                score: 10
            },
            {
                questionId: 3,
                question: "A equipe comercial possui metas claras e mensuráveis?",
                answer: "Não",
                score: 0
            }
        ],
        
        // Dados básicos da empresa
        companyData: {
            companyName: "GGV CONSULTORIA EMPRESARIAL", // Usando dados reais do GET
            email: "romaomonique4@gmail.com",
            activityBranch: "Consultoria / Assessoria / Administração",
            monthlyBilling: "Acima de 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores"
        },
        
        version: '2.0-optimized'
    };
    
    console.log('📦 Payload otimizado size:', JSON.stringify(payload).length, 'bytes');
    console.log('📦 Action:', payload.action);
    console.log('📦 Results:', JSON.stringify(payload.results));
    
    try {
        const startTime = Date.now();
        const response = await makeRequest(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': `optimized-${DEAL_ID}-${Date.now()}`,
                'X-Retry-Count': '0'
            },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - startTime;
        
        console.log('\n📊 RESULTADO POST OTIMIZADO:');
        console.log(`  ✓ Status: ${response.status} ${response.statusText}`);
        console.log(`  ✓ Duração: ${duration}ms`);
        console.log(`  ✓ Body: ${response.body}`);
        
        const success = response.status >= 200 && response.status < 300;
        console.log(`  ✓ Sucesso: ${success ? '✅ SIM' : '❌ NÃO'}`);
        
        if (!success) {
            console.log('\n🔍 ANÁLISE DO ERRO:');
            try {
                const errorBody = JSON.parse(response.body);
                console.log('  - Mensagem:', errorBody.message || 'Não informada');
                console.log('  - Detalhes:', errorBody.details || 'Não informados');
            } catch (e) {
                console.log('  - Resposta não é JSON válido');
            }
        }
        
        return { success, status: response.status, duration, body: response.body };
        
    } catch (error) {
        console.log('❌ ERRO POST OTIMIZADO:', error.message);
        return { success: false, error: error.message };
    }
}

// Teste ainda mais simples - apenas notificação
async function testMinimalPost() {
    console.log('\n🔧 TESTE POST MINIMAL - Apenas notificação');
    console.log('=' .repeat(50));
    
    const minimalPayload = {
        deal_id: DEAL_ID,
        action: 'completed',
        timestamp: new Date().toISOString(),
        maturityPercentage: 75
    };
    
    console.log('📦 Payload minimal:', JSON.stringify(minimalPayload));
    
    try {
        const response = await makeRequest(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': `minimal-${DEAL_ID}-${Date.now()}`
            },
            body: JSON.stringify(minimalPayload)
        });
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📊 Body: ${response.body}`);
        
        const success = response.status >= 200 && response.status < 300;
        console.log(`📊 Sucesso: ${success ? '✅ SIM' : '❌ NÃO'}`);
        
        return { success, status: response.status, body: response.body };
        
    } catch (error) {
        console.log('❌ ERRO POST MINIMAL:', error.message);
        return { success: false, error: error.message };
    }
}

async function runOptimizedTests() {
    console.log('🚀 TESTES OTIMIZADOS PARA DEAL 56934\n');
    
    // Teste 1: POST otimizado
    const result1 = await testOptimizedPost();
    
    // Aguardar entre testes
    console.log('\n⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Teste 2: POST minimal
    const result2 = await testMinimalPost();
    
    // Resumo
    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO DOS TESTES OTIMIZADOS');
    console.log('='.repeat(70));
    
    console.log(`🔧 POST Otimizado: ${result1.success ? '✅ SUCESSO' : '❌ FALHA'} (${result1.status || 'N/A'})`);
    console.log(`🔧 POST Minimal: ${result2.success ? '✅ SUCESSO' : '❌ FALHA'} (${result2.status || 'N/A'})`);
    
    if (result1.success || result2.success) {
        console.log('\n🎉 PELO MENOS UM FORMATO FUNCIONOU!');
        console.log('✓ As melhorias implementadas devem funcionar');
        
        if (result1.success) {
            console.log('✓ Formato otimizado funciona - usar na implementação');
        }
        if (result2.success) {
            console.log('✓ Formato minimal funciona - fallback disponível');
        }
    } else {
        console.log('\n⚠️ AMBOS FALHARAM - Possíveis causas:');
        console.log('  - Workflow N8N pode estar com problema');
        console.log('  - Endpoint pode estar esperando formato específico');
        console.log('  - Pode precisar de autenticação adicional');
    }
    
    // Salvar relatório
    const fs = require('fs');
    const report = {
        dealId: DEAL_ID,
        timestamp: new Date().toISOString(),
        optimizedTest: result1,
        minimalTest: result2
    };
    
    fs.writeFileSync(`test-deal-${DEAL_ID}-optimized-report.json`, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório otimizado salvo em: test-deal-${DEAL_ID}-optimized-report.json`);
}

if (require.main === module) {
    runOptimizedTests().catch(console.error);
}

module.exports = { runOptimizedTests, testOptimizedPost, testMinimalPost };
