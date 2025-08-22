const fetch = require('node-fetch');

// ============================================================================
// TESTE SIMULAÇÃO FRONT-END - Deal 62719 com dados reais
// ============================================================================
// Este teste simula EXATAMENTE o que o front-end faria ao processar respostas

// Simulação dos dados que o front-end recebe
const simulatedAnswers = {
    1: 5,  // Parcialmente
    2: 10, // Sim
    3: 0,  // Não
    4: 5,  // Parcialmente
    5: 10, // Sim
    6: 5,  // Às vezes
    7: 5,  // Às vezes
    8: 10, // Sim
    9: 0   // Não
};

// Estrutura das perguntas (copiada do diagnosticoQuestions.ts)
const diagnosticQuestions = [
    {
        id: 1,
        text: "Você já realizou o mapeamento de processos da área comercial?",
        options: [
            { text: "Sim", description: "Processos totalmente mapeados e documentados", score: 10 },
            { text: "Parcialmente", description: "Alguns processos mapeados, mas não todos", score: 5 },
            { text: "Não", description: "Nenhum processo comercial foi mapeado", score: 0 },
        ]
    },
    {
        id: 2,
        text: "Você utiliza algum sistema de CRM?",
        options: [
            { text: "Sim", description: "CRM implementado e utilizado pela equipe", score: 10 },
            { text: "Parcialmente", description: "Tem CRM mas não é usado consistentemente", score: 5 },
            { text: "Não", description: "Não utiliza sistema de CRM", score: 0 },
        ]
    },
    {
        id: 3,
        text: "Você tem um script comercial redigido e seguido pelo seu time de vendas?",
        options: [
            { text: "Sim", description: "Script definido e seguido por toda equipe", score: 10 },
            { text: "Parcialmente", description: "Script existe, mas não é seguido por todos", score: 5 },
            { text: "Não", description: "Não existe script comercial definido", score: 0 },
        ]
    },
    {
        id: 4,
        text: "Seu time de vendas já realizou algum teste de perfil comportamental?",
        options: [
            { text: "Sim", description: "Toda equipe passou por avaliação comportamental", score: 10 },
            { text: "Parcialmente", description: "Apenas alguns membros foram avaliados", score: 5 },
            { text: "Não", description: "Nenhuma avaliação comportamental foi feita", score: 0 },
        ]
    },
    {
        id: 5,
        text: "Você tem um plano de metas e comissionamento para o setor comercial?",
        options: [
            { text: "Sim", description: "Plano estruturado de metas e comissões", score: 10 },
            { text: "Parcialmente", description: "Tem metas mas sem plano de comissionamento claro", score: 5 },
            { text: "Não", description: "Não possui plano estruturado", score: 0 },
        ]
    },
    {
        id: 6,
        text: "A área de vendas realiza reuniões semanais para verificar indicadores comerciais?",
        options: [
            { text: "Sim", description: "Reuniões semanais regulares com análise de KPIs", score: 10 },
            { text: "Às vezes", description: "Reuniões esporádicas ou mensais", score: 5 },
            { text: "Não", description: "Não há reuniões regulares de acompanhamento", score: 0 },
        ]
    },
    {
        id: 7,
        text: "Você realiza treinamentos periódicos para seu time de vendas?",
        options: [
            { text: "Sim", description: "Treinamentos regulares e estruturados", score: 10 },
            { text: "Às vezes", description: "Treinamentos esporádicos", score: 5 },
            { text: "Não", description: "Não oferece treinamentos regulares", score: 0 },
        ]
    },
    {
        id: 8,
        text: "Você realiza alguma ação de pós-venda com os seus clientes?",
        options: [
            { text: "Sim", description: "Programa estruturado de pós-venda", score: 10 },
            { text: "Às vezes", description: "Ações pontuais de pós-venda", score: 5 },
            { text: "Não", description: "Não há ações de pós-venda", score: 0 },
        ]
    },
    {
        id: 9,
        text: "Você realiza algum tipo de prospecção ativa com os seus clientes?",
        options: [
            { text: "Sim", description: "Prospecção ativa estruturada e regular", score: 10 },
            { text: "Parcialmente", description: "Prospecção esporádica ou não estruturada", score: 5 },
            { text: "Não", description: "Não faz prospecção ativa", score: 0 },
        ]
    }
];

// Constantes de validação (copiadas do front-end)
const DIAGNOSTIC_VALIDATION = {
    EXPECTED_QUESTION_COUNT: 9,
    VALID_ANSWER_TYPES: ['Sim', 'Não', 'Parcialmente', 'Às vezes'],
    VALID_SCORES: [0, 5, 10],
    REQUIRED_PAYLOAD_FIELDS: ['questionId', 'question', 'answer', 'description', 'score']
};

