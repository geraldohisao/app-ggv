// Teste completo com resultados do diagnóstico + análise IA + link
import fetch from 'node-fetch';

const testCompleteResults = async () => {
    const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
    
    // Simular payload completo com análise IA e link do resultado
    const payload = {
        // Dados da empresa
        companyData: {
            companyName: "TechSolutions Brasil",
            email: "contato@techsolutions.com.br",
            activityBranch: "Tecnologia da Informação",
            activitySector: "Software e Desenvolvimento",
            monthlyBilling: "R$ 100.000 - R$ 500.000",
            salesTeamSize: "5-10 pessoas",
            salesChannels: ["Inbound Marketing", "Outbound Sales", "Indicações"]
        },
        
        // Segmento de mercado
        segment: "TECH_SCALE_UP",
        
        // Respostas do diagnóstico (9 perguntas)
        answers: {
            1: 7,   // Maturidade comercial - "Às vezes"
            2: 8,   // Mapeamento de processos - "Sim"  
            3: 9,   // CRM - "Sim"
            4: 6,   // Script comercial - "Às vezes"
            5: 4,   // Teste perfil comportamental - "N/A"
            6: 7,   // Plano de metas e comissionamento - "Às vezes"
            7: 8,   // Indicadores comerciais - "Sim"
            8: 5,   // Treinamentos periódicos - "N/A"
            9: 7,   // Ação pós-venda - "Às vezes"
            10: 8   // Prospecção ativa - "Sim"
        },
        
        // Pontuação total
        totalScore: 69,
        
        // Deal ID (se disponível)
        dealId: "62718",
        
        // Análise IA - Resumo
        summaryInsights: {
            strengths: [
                "Excelente uso de CRM para gestão de leads",
                "Processos comerciais bem mapeados e documentados", 
                "Forte cultura de prospecção ativa"
            ],
            weaknesses: [
                "Falta de script comercial padronizado",
                "Ausência de testes comportamentais na seleção",
                "Treinamentos comerciais não são regulares"
            ],
            recommendations: [
                "Implementar script comercial estruturado para aumentar conversão",
                "Estabelecer programa de treinamentos mensais",
                "Incluir avaliação comportamental no processo seletivo"
            ],
            maturityLevel: "Média-Alta",
            maturityPercentage: 69,
            priorityActions: [
                "Padronização do script comercial",
                "Programa de capacitação contínua"
            ]
        },
        
        // Análise IA - Detalhada
        detailedAnalysis: {
            processAnalysis: {
                score: 8,
                feedback: "A empresa demonstra maturidade no mapeamento de processos comerciais. Recomenda-se documentar melhor as etapas de follow-up pós-venda."
            },
            crmAnalysis: {
                score: 9,
                feedback: "Excelente adoção de CRM. A empresa utiliza efetivamente a ferramenta para gestão de pipeline e acompanhamento de oportunidades."
            },
            teamAnalysis: {
                score: 6,
                feedback: "Equipe comercial com bom desempenho, mas necessita de maior padronização nos processos de venda e treinamentos regulares."
            },
            marketingAlignment: {
                score: 7,
                feedback: "Boa integração entre marketing e vendas. Oportunidade de melhorar a qualificação de leads via inbound marketing."
            }
        },
        
        // Link público do resultado completo
        resultUrl: "https://app.grupoggv.com/r/abc123def456ghi789",
        
        // Metadados
        timestamp: new Date().toISOString(),
        source: "GGV Diagnóstico Comercial - Análise Completa",
        testMode: true,
        
        // Indicadores de maturidade por área
        maturityByArea: {
            "Processos": { score: 8, level: "Alta" },
            "CRM": { score: 9, level: "Alta" },
            "Equipe": { score: 6, level: "Média" },
            "Treinamento": { score: 5, level: "Baixa" },
            "Indicadores": { score: 8, level: "Alta" }
        }
    };
    
    console.log('🧪 TESTE COMPLETO - Enviando resultados finais para N8N...');
    console.log('📍 URL:', webhookUrl);
    console.log('📊 Empresa:', payload.companyData.companyName);
    console.log('🎯 Pontuação:', `${payload.totalScore}/100 (${payload.summaryInsights.maturityLevel})`);
    console.log('🔗 Link do resultado:', payload.resultUrl);
    console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        console.log('\n📊 RESPOSTA N8N:');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers));
        
        const responseText = await response.text();
        console.log('Body:', responseText);
        
        if (response.ok) {
            console.log('\n✅ SUCESSO - Resultados completos enviados para N8N!');
            console.log('📈 Dados inclusos:');
            console.log('  • Respostas do diagnóstico');
            console.log('  • Análise IA resumida');
            console.log('  • Análise IA detalhada');
            console.log('  • Link público do resultado');
            console.log('  • Maturidade por área');
        } else {
            console.log('\n❌ ERRO - Falha no envio para N8N');
        }
        
    } catch (error) {
        console.error('\n💥 ERRO DE CONEXÃO:', error.message);
    }
};

// Executar teste
testCompleteResults();
