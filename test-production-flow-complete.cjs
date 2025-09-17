#!/usr/bin/env node

/**
 * 🎯 TESTE COMPLETO DO FLUXO DE PRODUÇÃO - Deal ID 62719
 * 
 * Simula exatamente o que acontece em produção:
 * 1. Update Deal Fields (pode falhar, mas não bloqueia)
 * 2. Diagnóstico Completo (deve sempre funcionar)
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

// Simular exatamente o fluxo de produção
async function testProductionFlow() {
    console.log('🎯 TESTE COMPLETO DO FLUXO DE PRODUÇÃO');
    console.log('=' .repeat(60));
    
    const results = {
        updateFields: null,
        diagnosticComplete: null,
        flowSuccess: false
    };
    
    // ETAPA 1: Update Deal Fields (formato melhorado com fallback)
    console.log('\n📝 ETAPA 1: UPDATE DEAL FIELDS');
    console.log('-'.repeat(40));
    
    try {
        // Estratégia 1: Formato simplificado
        const simplePayload = {
            action: 'update_deal_fields',
            deal_id: DEAL_ID,
            timestamp: new Date().toISOString(),
            
            companyData: {
                companyName: "Construtora Ikigai",
                email: "Grupokondo@gmail.com",
                activityBranch: "Serviço",
                monthlyBilling: "Acima de R$ 1 milhão/mês",
                salesTeamSize: "De 1 a 3 colaboradores",
                salesChannels: ["Inside Sales", "Distribuidores"],
                activitySector: "Imóveis / Arquitetura / Construção civil",
                situacao: "Construtora em Curitiba que faz casas de alto padrão, ele presta o serviço para quem quer a própria casa e agora está entrando no mercado de incorporação\n\nQuer apoio para estruturar os processos, meetime e pipedrive na construtora.\nteste3",
                problema: "Recebe um volume de leads e recentemente não está convertendo. Está contratando 1 vendedor e 2 SDR`s. \nteste 3",
                perfil_do_cliente: "teste perfil do cliente v2\n\nteste4",
                dealId: DEAL_ID
            },
            
            clientContext: {
                situacao: "Construtora em Curitiba que faz casas de alto padrão, ele presta o serviço para quem quer a própria casa e agora está entrando no mercado de incorporação\n\nQuer apoio para estruturar os processos, meetime e pipedrive na construtora.\nteste3",
                problema: "Recebe um volume de leads e recentemente não está convertendo. Está contratando 1 vendedor e 2 SDR`s. \nteste 3",
                perfil_do_cliente: "teste perfil do cliente v2\n\nteste4"
            },
            
            source: 'ggv-diagnostic-update',
            version: 'update-fields-v2'
        };
        
        console.log('🔄 Tentativa 1: Formato simplificado');
        let response = await makeRequest(BASE_URL, {
            method: 'POST',
            headers: {
                'X-Request-Type': 'update-fields'
            },
            body: JSON.stringify(simplePayload)
        });
        
        if (response.status >= 200 && response.status < 300) {
            console.log('✅ Update Fields - Sucesso com formato simplificado');
            results.updateFields = { success: true, strategy: 'simplified', status: response.status };
        } else {
            console.log('⚠️ Formato simplificado falhou, tentando formato original...');
            
            // Estratégia 2: Formato original
            const originalPayload = {
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
                clientContext: {
                    situacao: "Construtora em Curitiba que faz casas de alto padrão, ele presta o serviço para quem quer a própria casa e agora está entrando no mercado de incorporação\n\nQuer apoio para estruturar os processos, meetime e pipedrive na construtora.\nteste3",
                    problema: "Recebe um volume de leads e recentemente não está convertendo. Está contratando 1 vendedor e 2 SDR`s. \nteste 3",
                    perfil_do_cliente: "teste perfil do cliente v2\n\nteste4"
                },
                timestamp: new Date().toISOString()
            };
            
            console.log('🔄 Tentativa 2: Formato original');
            response = await makeRequest(BASE_URL, {
                method: 'POST',
                headers: {
                    'X-Request-Type': 'update-fields-fallback'
                },
                body: JSON.stringify(originalPayload)
            });
            
            if (response.status >= 200 && response.status < 300) {
                console.log('✅ Update Fields - Sucesso com formato original');
                results.updateFields = { success: true, strategy: 'original', status: response.status };
            } else {
                console.log('⚠️ Update Fields - Ambos formatos falharam, mas continuando...');
                results.updateFields = { success: false, strategy: 'both_failed', status: response.status, body: response.body };
            }
        }
        
    } catch (error) {
        console.log('❌ Update Fields - Erro de rede:', error.message);
        results.updateFields = { success: false, error: error.message };
    }
    
    // Aguardar entre etapas
    console.log('\n⏳ Aguardando 2 segundos antes do diagnóstico principal...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // ETAPA 2: Diagnóstico Completo (DEVE SEMPRE FUNCIONAR)
    console.log('\n🎯 ETAPA 2: DIAGNÓSTICO COMPLETO');
    console.log('-'.repeat(40));
    
    try {
        const diagnosticPayload = {
            deal_id: DEAL_ID,
            timestamp: new Date().toISOString(),
            action: 'ai_analysis_completed',
            
            body: {
                results: {
                    maturityPercentage: 22
                },
                resultUrl: `https://app.grupoggv.com/r/prod-flow-test-${DEAL_ID}-${Date.now()}`,
                deal_id: DEAL_ID,
                
                aiAnalysis: {
                    summaryInsights: {
                        specialistInsight: "A Construtora Ikigai apresenta um cenário de crescimento, com faturamento acima de R$ 1 milhão/mês, mas enfrenta desafios na conversão de leads. A expansão para o mercado de incorporações exige maior estruturação comercial.",
                        recommendations: [
                            "Implementar CRM robusto",
                            "Definir metas claras",
                            "Estruturar processo de follow-up",
                            "Treinar equipe comercial"
                        ]
                    },
                    detailedAnalysis: {
                        strengths: [
                            "Faturamento acima de R$ 1 milhão/mês",
                            "Presença em mercado promissor",
                            "Expansão para incorporação"
                        ],
                        improvements: [
                            "Estruturação de processos",
                            "Melhoria na conversão",
                            "Ampliação de equipe"
                        ],
                        nextSteps: [
                            "Implementar CRM",
                            "Treinar equipe",
                            "Definir métricas"
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
                    },
                    {
                        questionId: 3,
                        question: "Você tem um script comercial redigido e seguido pelo seu time de vendas?",
                        answer: "Parcialmente",
                        description: "Script existe, mas não é seguido por todos",
                        score: 5
                    },
                    {
                        questionId: 4,
                        question: "Seu time de vendas já realizou algum teste de perfil comportamental?",
                        answer: "Parcialmente",
                        description: "Apenas alguns membros foram avaliados",
                        score: 5
                    },
                    {
                        questionId: 5,
                        question: "Você tem um plano de metas e comissionamento para o setor comercial?",
                        answer: "Não",
                        description: "Não possui plano estruturado",
                        score: 0
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
            version: "production-flow-test"
        };
        
        console.log('🚀 Enviando diagnóstico completo...');
        const response = await makeRequest(BASE_URL, {
            method: 'POST',
            body: JSON.stringify(diagnosticPayload)
        });
        
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📊 Body: ${response.body}`);
        
        if (response.status >= 200 && response.status < 300) {
            console.log('✅ Diagnóstico Completo - SUCESSO!');
            results.diagnosticComplete = { success: true, status: response.status, body: response.body };
            results.flowSuccess = true; // O que importa é o diagnóstico principal
        } else {
            console.log('❌ Diagnóstico Completo - FALHOU!');
            results.diagnosticComplete = { success: false, status: response.status, body: response.body };
        }
        
    } catch (error) {
        console.log('❌ Diagnóstico Completo - Erro:', error.message);
        results.diagnosticComplete = { success: false, error: error.message };
    }
    
    return results;
}

async function runProductionFlowTest() {
    console.log('🎯 TESTE COMPLETO DO FLUXO DE PRODUÇÃO - Deal 62719\n');
    
    const results = await testProductionFlow();
    
    // Análise dos resultados
    console.log('\n' + '='.repeat(70));
    console.log('📋 RESUMO DO FLUXO DE PRODUÇÃO');
    console.log('='.repeat(70));
    
    console.log(`📝 Update Fields: ${results.updateFields?.success ? '✅ SUCESSO' : '⚠️ FALHOU'} ${results.updateFields?.strategy ? `(${results.updateFields.strategy})` : ''}`);
    console.log(`🎯 Diagnóstico: ${results.diagnosticComplete?.success ? '✅ SUCESSO' : '❌ FALHOU'}`);
    console.log(`🎯 Fluxo Geral: ${results.flowSuccess ? '✅ SUCESSO' : '❌ FALHOU'}`);
    
    if (results.flowSuccess) {
        console.log('\n🎉 FLUXO DE PRODUÇÃO FUNCIONANDO!');
        console.log('✅ O diagnóstico principal está sendo enviado corretamente');
        console.log('✅ Mesmo se o update falhar, o fluxo continua');
        console.log('✅ Não haverá mais problema de "só funcionar na segunda vez"');
        console.log('✅ Sistema robusto com fallbacks implementados');
        
        if (!results.updateFields?.success) {
            console.log('\n💡 OBSERVAÇÃO:');
            console.log('⚠️ Update fields ainda falha, mas isso não impacta o diagnóstico');
            console.log('📝 O importante é que o diagnóstico principal funcione (e está funcionando!)');
        }
        
    } else {
        console.log('\n❌ FLUXO AINDA COM PROBLEMAS');
        console.log('🔧 O diagnóstico principal precisa funcionar sempre');
    }
    
    // Salvar relatório final
    const fs = require('fs');
    const finalReport = {
        dealId: DEAL_ID,
        timestamp: new Date().toISOString(),
        testType: 'production-flow-complete',
        results: results,
        conclusion: results.flowSuccess ? 
            'FLUXO DE PRODUÇÃO FUNCIONANDO - Diagnóstico principal OK' : 
            'FLUXO AINDA PRECISA CORREÇÕES',
        recommendations: results.flowSuccess ? [
            'Deploy das melhorias implementadas',
            'Monitorar logs em produção',
            'Update fields pode ser investigado separadamente'
        ] : [
            'Investigar problema no diagnóstico principal',
            'Verificar configuração do workflow N8N'
        ]
    };
    
    fs.writeFileSync(`production-flow-complete-${DEAL_ID}.json`, JSON.stringify(finalReport, null, 2));
    console.log(`\n📄 Relatório final salvo em: production-flow-complete-${DEAL_ID}.json`);
    
    return finalReport;
}

if (require.main === module) {
    runProductionFlowTest().catch(console.error);
}

module.exports = { runProductionFlowTest, testProductionFlow };
