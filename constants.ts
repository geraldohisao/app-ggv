

import type { MarketSegment, AIPersona, AIMode } from './types';

export const OTE_TOOLTIP_TEXT = "On-Target Earnings (OTE) é a remuneração total que um vendedor pode ganhar se atingir 100% de suas metas. Inclui o salário base mais as comissões e bônus variáveis.";

export const FATURAMENTO_MENSAL = [
    "Nenhum faturamento",
    "R$ 21 a 50 mil/mês",
    "R$ 51 a 100 mil/mês",
    "R$ 101 a 300 mil/mês",
    "R$ 301 a 600 mil/mês",
    "R$ 601 mil a 1 milhão/mês",
    "Acima de R$ 1 milhão/mês",
];

export const TAMANHO_EQUIPE_VENDAS = [
    "Nenhum",
    "De 1 a 3 colaboradores",
    "De 4 a 10 colaboradores",
    "De 11 a 25 colaboradores",
    "Acima de 25 colaboradores",
];

export const CANAIS_DE_VENDA = [
    "Vendas Diretas",
    "Marketplace",
    "Distribuidores",
    "Inside Sales",
    "E-commerce",
    "Representantes",
    "Televendas",
    "Field Sales",
];

// Novas listas para o diagnóstico
export const RAMOS_DE_ATIVIDADE = [
    'Indústria',
    'Comércio',
    'Serviço',
    'Distribuição',
    'Representação',
    'Não validado',
] as const;

export const SETORES_DE_ATUACAO = [
    'Não validado',
    'Agronegócio',
    'Alimentação / Bebidas',
    'Artesanato ou Produção Manual',
    'Automotivo',
    'Bens de Consumo Simples',
    'Comunicação / Agências / Gráficas',
    'Consultoria / Assessoria / Administração',
    'Corretagem / Seguros / Previdência',
    'E-commerce',
    'Educação',
    'Embalagens / Papel',
    'Energia e Infraestrutura',
    'Engenharia',
    'Componentes / Equipamentos Industriais',
    'Estética / Beleza / Cosméticos',
    'Eventos',
    'Fitness / Esporte',
    'Importação / Exportação',
    'Imóveis / Arquitetura / Construção civil',
    'Instituto de pesquisa',
    'Jurídica',
    'Logística',
    'Manufatura Específica',
    'Manutenção',
    'Materiais de construção / Madeiras',
    'Móveis',
    'Outsourcing / Terceirização / Aluguel',
    'Produtos químicos',
    'Saúde',
    'Saúde animal',
    'Segurança / Escolta / Monitoramento',
    'Serviços Ambientais e Sustentabilidade',
    'Serviços financeiros',
    'Sindicatos / Associações / ONGs',
    'Startup',
    'Supermercado / Hipermercado',
    'Tecnologia / Desenvolvimento / Sites',
    'Turismo',
    'Vestuário',
] as const;

export const DIAGNOSTIC_AREAS = [
    "Processos",
    "Tecnologia",
    "Padronização",
    "Pessoas",
    "Gestão",
    "Monitoramento",
    "Desenvolvimento",
    "Relacionamento",
    "Prospecção",
];

export const AI_FOCUS_AREAS = [
    'Processos', 'Tecnologia', 'Pessoas', 'Estratégia', 'Resultados', 'Mercado'
];

export const MATURITY_GIFS = {
    // 0% a 30%
    Baixa: "https://i.pinimg.com/originals/a6/95/45/a6954575fe7626789d21729287946c66.gif",
    // 31% a 60% (mantém)
    Média: "https://i.pinimg.com/originals/8b/3f/41/8b3f416d90eb4924f706f8a49d33f4f8.gif",
    // 61% a 100%
    Alta: "https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUyZjdxMzIweW9nc3dvbmNld3p6dGprNG1zcDFjOTF4MHl5bnd5MjU3MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rY93u9tQbybks/source.gif",
};

export const BENCHMARK_DATA = {
    marketAverage: {
        Processos: 4,
        Tecnologia: 4.5,
        Padronização: 3,
        Pessoas: 6,
        Gestão: 5,
        Monitoramento: 4,
        Desenvolvimento: 5.5,
        Relacionamento: 3.5,
        Prospecção: 3,
    },
    topPerformers: {
        Processos: 8,
        Tecnologia: 8,
        Padronização: 7,
        Pessoas: 9,
        Gestão: 8.5,
        Monitoramento: 7.5,
        Desenvolvimento: 9,
        Relacionamento: 7,
        Prospecção: 7.5,
    }
};

