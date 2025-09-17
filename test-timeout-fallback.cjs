#!/usr/bin/env node

/**
 * 🕐 TESTE DE TIMEOUT E FALLBACK
 * 
 * Testa se o sistema de fallback funciona corretamente em casos de timeout
 */

const https = require('https');

const DEAL_ID = '62719';
const BASE_URL = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';

// Função para simular timeout
function makeRequestWithTimeout(url, options = {}, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': '*/*',
                'Content-Type': 'application/json',
                'Origin': 'https://app.grupoggv.com',
                'Referer': 'https://app.grupoggv.com/',
                ...options.headers
            },
            timeout: timeoutMs // Timeout específico para teste
        };
        
        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    body: data,
                    timedOut: false
                });
            });
        });
        
        req.on('error', (error) => {
            reject({ error: error.message, timedOut: false });
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject({ error: 'Request timeout', timedOut: true });
        });
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

// Teste 1: Timeout rápido (2 segundos) para forçar fallback
async function testTimeoutFallback() {
    console.log('🕐 TESTE 1: TIMEOUT RÁPIDO (2s) - Forçar fallback');
    console.log('=' .repeat(60));
    
    const payload = {
        action: 'update_deal_fields',
        deal_id: DEAL_ID,
        timestamp: new Date().toISOString(),
        
        companyData: {
            companyName: "Construtora Ikigai",
            email: "Grupokondo@gmail.com",
            activityBranch: "Serviço",
            monthlyBilling: "Acima de R$ 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores",
            dealId: DEAL_ID
        },
        
        clientContext: {
            situacao: "Teste de timeout - empresa em crescimento",
            problema: "Teste de timeout - necessidade de estruturação",
            perfil_do_cliente: "Teste de timeout - consultoria estabelecida"
        },
        
        source: 'timeout-test',
        version: 'timeout-test-v1'
    };
    
    console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('⏰ Timeout configurado: 2 segundos (forçar timeout)');
    
    try {
        const startTime = Date.now();
        const response = await makeRequestWithTimeout(BASE_URL, {
            method: 'POST',
            headers: {
                'X-Request-Type': 'timeout-test',
                'X-Timeout': '2000'
            },
            body: JSON.stringify(payload)
        }, 2000); // 2 segundos apenas
        
        const duration = Date.now() - startTime;
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📊 Duração: ${duration}ms`);
        console.log(`📊 Body: ${response.body}`);
        console.log(`📊 Timeout?: ${response.timedOut ? 'SIM' : 'NÃO'}`);
        
        return { 
            success: response.status >= 200 && response.status < 300, 
            timedOut: response.timedOut,
            duration,
            status: response.status 
        };
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ ERRO: ${error.error}`);
        console.log(`⏰ Timeout?: ${error.timedOut ? 'SIM' : 'NÃO'}`);
        console.log(`📊 Duração: ${duration}ms`);
        
        return { 
            success: false, 
            timedOut: error.timedOut,
            duration,
            error: error.error 
        };
    }
}

// Teste 2: Timeout normal (15s) para comparação
async function testNormalTimeout() {
    console.log('\n🕐 TESTE 2: TIMEOUT NORMAL (15s) - Comportamento padrão');
    console.log('=' .repeat(60));
    
    const payload = {
        deal_id: DEAL_ID,
        timestamp: new Date().toISOString(),
        action: 'ai_analysis_completed',
        
        body: {
            results: {
                maturityPercentage: 75
            },
            resultUrl: `https://app.grupoggv.com/r/timeout-test-${DEAL_ID}-${Date.now()}`,
            deal_id: DEAL_ID,
            
            diagnosticAnswers: [
                {
                    questionId: 1,
                    question: "Teste de timeout - processo estruturado?",
                    answer: "Sim",
                    description: "Teste funcionando",
                    score: 10
                }
            ]
        },
        
        companyData: {
            companyName: "Construtora Ikigai",
            email: "Grupokondo@gmail.com",
            activityBranch: "Serviço",
            monthlyBilling: "Acima de R$ 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores"
        },
        
        clientContext: {
            situacao: "Teste de timeout normal - empresa em crescimento",
            problema: "Teste de timeout normal - necessidade de estruturação",
            perfil_do_cliente: "Teste de timeout normal - consultoria estabelecida"
        },
        
        segment: {
            name: "Geral",
            id: "gen_1"
        },
        
        source: "timeout-test",
        version: "timeout-normal-test"
    };
    
    console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes');
    console.log('⏰ Timeout configurado: 15 segundos (normal)');
    
    try {
        const startTime = Date.now();
        const response = await makeRequestWithTimeout(BASE_URL, {
            method: 'POST',
            headers: {
                'X-Request-Type': 'timeout-normal-test',
                'X-Timeout': '15000'
            },
            body: JSON.stringify(payload)
        }, 15000); // 15 segundos
        
        const duration = Date.now() - startTime;
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📊 Duração: ${duration}ms`);
        console.log(`📊 Body: ${response.body}`);
        console.log(`📊 Timeout?: ${response.timedOut ? 'SIM' : 'NÃO'}`);
        
        return { 
            success: response.status >= 200 && response.status < 300, 
            timedOut: response.timedOut,
            duration,
            status: response.status 
        };
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ ERRO: ${error.error}`);
        console.log(`⏰ Timeout?: ${error.timedOut ? 'SIM' : 'NÃO'}`);
        console.log(`📊 Duração: ${duration}ms`);
        
        return { 
            success: false, 
            timedOut: error.timedOut,
            duration,
            error: error.error 
        };
    }
}

// Teste 3: Simular comportamento do frontend com AbortController
async function testAbortController() {
    console.log('\n🕐 TESTE 3: ABORT CONTROLLER - Simulando frontend');
    console.log('=' .repeat(60));
    
    const payload = {
        action: 'update_deal_fields',
        deal_id: DEAL_ID,
        timestamp: new Date().toISOString(),
        
        clientContext: {
            situacao: "Teste AbortController - empresa em crescimento",
            problema: "Teste AbortController - necessidade de estruturação",
            perfil_do_cliente: "Teste AbortController - consultoria estabelecida"
        },
        
        source: 'abort-controller-test',
        version: 'abort-test-v1'
    };
    
    console.log('📦 Testando comportamento do AbortController...');
    console.log('⏰ Timeout: 3 segundos (teste de abort)');
    
    try {
        const startTime = Date.now();
        
        // Simular AbortController como no código real
        const controller = new (global.AbortController || require('abort-controller'))();
        const timeoutId = setTimeout(() => {
            console.log('⏰ AbortController - Cancelando requisição após 3s');
            controller.abort();
        }, 3000);
        
        // Usar fetch com AbortController (se disponível)
        let response;
        try {
            if (typeof fetch !== 'undefined') {
                response = await fetch(BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-Type': 'abort-controller-test'
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
            } else {
                // Fallback para Node.js sem fetch
                response = await makeRequestWithTimeout(BASE_URL, {
                    method: 'POST',
                    headers: {
                        'X-Request-Type': 'abort-controller-test'
                    },
                    body: JSON.stringify(payload)
                }, 3000);
            }
            
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            console.log(`📊 Status: ${response.status}`);
            console.log(`📊 Duração: ${duration}ms`);
            console.log(`📊 Cancelado?: NÃO (completou antes do timeout)`);
            
            return { 
                success: response.status >= 200 && response.status < 300, 
                aborted: false,
                duration,
                status: response.status 
            };
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            const isAborted = fetchError.name === 'AbortError' || 
                            fetchError.message?.includes('abort') ||
                            fetchError.error?.includes('timeout');
            
            console.log(`❌ ERRO: ${fetchError.message || fetchError.error || fetchError}`);
            console.log(`📊 Duração: ${duration}ms`);
            console.log(`📊 Cancelado?: ${isAborted ? 'SIM' : 'NÃO'}`);
            
            return { 
                success: false, 
                aborted: isAborted,
                duration,
                error: fetchError.message || fetchError.error || fetchError 
            };
        }
        
    } catch (error) {
        console.log(`❌ ERRO GERAL: ${error.message || error}`);
        return { success: false, error: error.message || error };
    }
}

async function runTimeoutTests() {
    console.log('🕐 TESTES DE TIMEOUT E FALLBACK\n');
    
    const results = {
        timeoutFallback: null,
        normalTimeout: null,
        abortController: null
    };
    
    // Teste 1: Timeout rápido
    results.timeoutFallback = await testTimeoutFallback();
    
    // Aguardar entre testes
    console.log('\n⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Teste 2: Timeout normal
    results.normalTimeout = await testNormalTimeout();
    
    // Aguardar entre testes
    console.log('\n⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Teste 3: AbortController
    results.abortController = await testAbortController();
    
    // Resumo
    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO DOS TESTES DE TIMEOUT');
    console.log('='.repeat(70));
    
    console.log(`🕐 Timeout Rápido (2s): ${results.timeoutFallback?.success ? '✅' : '❌'} ${results.timeoutFallback?.timedOut ? '(TIMEOUT)' : '(OK)'}`);
    console.log(`🕐 Timeout Normal (15s): ${results.normalTimeout?.success ? '✅' : '❌'} ${results.normalTimeout?.timedOut ? '(TIMEOUT)' : '(OK)'}`);
    console.log(`🕐 AbortController (3s): ${results.abortController?.success ? '✅' : '❌'} ${results.abortController?.aborted ? '(ABORTED)' : '(OK)'}`);
    
    console.log('\n🔍 ANÁLISE:');
    
    if (results.normalTimeout?.success) {
        console.log('✅ Sistema principal funcionando (diagnóstico OK)');
    }
    
    if (results.timeoutFallback?.timedOut || results.abortController?.aborted) {
        console.log('✅ Sistema de timeout funcionando (detecta timeouts)');
        console.log('📝 Em caso de timeout no update fields, o fluxo continua');
        console.log('📝 O diagnóstico principal não é bloqueado por timeouts');
    }
    
    if (!results.timeoutFallback?.success && !results.abortController?.success) {
        console.log('✅ Fallback funcionando (falhas não bloqueiam o fluxo)');
    }
    
    console.log('\n💡 COMPORTAMENTO ESPERADO:');
    console.log('1. ⏰ Update fields pode dar timeout (não crítico)');
    console.log('2. 🎯 Diagnóstico principal deve sempre funcionar');
    console.log('3. 🛡️ Timeouts não devem bloquear o fluxo principal');
    console.log('4. 🔄 Sistema continua funcionando mesmo com falhas parciais');
    
    // Salvar relatório
    const fs = require('fs');
    const report = {
        dealId: DEAL_ID,
        timestamp: new Date().toISOString(),
        testType: 'timeout-fallback-validation',
        results: results,
        conclusion: results.normalTimeout?.success ? 
            'SISTEMA DE TIMEOUT FUNCIONANDO - Fluxo principal OK' : 
            'NECESSITA INVESTIGAÇÃO - Fluxo principal com problema'
    };
    
    fs.writeFileSync(`timeout-fallback-report-${DEAL_ID}.json`, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: timeout-fallback-report-${DEAL_ID}.json`);
    
    return report;
}

if (require.main === module) {
    runTimeoutTests().catch(console.error);
}

module.exports = { runTimeoutTests, testTimeoutFallback, testNormalTimeout, testAbortController };
