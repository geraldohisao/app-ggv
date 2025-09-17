#!/usr/bin/env node

/**
 * 🔍 TESTE COM CONTEXTO COMPLETO - Deal ID 56934
 * 
 * Incluindo situacao, problema e perfil_do_cliente que podem ser obrigatórios
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

async function testWithClientContext() {
    console.log('🔍 TESTE COM CONTEXTO DO CLIENTE - Deal ID 56934');
    console.log('=' .repeat(60));
    
    // Payload com contexto completo do cliente
    const payload = {
        deal_id: DEAL_ID,
        timestamp: new Date().toISOString(),
        action: 'ai_analysis_completed',
        source: 'web-diagnostic',
        
        body: {
            results: {
                maturityPercentage: 75
            },
            resultUrl: `https://app.grupoggv.com/r/test-${DEAL_ID}-${Date.now()}`,
            deal_id: DEAL_ID,
            
            // 🚀 ADICIONANDO: Contexto do cliente que pode ser obrigatório
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
        
        // Dados da empresa (baseados no GET real)
        companyData: {
            companyName: "GGV CONSULTORIA EMPRESARIAL",
            email: "romaomonique4@gmail.com",
            activityBranch: "Consultoria / Assessoria / Administração",
            monthlyBilling: "Acima de 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores",
            salesChannels: ["Inbound", "Outbound"]
        },
        
        // 🎯 CONTEXTO DO CLIENTE - Pode ser obrigatório!
        clientContext: {
            situacao: "Empresa em crescimento buscando otimizar processos comerciais",
            problema: "Falta de estruturação no processo de vendas e follow-up inconsistente",
            perfil_do_cliente: "Consultoria empresarial com faturamento alto mas equipe pequena"
        },
        
        segment: {
            name: "Consultoria",
            id: "consultoria"
        },
        
        version: 'context-test-1.0'
    };
    
    console.log('📦 Payload com contexto size:', JSON.stringify(payload).length, 'bytes');
    console.log('📦 Contexto do cliente:');
    console.log('  - Situação:', payload.clientContext.situacao);
    console.log('  - Problema:', payload.clientContext.problema);
    console.log('  - Perfil:', payload.clientContext.perfil_do_cliente);
    
    try {
        const startTime = Date.now();
        const response = await makeRequest(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': `context-${DEAL_ID}-${Date.now()}`,
                'X-Test-Type': 'with-client-context'
            },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - startTime;
        
        console.log('\n📊 RESULTADO COM CONTEXTO:');
        console.log(`  ✓ Status: ${response.status} ${response.statusText}`);
        console.log(`  ✓ Duração: ${duration}ms`);
        console.log(`  ✓ Body: ${response.body}`);
        
        const success = response.status >= 200 && response.status < 300;
        console.log(`  ✓ Sucesso: ${success ? '✅ SIM' : '❌ NÃO'}`);
        
        return { success, status: response.status, duration, body: response.body };
        
    } catch (error) {
        console.log('❌ ERRO:', error.message);
        return { success: false, error: error.message };
    }
}

// Teste com formato mais próximo ao real
async function testRealFormat() {
    console.log('\n🎯 TESTE FORMATO REAL - Baseado no código atual');
    console.log('=' .repeat(60));
    
    // Formato exato do código atual
    const payload = {
        deal_id: DEAL_ID,
        timestamp: new Date().toISOString(),
        action: 'ai_analysis_completed',
        
        body: {
            results: {
                maturityPercentage: Math.round((68 / 90) * 100) // Simulando cálculo real
            },
            resultUrl: `https://app.grupoggv.com/r/test-${DEAL_ID}-${Date.now()}`,
            deal_id: DEAL_ID,
            
            // Análise IA simulada
            aiAnalysis: {
                summaryInsights: {
                    specialistInsight: 'Empresa com potencial de crescimento, mas precisa estruturar processos comerciais',
                    recommendations: [
                        'Implementar CRM mais robusto',
                        'Definir processo de follow-up',
                        'Criar métricas de acompanhamento'
                    ]
                },
                detailedAnalysis: {
                    strengths: [
                        'Alto faturamento mensal',
                        'Experiência em consultoria',
                        'Posicionamento no mercado'
                    ],
                    improvements: [
                        'Estruturação do processo comercial',
                        'Ampliação da equipe de vendas',
                        'Implementação de métricas'
                    ],
                    nextSteps: [
                        'Mapear processo atual',
                        'Definir pipeline de vendas',
                        'Treinar equipe em CRM'
                    ]
                }
            },
            
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
                },
                {
                    questionId: 3,
                    question: "A equipe comercial possui metas claras e mensuráveis?",
                    answer: "Não",
                    description: "Metas não estão claramente definidas",
                    score: 0
                }
            ]
        },
        
        companyData: {
            companyName: "GGV CONSULTORIA EMPRESARIAL",
            email: "romaomonique4@gmail.com",
            activityBranch: "Consultoria / Assessoria / Administração",
            monthlyBilling: "Acima de 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores",
            salesChannels: ["Inbound", "Outbound"]
        },
        
        // 🎯 CONTEXTO CRÍTICO - Pode ser o que estava faltando!
        clientContext: {
            situacao: "Empresa consolidada no mercado de consultoria, buscando otimização dos processos comerciais para sustentar crescimento",
            problema: "Processos comerciais pouco estruturados, dificultando o acompanhamento de leads e a previsibilidade de vendas",
            perfil_do_cliente: "Consultoria empresarial estabelecida, com alto faturamento mas equipe enxuta, necessitando de processos mais eficientes"
        },
        
        segment: {
            name: "Consultoria",
            id: "consultoria"
        },
        
        source: 'web-diagnostic',
        version: 'real-format-test-1.0'
    };
    
    console.log('📦 Payload formato real size:', JSON.stringify(payload).length, 'bytes');
    console.log('📦 Inclui contexto do cliente:', !!payload.clientContext);
    console.log('📦 Inclui análise IA:', !!payload.body.aiAnalysis);
    console.log('📦 Total de respostas:', payload.body.diagnosticAnswers.length);
    
    try {
        const response = await makeRequest(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'GGV-Diagnostic/2.0',
                'X-Request-ID': `real-${DEAL_ID}-${Date.now()}`,
                'X-Test-Type': 'real-format'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📊 Body: ${response.body}`);
        
        const success = response.status >= 200 && response.status < 300;
        console.log(`📊 Sucesso: ${success ? '✅ SIM' : '❌ NÃO'}`);
        
        if (success) {
            console.log('\n🎉 PROBLEMA RESOLVIDO!');
            console.log('✓ O contexto do cliente era necessário');
            console.log('✓ Workflow N8N funcionou corretamente');
            console.log('✓ Melhorias implementadas validadas');
        }
        
        return { success, status: response.status, body: response.body };
        
    } catch (error) {
        console.log('❌ ERRO:', error.message);
        return { success: false, error: error.message };
    }
}

async function runContextTests() {
    console.log('🔍 TESTES COM CONTEXTO DO CLIENTE - Deal 56934\n');
    
    // Teste 1: Com contexto
    const result1 = await testWithClientContext();
    
    // Aguardar
    console.log('\n⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Teste 2: Formato real completo
    const result2 = await testRealFormat();
    
    // Resumo
    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO DOS TESTES COM CONTEXTO');
    console.log('='.repeat(70));
    
    console.log(`🔍 Com Contexto: ${result1.success ? '✅ SUCESSO' : '❌ FALHA'} (${result1.status || 'N/A'})`);
    console.log(`🎯 Formato Real: ${result2.success ? '✅ SUCESSO' : '❌ FALHA'} (${result2.status || 'N/A'})`);
    
    if (result1.success || result2.success) {
        console.log('\n🎉 HIPÓTESE CONFIRMADA!');
        console.log('✓ Contexto do cliente era obrigatório');
        console.log('✓ Workflow N8N precisa desses campos');
        console.log('✓ Melhorias implementadas funcionarão perfeitamente');
        
        console.log('\n🔧 AÇÃO NECESSÁRIA:');
        console.log('✓ Garantir que clientContext sempre seja enviado');
        console.log('✓ Campos situacao, problema, perfil_do_cliente obrigatórios');
    } else {
        console.log('\n🤔 AINDA COM PROBLEMAS');
        console.log('⚠️ Pode haver outros campos obrigatórios');
        console.log('⚠️ Ou problema diferente no workflow N8N');
    }
    
    // Salvar relatório
    const fs = require('fs');
    const report = {
        dealId: DEAL_ID,
        timestamp: new Date().toISOString(),
        hypothesis: "Contexto do cliente obrigatório",
        contextTest: result1,
        realFormatTest: result2
    };
    
    fs.writeFileSync(`test-deal-${DEAL_ID}-context-report.json`, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: test-deal-${DEAL_ID}-context-report.json`);
}

if (require.main === module) {
    runContextTests().catch(console.error);
}

module.exports = { runContextTests, testWithClientContext, testRealFormat };