export const DEFAULT_DIAGNOSTIC_SEGMENTS: MarketSegment[] = [
    {
        id: 'edu_1',
        name: 'Educação',
        benchmarkMedio: 30,
        topPerformers: 60,
        characteristics: 'Mercado em transformação digital acelerada. Foco em resultados mensuráveis.',
        trends: 'Ensino híbrido e plataformas digitais de aprendizagem.',
        challenges: 'Orçamentos limitados, necessidade de comprovação de eficácia, adaptação tecnológica.',
        successFactors: 'ROI educacional demonstrável, facilidade de uso, suporte pedagógico.',
        aiFocusAreas: ['Processos', 'Tecnologia', 'Pessoas', 'Resultados'],
        aiCustomPrompt: 'Focar a análise na jornada do aluno e na eficácia das ferramentas de EdTech.',
        aiRevenueInsights: 'Para faturamentos baixos, focar em custo-benefício. Para altos, focar em escalabilidade e integração.',
        aiChannelInsights: {
            b2b: 'Vendas para instituições de ensino (escolas, universidades).',
            b2c: 'Vendas diretas para alunos e pais.',
            hibrido: 'Parcerias com empresas para treinamento corporativo.'
        }
    },
    {
        id: 'gen_1',
        name: 'Geral',
        benchmarkMedio: 40,
        topPerformers: 70,
        characteristics: 'Características gerais de mercado B2B com necessidade de abordagem consultiva.',
        trends: 'Digitalização e automação de processos comerciais.',
        challenges: 'Concorrência, ciclos de vendas longos, necessidade de diferenciação.',
        successFactors: 'Relacionamento, confiança, e demonstração clara de ROI.',
        aiFocusAreas: ['Processos', 'Tecnologia', 'Pessoas', 'Resultados'],
        aiCustomPrompt: '',
        aiRevenueInsights: '',
        aiChannelInsights: { b2b: '', b2c: '', hibrido: '' }
    },
    {
        id: 'ind_1',
        name: 'Indústria',
        benchmarkMedio: 35,
        topPerformers: 65,
        characteristics: 'Setor tradicional com foco em produto e eficiência operacional.',
        trends: 'Indústria 4.0, automação, e busca por novos canais de venda.',
        challenges: 'Logística complexa, dependência de distribuidores, margens apertadas.',
        successFactors: 'Qualidade do produto, gestão de cadeia de suprimentos, e suporte técnico.',
        aiFocusAreas: ['Processos', 'Tecnologia', 'Mercado', 'Resultados'],
        aiCustomPrompt: 'Analisar a eficiência da cadeia de distribuição e o impacto da tecnologia na produção e vendas.',
        aiRevenueInsights: '',
        aiChannelInsights: { b2b: 'Venda para distribuidores ou outras indústrias.', b2c: 'Venda direta via e-commerce ou lojas de fábrica.', hibrido: 'Uso de representantes comerciais e venda direta.' }
    }
];

export const DEFAULT_AI_PERSONAS: AIPersona[] = [
    {
        id: 'SDR' as AIMode.SDR,
        name: 'SDR - Qualificação',
        description: 'Especialista em prospecção e qualificação de leads.',
        tone: 'Persuasivo e direto',
        wordLimit: 150,
        systemPrompt: 'Você é um SDR (Sales Development Representative) sênior e especialista da GGV Inteligência em Vendas. Sua principal missão é ajudar os usuários a prospectar e qualificar leads usando as metodologias e informações da GGV. Sua fonte primária de conhecimento são os documentos no "Cérebro da IA". Sempre que possível, baseie suas respostas em argumentos de vendas, técnicas e processos contidos nesses documentos. Seja direto, prático e use uma linguagem persuasiva. A pergunta do usuário é:',
        directives: 'Exemplos de como você pode me ajudar:\n- "Crie um script de cold call para o produto X, baseado no nosso playbook."\n- "Quais as 3 melhores perguntas de qualificação para um lead do setor de tecnologia?"\n- "Me dê argumentos para contornar a objeção sobre o preço do nosso serviço."',
        personalityTraits: ['Proativo', 'Resiliente', 'Comunicativo', 'Organizado']
    },
    {
        id: 'Closer' as AIMode.Closer,
        name: 'Closer - Fechamento',
        description: 'Especialista em fechamento de vendas e negociação.',
        tone: 'Consultivo e objetivo',
        wordLimit: 200,
        systemPrompt: 'Você é um Closer (Vendedor) de alta performance e especialista da GGV Inteligência em Vendas. Seu objetivo é ajudar os usuários a conduzir negociações, quebrar objeções e fechar mais negócios. Utilize os cases de sucesso, diferenciais e informações técnicas do "Cérebro da IA" para construir suas respostas. Sua abordagem deve ser consultiva, focada em diagnóstico de dores e apresentação de soluções da GGV. A pergunta do usuário é:',
        directives: 'Exemplos de como você pode me ajudar:\n- "Estruture uma proposta comercial para um cliente do segmento Y."\n- "Qual case de sucesso da GGV posso usar para um cliente que tem a dor Z?"\n- "Liste os passos para uma demonstração de produto eficaz, segundo o processo da GGV."',
        personalityTraits: ['Persuasivo', 'Confiante', 'Orientado ao fechamento', 'Negociador', 'Consultivo']
    },
    {
        id: 'Gestor' as AIMode.Gestor,
        name: 'Gestor - Estratégia',
        description: 'Especialista em gestão de equipes e estratégia comercial.',
        tone: 'Analítico e estratégico',
        wordLimit: 300,
        systemPrompt: 'Você é um Gestor Comercial estratégico da GGV Inteligência em Vendas. Sua função é apoiar os líderes de equipe com dados, estratégias e insights para melhorar a performance do time. Suas respostas devem ser analíticas e baseadas nos processos, métricas e planos de treinamento disponíveis no "Cérebro da IA". Pense como um líder que usa dados para tomar decisões e desenvolver pessoas. A pergunta do usuário é:',
        directives: 'Exemplos de como você pode me ajudar:\n- "Crie um plano de 1:1 para um vendedor com baixa taxa de conversão."\n- "Quais KPIs do nosso processo comercial devo acompanhar semanalmente?"\n- "Descreva um plano de ramp-up para um novo vendedor, baseado nas práticas da GGV."',
        personalityTraits: ['Analítico', 'Líder', 'Estrategista', 'Mentor']
    }
];