async function testFrontendSimulation() {
    console.log('🎯 SIMULAÇÃO FRONT-END - Deal 62719 com dados reais');
    console.log('📊 Simulando respostas do usuário:', simulatedAnswers);
    
    // Calcular score total
    const totalScore = Object.values(simulatedAnswers).reduce((sum, score) => sum + score, 0);
    console.log('🔢 Score total calculado:', totalScore);
    
    // ============================================================================
    // REPLICAR A LÓGICA EXATA DO FRONT-END
    // ============================================================================
    console.log('🔄 INICIANDO MAPEAMENTO DEFINITIVO DAS RESPOSTAS');
    console.log('📊 Answers recebidos:', simulatedAnswers);
    console.log('📋 Total de perguntas:', diagnosticQuestions.length);
    
    const mappedAnswers = diagnosticQuestions.map((question) => {
        const score = simulatedAnswers[question.id];
        console.log(`\n🔍 PROCESSANDO Pergunta ${question.id}:`);
        console.log(`   Texto: "${question.text}"`);
        console.log(`   Score recebido: ${score} (tipo: ${typeof score})`);
        console.log(`   Opções disponíveis:`, question.options.map(o => `"${o.text}" (${o.score})`));
        
        // Validação rigorosa do score
        if (score === undefined || score === null || typeof score !== 'number') {
            console.error(`❌ ERRO CRÍTICO - Score inválido para pergunta ${question.id}: ${score}`);
            return {
                questionId: question.id,
                question: question.text,
                answer: "ERRO: Não respondida",
                description: "Esta pergunta não foi respondida corretamente",
                score: 0
            };
        }
        
        // Busca EXATA da opção pelo score
        const option = question.options.find(opt => opt.score === score);
        
        if (!option) {
            console.error(`❌ ERRO CRÍTICO - Opção não encontrada para pergunta ${question.id} com score ${score}`);
            console.error(`❌ Opções válidas:`, question.options);
            
            // Sistema de fallback robusto
            const fallbackMap = {
                10: 'Sim',
                5: question.options.find(opt => opt.text.includes('vezes') || opt.text.includes('Às vezes'))?.text || 
                   question.options.find(opt => opt.text.includes('Parcialmente'))?.text || 'Parcialmente',
                0: 'Não'
            };
            
            const fallbackAnswer = fallbackMap[score] || 'Resposta inválida';
            
            console.warn(`⚠️ Usando fallback: "${fallbackAnswer}"`);
            
            return {
                questionId: question.id,
                question: question.text,
                answer: fallbackAnswer,
                description: `FALLBACK: Score ${score} mapeado automaticamente`,
                score: score
            };
        }
        
        console.log(`✅ MAPEADO com sucesso: "${option.text}"`);
        
        return {
            questionId: question.id,
            question: question.text,
            answer: option.text,  // TEXTO DA RESPOSTA - NUNCA SCORE
            description: option.description,
            score: score
        };
    });
    
    console.log('✅ MAPEAMENTO CONCLUÍDO');
    console.log('📤 Respostas finais:', mappedAnswers.map(a => `${a.questionId}: "${a.answer}"`));
    
    // Gerar URL pública simulada
    const timestamp = Date.now();
    const randomSalt = Math.random().toString(36).substring(2, 15);
    const secureToken = `${timestamp}-${randomSalt}`;
    const publicReportUrl = `https://app.grupoggv.com/r/${secureToken}`;
    
    // Estrutura EXATA que o frontend envia
    const diagnosticPayload = {
        deal_id: "62719",
        timestamp: new Date().toISOString(),
        action: 'diagnostic_completed',
        
        body: {
            results: {
                maturityPercentage: Math.round((totalScore / 90) * 100)
            },
            resultUrl: publicReportUrl,
            deal_id: "62719",
            
            diagnosticAnswers: mappedAnswers
        },
        
        companyData: {
            companyName: "Construtora Ikigai",
            email: "grupokondo@gmail.com",
            activityBranch: "Serviço",
            monthlyBilling: "Acima de 1 milhão/mês",
            salesTeamSize: "De 1 a 3 colaboradores",
            salesChannels: []
        },
        segment: {
            name: "Geral",
            id: "geral"
        },
        source: 'web-diagnostic'
    };
    
    // ============================================================================
    // VALIDAÇÃO FINAL ANTI-ALUCINAÇÃO (copiada do front-end)
    // ============================================================================
    console.log('🔒 INICIANDO VALIDAÇÃO FINAL DO PAYLOAD');
    
    // Verificar se todas as respostas são texto válido
    const invalidAnswers = diagnosticPayload.body.diagnosticAnswers.filter(a => 
        typeof a.answer !== 'string' || 
        a.answer === '' || 
        a.answer === 'N/A' || 
        a.answer.includes('ERRO') ||
        !isNaN(Number(a.answer))  // Detectar se a resposta é um número
    );
    
    if (invalidAnswers.length > 0) {
        console.error('🚨 FALHA CRÍTICA NA VALIDAÇÃO - Respostas inválidas detectadas:');
        invalidAnswers.forEach((invalid, idx) => {
            console.error(`   ${idx + 1}. Pergunta ${invalid.questionId}: "${invalid.answer}" (INVÁLIDO)`);
        });
        console.error('🚨 INTERROMPENDO ENVIO - Payload não será enviado para evitar problemas no N8N');
        throw new Error(`Validação falhou: ${invalidAnswers.length} respostas inválidas detectadas`);
    }
    
    // Verificar se temos exatamente o número correto de respostas
    if (diagnosticPayload.body.diagnosticAnswers.length !== DIAGNOSTIC_VALIDATION.EXPECTED_QUESTION_COUNT) {
        console.error('🚨 ERRO - Número incorreto de respostas:', diagnosticPayload.body.diagnosticAnswers.length);
        throw new Error(`Esperado ${DIAGNOSTIC_VALIDATION.EXPECTED_QUESTION_COUNT} respostas, encontrado ${diagnosticPayload.body.diagnosticAnswers.length}`);
    }
    
    // Verificar estrutura de cada resposta
    diagnosticPayload.body.diagnosticAnswers.forEach((answer, idx) => {
        DIAGNOSTIC_VALIDATION.REQUIRED_PAYLOAD_FIELDS.forEach(field => {
            if (!(field in answer)) {
                throw new Error(`Campo obrigatório '${field}' ausente na resposta ${idx + 1}`);
            }
        });
        
        // Verificar se score é válido
        if (!DIAGNOSTIC_VALIDATION.VALID_SCORES.includes(answer.score)) {
            console.error(`🚨 Score inválido na pergunta ${answer.questionId}: ${answer.score}`);
            throw new Error(`Score inválido: ${answer.score}. Válidos: ${DIAGNOSTIC_VALIDATION.VALID_SCORES.join(', ')}`);
        }
    });
    
    // Gerar checksum do payload para detectar alterações
    const payloadChecksum = diagnosticPayload.body.diagnosticAnswers
        .map(a => `${a.questionId}:${a.answer}:${a.score}`)
        .join('|');
    console.log('🔐 Checksum do payload:', payloadChecksum);
    
    // Verificação final de integridade
    const integrityCheck = diagnosticPayload.body.diagnosticAnswers.every(a => 
        typeof a.questionId === 'number' &&
        typeof a.question === 'string' &&
        typeof a.answer === 'string' &&
        typeof a.description === 'string' &&
        typeof a.score === 'number' &&
        a.questionId > 0 && a.questionId <= 9 &&
        a.question.length > 0 &&
        a.answer.length > 0 &&
        a.description.length > 0
    );
    
    if (!integrityCheck) {
        throw new Error('Falha na verificação de integridade do payload');
    }
    
    console.log('✅ VALIDAÇÃO FINAL APROVADA - PAYLOAD ÍNTEGRO');
    console.log('📊 Resumo das respostas validadas:');
    diagnosticPayload.body.diagnosticAnswers.forEach((a, idx) => {
        console.log(`   ${idx + 1}. "${a.answer}" (Q${a.questionId}, Score: ${a.score})`);
    });
    console.log('🚀 INICIANDO ENVIO PARA N8N...');
    
    // Mostrar payload final
    console.log('\n📋 PAYLOAD FINAL COMPLETO:');
    console.log(JSON.stringify(diagnosticPayload, null, 2));
    
    // Enviar para N8N
    const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register';
    
    try {
        console.log('\n🚀 ENVIANDO PARA N8N...');
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'GGV-Diagnostic-Test/1.0'
            },
            body: JSON.stringify(diagnosticPayload)
        });
        
        console.log('📊 Status da resposta:', response.status);
        console.log('📊 Status text:', response.statusText);
        
        const responseText = await response.text();
        console.log('📋 Resposta do N8N:', responseText);
        
        if (response.ok) {
            console.log('✅ SUCESSO - Payload enviado com sucesso para N8N!');
            console.log('✅ Respostas textuais confirmadas no envio');
        } else {
            console.error('❌ ERRO - Falha no envio:', response.status, response.statusText);
        }
        
    } catch (error) {
        console.error('❌ ERRO na requisição:', error.message);
    }
}

// Executar teste
testFrontendSimulation().catch(console.error);