export const SDR_REMUNERATION = {
  levels: {
    'Nível 1': 'level1',
    'Nível 2': 'level2',
    'Nível 3': 'level3',
    'Nível 4': 'level4',
  },
  fixedSalary: {
    level1: 2520.00,
    level2: 3020.00,
    level3: 3520.00,
    level4: 4020.00,
  },
  individualCommission: {
    // Tiers are min thresholds
    tiers: [
      { threshold: 1.5, label: '>150%' },
      { threshold: 1.3, label: '130%' },
      { threshold: 1.0, label: '100%' },
      { threshold: 0.85, label: '85%' },
      { threshold: 0.75, label: '75%' },
    ],
    values: {
      level1: [1850.00, 1600.00, 1350.00, 1147.50, 1012.50],
      level2: [2250.00, 2000.00, 1750.00, 1547.50, 1412.50],
      level3: [2650.00, 2400.00, 2150.00, 1947.50, 1812.50],
      level4: [3050.00, 2800.00, 2550.00, 2347.50, 2212.50],
    }
  },
  teamBonus: {
    tiers: [
        { threshold: 1.0, label: '100%' },
        { threshold: 0.85, label: '85%' },
        { threshold: 0.75, label: '75%' },
    ],
    values: {
        // Valores corretos por nível (100%, 85%, 75%)
        level1: [630.00, 535.50, 472.50],
        level2: [1030.00, 875.50, 772.50],
        level3: [1430.00, 1215.50, 1072.50],
        level4: [1830.00, 1555.50, 1372.50],
    }
  },
  quarterlyBonus: {
    tiers: [
      { threshold: 1.0, label: '100%' },
      { threshold: 0.85, label: '85%' },
      { threshold: 0.75, label: '75%' },
    ],
    values: {
      level1: [1500.00, 1275.00, 1125.00],
      level2: [2000.00, 1775.00, 1625.00],
      level3: [2500.00, 2275.00, 2125.00],
      level4: [3000.00, 2775.00, 2625.00],
    }
  },
  performanceBonus: {
    threshold: 0.35, // 35% MQL to SQL conversion
    values: {
      level1: 630.00,
      level2: 1030.00,
      level3: 1430.00,
      level4: 1830.00,
    }
  },
  annualBonus: {
      // If the annual goal is met, they get a bonus equal to their fixed salary.
      values: {
          level1: 2520.00,
          level2: 3020.00,
          level3: 3520.00,
          level4: 4020.00,
      }
  }
};

export const CLOSER_REMUNERATION = {
  levels: {
    'Nível 1': 'level1',
    'Nível 2': 'level2',
    'Nível 3': 'level3',
    'Nível 4': 'level4',
  },
  fixedSalary: {
    level1: 4000.00,
    level2: 4500.00,
    level3: 5000.00,
    level4: 6000.00,
  },
  individualCommission: {
    // Tiers are min thresholds for sales goal %. The commission rate is applied to total sales.
    tiers: [
      { threshold: 1.50, rate: 0.0140 }, // Acima de 150% -> 1.4%
      { threshold: 1.30, rate: 0.0120 }, // 130% a 149,99% -> 1.2%
      { threshold: 1.00, rate: 0.0100 }, // 100% a 129,99% -> 1.0%
      { threshold: 0.85, rate: 0.0085 }, // 85% a 99,99% -> 0.85%
      { threshold: 0.75, rate: 0.0075 }, // 75% a 84,99% -> 0.75%
    ]
  },
  teamBonus: {
    // Premiação coletiva baseada no atingimento da meta global do time
    // Tiers ordenados do maior para o menor para uso com getTieredValue
    tiers: [
      { threshold: 1.50, label: 'Acima de 150%' },
      { threshold: 1.30, label: '130% a 149,99%' },
      { threshold: 1.00, label: '100% a 129,99%' },
      { threshold: 0.85, label: '85% a 99,99%' },
      { threshold: 0.75, label: '75% a 84,99%' },
    ],
    values: {
      // Valores por nível (150%+, 130-149.99%, 100-129.99%, 85-99.99%, 75-84.99%)
      level1: [1600.00, 1300.00, 1000.00, 750.00, 500.00],
      level2: [2000.00, 1600.00, 1250.00, 1000.00, 750.00],
      level3: [2400.00, 1800.00, 1500.00, 1250.00, 1000.00],
      level4: [2800.00, 2000.00, 1750.00, 1500.00, 1250.00],
    }
  },
  quarterlyBonus: { // Based on Venda/SQL conversion, with a specific threshold per level
    level1: { threshold: 0.175, value: 4000.00 },
    level2: { threshold: 0.176, value: 5000.00 },
    level3: { threshold: 0.2001, value: 6000.00 },
    level4: { threshold: 0.22, value: 7000.00 },
  },
  campaignBonus: {
    ticketMedio: { level1: 500, level2: 750, level3: 1000, level4: 1250 },
    pagamentoVista: { level1: 500, level2: 750, level3: 1000, level4: 1250 },
    leadProspeccao: { level1: 500, level2: 750, level3: 1000, level4: 1250 },
    entrada50: { level1: 500, level2: 750, level3: 1000, level4: 1250 },
  },
  productBonus: {
    pesquisasAcima25k: { level1: 250, level2: 500, level3: 750, level4: 1000 },
    valuationAcima15k: { level1: 250, level2: 500, level3: 750, level4: 1000 },
    treinamentosAcima10k: { level1: 250, level2: 500, level3: 750, level4: 1000 },
    maisDe6Modulos: { level1: 250, level2: 500, level3: 750, level4: 1000 },
  },
  annualBonus: {
      // Assuming it's the same value as the fixed salary, similar to SDR
     values: {
        level1: 4000.00,
        level2: 4500.00,
        level3: 5000.00,
        level4: 6000.00,
     }
  }
};

export const COORDENADOR_REMUNERATION = {
  levels: {
    'Nível 1': 'level1',
    'Nível 2': 'level2',
    'Nível 3': 'level3',
    'Nível 4': 'level4',
  },
  fixedSalary: {
    level1: 5000.00,  // R$ 5.000,00
    level2: 7000.00,  // R$ 7.000,00
    level3: 9000.00,  // R$ 9.000,00
    level4: 12000.00, // R$ 12.000,00
  },
  // Premiação mensal coletiva (% sobre as vendas realizadas)
  monthlyCollectiveBonus: {
    tiers: [
      { threshold: 1.50, label: 'Acima de 150%' },
      { threshold: 1.30, label: '130% a 149,99%' },
      { threshold: 1.00, label: '100% a 129,99%' },
      { threshold: 0.85, label: '85% a 99,99%' },
      { threshold: 0.75, label: '75% a 84,99%' },
    ],
    rates: [0.01, 0.007, 0.005, 0.004, 0.003] // % sobre vendas realizadas (1%, 0,7%, 0,5%, 0,4%, 0,3%)
  },
  // Premiação trimestral por eficiência (% VENDA/SQL) - threshold específico por nível
  quarterlyEfficiencyBonus: {
    level1: { threshold: 0.175, value: 3000.00 }, // 17,5% = R$ 3.000
    level2: { threshold: 0.176, value: 4000.00 }, // 17,6% = R$ 4.000  
    level3: { threshold: 0.2001, value: 5000.00 }, // 20,01% = R$ 5.000
    level4: { threshold: 0.22, value: 6000.00 }, // 22% = R$ 6.000
  },
  // Bônus anual (% do salário fixo proporcional ao tempo na GGV)
  annualBonus: {
    // Bônus = salário fixo do nível × (meses de casa ÷ 12)
    // Ex: Nível 1 (R$ 5.000) × 6 meses = R$ 5.000 × 50% = R$ 2.500
    basedOnFixedSalary: true, // Indica que é baseado no salário fixo do nível
  }
};