

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
        id: 'agro_1',
        name: 'Agronegócio',
        benchmarkMedio: 35,
        topPerformers: 68,
        characteristics: 'Setor B2B com vendas técnicas para produtores rurais e cooperativas. Decisões baseadas em produtividade e ROI agrícola.',
        trends: 'Agricultura de precisão, sustentabilidade, biotecnologia, contratos de longo prazo, consultoria técnica especializada.',
        challenges: 'Sazonalidade, dependência climática, ciclos longos de decisão, necessidade de comprovação técnica, financiamento complexo.',
        successFactors: 'Expertise agronômica, demonstração de resultados, suporte técnico contínuo, relacionamento com cooperativas.',
        aiFocusAreas: ['Processos', 'Pessoas', 'Relacionamento', 'Resultados'],
        aiCustomPrompt: 'Focar em vendas consultivas para agronegócio, demonstração de ROI agrícola e gestão de ciclos sazonais.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos e especialização técnica. Para altos: expansão geográfica e parcerias com cooperativas.',
        aiChannelInsights: {
            b2b: 'Venda direta para produtores rurais, cooperativas, agroindústrias e distribuidores especializados.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + representantes técnicos regionais + parcerias com cooperativas.'
        }
    },
    {
        id: 'food_1',
        name: 'Alimentação / Bebidas',
        benchmarkMedio: 38,
        topPerformers: 72,
        characteristics: 'Setor B2B com vendas complexas para food service, indústrias e grandes corporações. Ciclos longos, múltiplos decisores e necessidade de consultoria técnica.',
        trends: 'Automação industrial, ingredientes funcionais, sustentabilidade corporativa, contratos de longo prazo, customização de produtos.',
        challenges: 'Ciclos de vendas extensos, múltiplos stakeholders, compliance rigoroso, negociações complexas de contratos, especificações técnicas detalhadas.',
        successFactors: 'Expertise técnica, relacionamento C-level, demonstração de ROI, suporte pós-venda especializado, capacidade de customização.',
        aiFocusAreas: ['Processos', 'Pessoas', 'Relacionamento', 'Resultados'],
        aiCustomPrompt: 'Focar em vendas consultivas B2B, gestão de stakeholders múltiplos, ciclos longos e demonstração de valor para food service corporativo.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em especialização técnica e nichos. Para altos: expansão geográfica e diversificação de portfólio industrial.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias alimentícias, redes de food service, grandes corporações (refeitórios industriais).',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores especializados + representantes técnicos regionais.'
        }
    },
    {
        id: 'craft_1',
        name: 'Artesanato ou Produção Manual',
        benchmarkMedio: 32,
        topPerformers: 62,
        characteristics: 'Vendas B2B para grandes encomendas corporativas, eventos e projetos especiais. Foco em customização e qualidade artesanal.',
        trends: 'Personalização corporativa, sustentabilidade, produtos únicos para eventos, branding experiencial, parcerias estratégicas.',
        challenges: 'Escalabilidade limitada, precificação complexa, gestão de prazos, padronização de qualidade, capacidade produtiva.',
        successFactors: 'Qualidade excepcional, capacidade de customização, cumprimento de prazos, relacionamento próximo, portfólio diferenciado.',
        aiFocusAreas: ['Processos', 'Pessoas', 'Qualidade', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas consultivas para projetos corporativos, gestão de customização e escalabilidade de produção artesanal.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos premium. Para altos: sistematização de processos e parcerias estratégicas.',
        aiChannelInsights: {
            b2b: 'Venda para empresas (brindes corporativos), eventos corporativos, projetos de decoração empresarial.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + representantes especializados + parcerias com agências.'
        }
    },
    {
        id: 'auto_1',
        name: 'Automotivo',
        benchmarkMedio: 40,
        topPerformers: 75,
        characteristics: 'Setor B2B com vendas técnicas para frotas corporativas, concessionárias e indústria automotiva. Negociações complexas e ciclos longos.',
        trends: 'Eletrificação, conectividade, frotas corporativas sustentáveis, leasing operacional, serviços integrados pós-venda.',
        challenges: 'Ciclos de decisão longos, múltiplos stakeholders, financiamento complexo, regulamentações rigorosas, concorrência acirrada.',
        successFactors: 'Expertise técnica, relacionamento com decisores, demonstração de TCO, suporte pós-venda robusto, soluções integradas.',
        aiFocusAreas: ['Processos', 'Relacionamento', 'Tecnologia', 'Resultados'],
        aiCustomPrompt: 'Focar em vendas consultivas para frotas corporativas, TCO e gestão de relacionamento com múltiplos decisores.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: expansão para soluções integradas e serviços.',
        aiChannelInsights: {
            b2b: 'Venda para frotas corporativas, concessionárias, empresas de logística e transporte.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + rede de concessionárias + parcerias com empresas de leasing.'
        }
    },
    {
        id: 'consumer_1',
        name: 'Bens de Consumo Simples',
        benchmarkMedio: 36,
        topPerformers: 70,
        characteristics: 'Vendas B2B para grandes redes varejistas, distribuidores e atacadistas. Foco em volume, logística e relacionamento comercial.',
        trends: 'E-commerce B2B, sustentabilidade, produtos premium, automação de pedidos, análise de dados de vendas.',
        challenges: 'Margens apertadas, concorrência por espaço no PDV, gestão de estoque, sazonalidade, negociação com grandes redes.',
        successFactors: 'Eficiência logística, relacionamento comercial sólido, suporte ao PDV, análise de giro, flexibilidade comercial.',
        aiFocusAreas: ['Processos', 'Relacionamento', 'Logística', 'Resultados'],
        aiCustomPrompt: 'Focar em vendas para grandes volumes, gestão de relacionamento com redes varejistas e otimização logística.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em eficiência operacional. Para altos: expansão geográfica e diversificação de canais.',
        aiChannelInsights: {
            b2b: 'Venda para redes varejistas, atacadistas, distribuidores e grandes consumidores corporativos.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores regionais + plataformas B2B.'
        }
    },
    {
        id: 'comm_1',
        name: 'Comunicação / Agências / Gráficas',
        benchmarkMedio: 42,
        topPerformers: 78,
        characteristics: 'Vendas B2B consultivas para projetos corporativos de comunicação. Ciclos médios, múltiplos stakeholders e necessidade de criatividade estratégica.',
        trends: 'Marketing digital integrado, automação de marketing, branding experiencial, sustentabilidade, métricas de performance.',
        challenges: 'Precificação de projetos criativos, gestão de expectativas, prazos apertados, concorrência por concorrências, ROI subjetivo.',
        successFactors: 'Portfólio sólido, relacionamento C-level, capacidade estratégica, cumprimento de prazos, mensuração de resultados.',
        aiFocusAreas: ['Processos', 'Pessoas', 'Criatividade', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas consultivas para projetos de comunicação, gestão de stakeholders criativos e demonstração de ROI.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: contas estratégicas e retainer agreements.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, agências parceiras, consultorias e grandes corporações.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias estratégicas + network de indicações.'
        }
    },
    {
        id: 'consult_1',
        name: 'Consultoria / Assessoria / Administração',
        benchmarkMedio: 45,
        topPerformers: 82,
        characteristics: 'Vendas consultivas complexas para serviços especializados. Ciclos longos, alta confiança necessária e demonstração de expertise.',
        trends: 'Consultoria digital, especialização setorial, metodologias proprietárias, contratos de performance, parcerias estratégicas.',
        challenges: 'Intangibilidade do serviço, ciclos longos de decisão, necessidade de credibilidade, concorrência por expertise, precificação por valor.',
        successFactors: 'Expertise reconhecida, cases de sucesso, relacionamento C-level, metodologia diferenciada, resultados mensuráveis.',
        aiFocusAreas: ['Processos', 'Pessoas', 'Expertise', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas consultivas de alto valor, demonstração de expertise e gestão de relacionamento de longo prazo.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em especialização e nichos. Para altos: escalabilidade e parcerias estratégicas.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, órgãos públicos, associações e outras consultorias.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + network profissional + parcerias com outras consultorias.'
        }
    },
    {
        id: 'insurance_1',
        name: 'Corretagem / Seguros / Previdência',
        benchmarkMedio: 38,
        topPerformers: 72,
        characteristics: 'Vendas B2B para seguros corporativos e benefícios empresariais. Relacionamento de longo prazo e gestão de riscos complexos.',
        trends: 'Seguros paramétricos, digitalização de processos, wellness corporativo, seguros sustentáveis, analytics de risco.',
        challenges: 'Regulamentação complexa, ciclos longos de decisão, gestão de sinistros, concorrência por preço, renovações anuais.',
        successFactors: 'Expertise em riscos, relacionamento sólido, suporte na gestão de sinistros, consultoria preventiva, soluções customizadas.',
        aiFocusAreas: ['Processos', 'Relacionamento', 'Gestão de Riscos', 'Resultados'],
        aiCustomPrompt: 'Focar em vendas consultivas para seguros corporativos, gestão de relacionamento de longo prazo e consultoria em riscos.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: carteira diversificada e serviços agregados.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, corretoras parceiras, consultorias em RH e gestores de benefícios.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + rede de corretores + parcerias com consultorias.'
        }
    },
    {
        id: 'ecommerce_1',
        name: 'E-commerce',
        benchmarkMedio: 44,
        topPerformers: 80,
        characteristics: 'Vendas B2B de soluções e serviços para e-commerce. Mercado técnico com necessidade de integração e performance.',
        trends: 'Omnichannel, inteligência artificial, automação, marketplaces B2B, analytics avançado, experiência do cliente.',
        challenges: 'Evolução tecnológica rápida, integração complexa, concorrência global, métricas de performance, escalabilidade.',
        successFactors: 'Expertise técnica, suporte especializado, integração eficiente, resultados mensuráveis, inovação constante.',
        aiFocusAreas: ['Tecnologia', 'Processos', 'Performance', 'Inovação'],
        aiCustomPrompt: 'Focar em vendas técnicas para e-commerce, demonstração de ROI digital e gestão de integrações complexas.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em soluções específicas. Para altos: plataformas integradas e serviços gerenciados.',
        aiChannelInsights: {
            b2b: 'Venda para e-commerces, marketplaces, agências digitais e empresas em transformação digital.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com agências + marketplace de soluções.'
        }
    },
    {
        id: 'edu_1',
        name: 'Educação',
        benchmarkMedio: 35,
        topPerformers: 68,
        characteristics: 'Vendas B2B para instituições educacionais e treinamento corporativo. Foco em resultados educacionais e ROI de aprendizagem.',
        trends: 'Educação digital, aprendizagem adaptativa, treinamento corporativo, certificações online, analytics educacional.',
        challenges: 'Orçamentos limitados, ciclos de decisão longos, necessidade de comprovação de eficácia, resistência à mudança.',
        successFactors: 'ROI educacional demonstrável, suporte pedagógico, facilidade de implementação, resultados mensuráveis.',
        aiFocusAreas: ['Processos', 'Resultados', 'Pessoas', 'Tecnologia'],
        aiCustomPrompt: 'Focar em vendas consultivas para educação corporativa, demonstração de ROI educacional e gestão de implementação.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em soluções específicas. Para altos: plataformas integradas e serviços gerenciados.',
        aiChannelInsights: {
            b2b: 'Venda para empresas (treinamento), instituições educacionais, consultorias em RH.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias educacionais + canais de distribuição especializados.'
        }
    },
,
    {
        id: 'packaging_1',
        name: 'Embalagens / Papel',
        benchmarkMedio: 36,
        topPerformers: 70,
        characteristics: 'Vendas B2B técnicas para indústrias com necessidades específicas de embalagem. Foco em especificações técnicas e sustentabilidade.',
        trends: 'Embalagens sustentáveis, smart packaging, automação industrial, customização, economia circular.',
        challenges: 'Especificações técnicas complexas, regulamentações ambientais, pressão por custos, inovação constante.',
        successFactors: 'Expertise técnica, capacidade de customização, sustentabilidade, suporte técnico especializado.',
        aiFocusAreas: ['Processos', 'Tecnologia', 'Sustentabilidade', 'Qualidade'],
        aiCustomPrompt: 'Focar em vendas técnicas para embalagens industriais, sustentabilidade e customização de soluções.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos técnicos. Para altos: soluções integradas e parcerias estratégicas.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias, distribuidores especializados, empresas de logística.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores regionais + representantes técnicos.'
        }
    },
    {
        id: 'energy_1',
        name: 'Energia e Infraestrutura',
        benchmarkMedio: 32,
        topPerformers: 65,
        characteristics: 'Vendas B2B complexas para projetos de infraestrutura e energia. Ciclos muito longos, múltiplos stakeholders e alta complexidade técnica.',
        trends: 'Energias renováveis, eficiência energética, smart grids, sustentabilidade, digitalização de ativos.',
        challenges: 'Ciclos extremamente longos, regulamentação complexa, investimentos altos, múltiplos decisores, riscos técnicos.',
        successFactors: 'Expertise técnica profunda, relacionamento institucional, capacidade financeira, track record comprovado.',
        aiFocusAreas: ['Processos', 'Relacionamento', 'Tecnologia', 'Compliance'],
        aiCustomPrompt: 'Focar em vendas de projetos complexos de infraestrutura, gestão de stakeholders múltiplos e ciclos longos.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em projetos menores e nichos. Para altos: grandes projetos e parcerias estratégicas.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, órgãos públicos, concessionárias e grandes corporações.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + consórcios + parcerias técnicas internacionais.'
        }
    },
    {
        id: 'eng_1',
        name: 'Engenharia',
        benchmarkMedio: 38,
        topPerformers: 72,
        characteristics: 'Vendas B2B de serviços de engenharia para projetos corporativos e industriais. Alta especialização técnica e gestão de projetos complexos.',
        trends: 'Engenharia digital, BIM, sustentabilidade, automação industrial, IoT, análise preditiva.',
        challenges: 'Projetos complexos, gestão de riscos técnicos, prazos apertados, regulamentações rigorosas, responsabilidade técnica.',
        successFactors: 'Expertise técnica reconhecida, gestão de projetos eficiente, compliance rigoroso, inovação tecnológica.',
        aiFocusAreas: ['Processos', 'Tecnologia', 'Qualidade', 'Gestão de Projetos'],
        aiCustomPrompt: 'Focar em vendas consultivas de engenharia, gestão de projetos complexos e demonstração de expertise técnica.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em especialização técnica. Para altos: projetos integrados e parcerias estratégicas.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias, construtoras, órgãos públicos e empresas de infraestrutura.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias técnicas + consórcios de engenharia.'
        }
    },
    {
        id: 'industrial_1',
        name: 'Componentes / Equipamentos Industriais',
        benchmarkMedio: 37,
        topPerformers: 71,
        characteristics: 'Vendas B2B técnicas de componentes e equipamentos para indústrias. Foco em especificações técnicas, qualidade e suporte.',
        trends: 'Indústria 4.0, IoT industrial, manutenção preditiva, automação, eficiência energética.',
        challenges: 'Especificações técnicas rigorosas, ciclos de aprovação longos, concorrência global, necessidade de certificações.',
        successFactors: 'Qualidade superior, suporte técnico especializado, certificações internacionais, inovação tecnológica.',
        aiFocusAreas: ['Tecnologia', 'Qualidade', 'Suporte Técnico', 'Inovação'],
        aiCustomPrompt: 'Focar em vendas técnicas industriais, demonstração de qualidade e suporte técnico especializado.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos técnicos. Para altos: soluções integradas e contratos de manutenção.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias, distribuidores técnicos, integradores de sistemas.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores especializados + representantes técnicos regionais.'
        }
    },
    {
        id: 'beauty_1',
        name: 'Estética / Beleza / Cosméticos',
        benchmarkMedio: 40,
        topPerformers: 74,
        characteristics: 'Vendas B2B para salões, clínicas e redes de beleza. Foco em produtos profissionais e equipamentos especializados.',
        trends: 'Beleza sustentável, tecnologia em tratamentos, personalização, wellness, produtos naturais.',
        challenges: 'Regulamentação sanitária, concorrência acirrada, sazonalidade, necessidade de treinamento técnico.',
        successFactors: 'Qualidade comprovada, suporte técnico, treinamento especializado, relacionamento próximo.',
        aiFocusAreas: ['Processos', 'Pessoas', 'Qualidade', 'Treinamento'],
        aiCustomPrompt: 'Focar em vendas consultivas para profissionais de beleza, treinamento técnico e suporte especializado.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: redes e franquias.',
        aiChannelInsights: {
            b2b: 'Venda para salões, clínicas de estética, spas, distribuidores especializados.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores + representantes regionais especializados.'
        }
    },
    {
        id: 'events_1',
        name: 'Eventos',
        benchmarkMedio: 41,
        topPerformers: 76,
        characteristics: 'Vendas B2B de serviços para eventos corporativos. Projetos únicos, gestão de múltiplos fornecedores e execução impecável.',
        trends: 'Eventos híbridos, tecnologia imersiva, sustentabilidade, experiências personalizadas, métricas de engajamento.',
        challenges: 'Projetos únicos, gestão de múltiplos stakeholders, prazos inflexíveis, orçamentos variáveis, execução perfeita.',
        successFactors: 'Criatividade, gestão de projetos eficiente, rede de fornecedores, execução impecável.',
        aiFocusAreas: ['Processos', 'Criatividade', 'Gestão de Projetos', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas consultivas para eventos corporativos, gestão de projetos únicos e execução impecável.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: eventos de grande porte e contratos anuais.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, agências de comunicação, associações e órgãos públicos.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com agências + network de indicações.'
        }
    },
    {
        id: 'fitness_1',
        name: 'Fitness / Esporte',
        benchmarkMedio: 39,
        topPerformers: 73,
        characteristics: 'Vendas B2B para academias, clubes esportivos e wellness corporativo. Foco em equipamentos, serviços e programas especializados.',
        trends: 'Wellness corporativo, tecnologia fitness, treinamento personalizado, saúde preventiva, gamificação.',
        challenges: 'Sazonalidade, concorrência por espaço, necessidade de resultados mensuráveis, rotatividade de clientes.',
        successFactors: 'Resultados comprovados, tecnologia diferenciada, suporte especializado, programas customizados.',
        aiFocusAreas: ['Processos', 'Resultados', 'Tecnologia', 'Pessoas'],
        aiCustomPrompt: 'Focar em vendas consultivas para wellness corporativo, demonstração de resultados e programas customizados.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: programas corporativos e contratos anuais.',
        aiChannelInsights: {
            b2b: 'Venda para empresas (wellness corporativo), academias, clubes esportivos, consultorias em saúde.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com academias + consultorias especializadas.'
        }
    },
    {
        id: 'import_1',
        name: 'Importação / Exportação',
        benchmarkMedio: 34,
        topPerformers: 67,
        characteristics: 'Vendas B2B de serviços de comércio exterior para empresas. Complexidade regulatória e logística internacional.',
        trends: 'Digitalização aduaneira, sustentabilidade logística, acordos comerciais, e-commerce internacional.',
        challenges: 'Regulamentação complexa, câmbio variável, logística internacional, documentação extensa, riscos políticos.',
        successFactors: 'Expertise regulatória, rede internacional, agilidade operacional, gestão de riscos.',
        aiFocusAreas: ['Processos', 'Compliance', 'Logística', 'Gestão de Riscos'],
        aiCustomPrompt: 'Focar em vendas consultivas para comércio exterior, gestão de compliance e otimização logística internacional.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos específicos. Para altos: soluções integradas e parcerias globais.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas exportadoras/importadoras, trading companies, indústrias.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias internacionais + agentes especializados.'
        }
    },
    {
        id: 'realestate_1',
        name: 'Imóveis / Arquitetura / Construção civil',
        benchmarkMedio: 33,
        topPerformers: 66,
        characteristics: 'Vendas B2B para projetos imobiliários corporativos e industriais. Ciclos muito longos, altos valores e múltiplos decisores.',
        trends: 'Construção sustentável, BIM, automação predial, smart buildings, certificações ambientais.',
        challenges: 'Ciclos extremamente longos, regulamentação complexa, financiamento complexo, múltiplos stakeholders.',
        successFactors: 'Track record sólido, capacidade financeira, expertise técnica, relacionamento institucional.',
        aiFocusAreas: ['Processos', 'Relacionamento', 'Gestão de Projetos', 'Compliance'],
        aiCustomPrompt: 'Focar em vendas de projetos imobiliários corporativos, gestão de ciclos longos e múltiplos stakeholders.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em projetos menores. Para altos: grandes empreendimentos e parcerias.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, incorporadoras, órgãos públicos, fundos imobiliários.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias estratégicas + consórcios de construção.'
        }
    },
    {
        id: 'research_1',
        name: 'Instituto de pesquisa',
        benchmarkMedio: 36,
        topPerformers: 69,
        characteristics: 'Vendas B2B de serviços de pesquisa para empresas e órgãos públicos. Foco em metodologia, credibilidade e insights acionáveis.',
        trends: 'Big data, inteligência artificial, pesquisa digital, analytics avançado, insights em tempo real.',
        challenges: 'Intangibilidade do serviço, necessidade de credibilidade, concorrência por expertise, prazos apertados.',
        successFactors: 'Metodologia reconhecida, expertise setorial, insights acionáveis, relacionamento institucional.',
        aiFocusAreas: ['Processos', 'Metodologia', 'Expertise', 'Insights'],
        aiCustomPrompt: 'Focar em vendas consultivas de pesquisa, demonstração de metodologia e geração de insights acionáveis.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: contratos anuais e pesquisas continuadas.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, órgãos públicos, consultorias, associações setoriais.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias acadêmicas + network especializado.'
        }
    },
    {
        id: 'legal_1',
        name: 'Jurídica',
        benchmarkMedio: 43,
        topPerformers: 79,
        characteristics: 'Vendas B2B de serviços jurídicos especializados para empresas. Alta especialização, relacionamento de confiança e resultados mensuráveis.',
        trends: 'Legal tech, automação jurídica, compliance digital, análise preditiva, serviços jurídicos preventivos.',
        challenges: 'Intangibilidade do serviço, necessidade de confiança, concorrência por expertise, precificação por valor.',
        successFactors: 'Expertise reconhecida, track record comprovado, relacionamento sólido, resultados mensuráveis.',
        aiFocusAreas: ['Processos', 'Expertise', 'Relacionamento', 'Resultados'],
        aiCustomPrompt: 'Focar em vendas consultivas jurídicas, demonstração de expertise e gestão de relacionamento de confiança.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em especialização. Para altos: clientes estratégicos e contratos de retainer.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, outras firmas jurídicas, órgãos públicos, associações.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + network profissional + parcerias estratégicas.'
        }
    },
    {
        id: 'logistics_1',
        name: 'Logística',
        benchmarkMedio: 37,
        topPerformers: 71,
        characteristics: 'Vendas B2B de soluções logísticas complexas para empresas. Foco em eficiência, tecnologia e gestão de cadeia de suprimentos.',
        trends: 'Logística 4.0, automação, sustentabilidade, rastreabilidade, otimização de rotas, e-commerce.',
        challenges: 'Margens apertadas, complexidade operacional, regulamentação, necessidade de investimento em tecnologia.',
        successFactors: 'Eficiência operacional, tecnologia avançada, flexibilidade, relacionamento sólido, métricas claras.',
        aiFocusAreas: ['Processos', 'Tecnologia', 'Eficiência', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas consultivas de logística, demonstração de eficiência e otimização de custos.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: soluções integradas e contratos de longo prazo.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias, e-commerces, distribuidores, empresas de grande porte.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias estratégicas + rede de agentes regionais.'
        }
    },
    {
        id: 'manufacturing_1',
        name: 'Manufatura Específica',
        benchmarkMedio: 35,
        topPerformers: 68,
        characteristics: 'Vendas B2B de produtos manufaturados especializados para indústrias. Foco em especificações técnicas e qualidade.',
        trends: 'Manufatura aditiva, customização em massa, sustentabilidade, automação, Indústria 4.0.',
        challenges: 'Especificações técnicas rigorosas, concorrência global, necessidade de certificações, pressão por custos.',
        successFactors: 'Qualidade superior, capacidade de customização, suporte técnico, inovação contínua.',
        aiFocusAreas: ['Tecnologia', 'Qualidade', 'Customização', 'Inovação'],
        aiCustomPrompt: 'Focar em vendas técnicas de manufatura, demonstração de qualidade e capacidade de customização.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos técnicos. Para altos: soluções integradas e parcerias estratégicas.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias, distribuidores técnicos, integradores de sistemas.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores especializados + representantes técnicos.'
        }
    },
    {
        id: 'maintenance_1',
        name: 'Manutenção',
        benchmarkMedio: 38,
        topPerformers: 72,
        characteristics: 'Vendas B2B de serviços de manutenção industrial e predial. Contratos de longo prazo e relacionamento de confiança.',
        trends: 'Manutenção preditiva, IoT, automação, contratos de performance, sustentabilidade.',
        challenges: 'Concorrência por preço, necessidade de disponibilidade 24/7, gestão de equipes técnicas, SLAs rigorosos.',
        successFactors: 'Confiabilidade, tempo de resposta, expertise técnica, relacionamento sólido, tecnologia avançada.',
        aiFocusAreas: ['Processos', 'Confiabilidade', 'Tecnologia', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas de contratos de manutenção, demonstração de confiabilidade e gestão de SLAs.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: contratos integrados e manutenção preditiva.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias, prédios comerciais, hospitais, shopping centers.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com construtoras + rede de técnicos regionais.'
        }
    },
    {
        id: 'construction_materials_1',
        name: 'Materiais de construção / Madeiras',
        benchmarkMedio: 34,
        topPerformers: 67,
        characteristics: 'Vendas B2B de materiais para construção civil e industrial. Foco em volume, qualidade e logística eficiente.',
        trends: 'Materiais sustentáveis, construção modular, certificações ambientais, automação de pedidos.',
        challenges: 'Sazonalidade, logística complexa, concorrência por preço, necessidade de financiamento, regulamentação ambiental.',
        successFactors: 'Qualidade consistente, logística eficiente, relacionamento comercial, flexibilidade de pagamento.',
        aiFocusAreas: ['Processos', 'Logística', 'Qualidade', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas de materiais de construção, gestão logística e relacionamento comercial de longo prazo.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: grandes obras e contratos de fornecimento.',
        aiChannelInsights: {
            b2b: 'Venda para construtoras, incorporadoras, distribuidores, grandes obras públicas.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores regionais + representantes comerciais.'
        }
    },
    {
        id: 'furniture_1',
        name: 'Móveis',
        benchmarkMedio: 37,
        topPerformers: 70,
        characteristics: 'Vendas B2B de móveis corporativos e projetos especiais. Foco em design, funcionalidade e projetos customizados.',
        trends: 'Móveis inteligentes, sustentabilidade, ergonomia, home office corporativo, design colaborativo.',
        challenges: 'Ciclos de projeto longos, necessidade de customização, logística de entrega, concorrência por design.',
        successFactors: 'Design diferenciado, qualidade superior, capacidade de customização, suporte ao projeto.',
        aiFocusAreas: ['Processos', 'Design', 'Customização', 'Projetos'],
        aiCustomPrompt: 'Focar em vendas de móveis corporativos, gestão de projetos customizados e relacionamento com arquitetos.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos de design. Para altos: grandes projetos corporativos.',
        aiChannelInsights: {
            b2b: 'Venda para empresas, escritórios de arquitetura, construtoras, órgãos públicos.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com arquitetos + showrooms especializados.'
        }
    },
    {
        id: 'outsourcing_1',
        name: 'Outsourcing / Terceirização / Aluguel',
        benchmarkMedio: 41,
        topPerformers: 76,
        characteristics: 'Vendas B2B de serviços terceirizados para empresas. Contratos de longo prazo e gestão de performance.',
        trends: 'Outsourcing digital, automação de processos, contratos de performance, especialização setorial.',
        challenges: 'Concorrência por preço, gestão de SLAs, necessidade de especialização, rotatividade de pessoal.',
        successFactors: 'Expertise operacional, gestão de qualidade, flexibilidade, relacionamento sólido, tecnologia.',
        aiFocusAreas: ['Processos', 'Qualidade', 'Gestão', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas de outsourcing, demonstração de eficiência operacional e gestão de SLAs.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: contratos integrados de longo prazo.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas de todos os portes, órgãos públicos, multinacionais.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias estratégicas + rede de consultores.'
        }
    },
    {
        id: 'chemicals_1',
        name: 'Produtos químicos',
        benchmarkMedio: 33,
        topPerformers: 65,
        characteristics: 'Vendas B2B técnicas de produtos químicos para indústrias. Alta regulamentação e necessidade de expertise técnica.',
        trends: 'Química verde, sustentabilidade, automação industrial, produtos especializados, economia circular.',
        challenges: 'Regulamentação rigorosa, segurança, logística especializada, especificações técnicas complexas.',
        successFactors: 'Expertise técnica, compliance rigoroso, suporte especializado, inovação, segurança.',
        aiFocusAreas: ['Tecnologia', 'Compliance', 'Segurança', 'Expertise'],
        aiCustomPrompt: 'Focar em vendas técnicas de produtos químicos, gestão de compliance e suporte técnico especializado.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: soluções integradas e contratos de longo prazo.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias, distribuidores especializados, laboratórios.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores técnicos + representantes especializados.'
        }
    },
    {
        id: 'health_1',
        name: 'Saúde',
        benchmarkMedio: 39,
        topPerformers: 74,
        characteristics: 'Vendas B2B para hospitais, clínicas e sistemas de saúde. Foco em qualidade, compliance e resultados clínicos.',
        trends: 'Telemedicina, IA em saúde, medicina preventiva, sustentabilidade hospitalar, analytics de saúde.',
        challenges: 'Regulamentação rigorosa, ciclos de aprovação longos, necessidade de evidências clínicas, orçamentos limitados.',
        successFactors: 'Evidências clínicas, compliance rigoroso, suporte especializado, relacionamento médico, inovação.',
        aiFocusAreas: ['Processos', 'Compliance', 'Qualidade', 'Evidências'],
        aiCustomPrompt: 'Focar em vendas consultivas para saúde, demonstração de evidências clínicas e gestão de compliance.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: sistemas integrados e contratos de longo prazo.',
        aiChannelInsights: {
            b2b: 'Venda direta para hospitais, clínicas, laboratórios, planos de saúde.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores médicos + parcerias com associações médicas.'
        }
    },
    {
        id: 'animal_health_1',
        name: 'Saúde animal',
        benchmarkMedio: 36,
        topPerformers: 69,
        characteristics: 'Vendas B2B para veterinários, fazendas e indústria pecuária. Foco em eficácia, segurança e produtividade animal.',
        trends: 'Medicina veterinária preventiva, biotecnologia animal, sustentabilidade pecuária, rastreabilidade.',
        challenges: 'Regulamentação rigorosa, necessidade de evidências, sazonalidade, concorrência global.',
        successFactors: 'Eficácia comprovada, suporte técnico veterinário, relacionamento com produtores, inovação.',
        aiFocusAreas: ['Processos', 'Eficácia', 'Suporte Técnico', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas consultivas para saúde animal, demonstração de eficácia e suporte técnico veterinário.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: grandes produtores e contratos anuais.',
        aiChannelInsights: {
            b2b: 'Venda para veterinários, fazendas, cooperativas, distribuidores especializados.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores veterinários + representantes técnicos regionais.'
        }
    },
    {
        id: 'security_1',
        name: 'Segurança / Escolta / Monitoramento',
        benchmarkMedio: 38,
        topPerformers: 72,
        characteristics: 'Vendas B2B de serviços de segurança para empresas. Contratos de longo prazo e alta confiabilidade necessária.',
        trends: 'Segurança digital integrada, IoT, inteligência artificial, análise preditiva, automação.',
        challenges: 'Concorrência por preço, necessidade de confiabilidade 24/7, regulamentação rigorosa, gestão de pessoal.',
        successFactors: 'Confiabilidade, tecnologia avançada, pessoal qualificado, relacionamento sólido, compliance.',
        aiFocusAreas: ['Processos', 'Confiabilidade', 'Tecnologia', 'Compliance'],
        aiCustomPrompt: 'Focar em vendas de segurança corporativa, demonstração de confiabilidade e gestão de contratos de longo prazo.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: grandes corporações e contratos integrados.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, condomínios, shopping centers, órgãos públicos.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com construtoras + rede de revendedores.'
        }
    },
    {
        id: 'environmental_1',
        name: 'Serviços Ambientais e Sustentabilidade',
        benchmarkMedio: 37,
        topPerformers: 71,
        characteristics: 'Vendas B2B de soluções ambientais para empresas. Foco em compliance, sustentabilidade e responsabilidade social.',
        trends: 'ESG, economia circular, carbono neutro, certificações ambientais, tecnologias limpas.',
        challenges: 'Regulamentação complexa, necessidade de especialização, ROI de longo prazo, conscientização do mercado.',
        successFactors: 'Expertise ambiental, compliance rigoroso, inovação tecnológica, relacionamento institucional.',
        aiFocusAreas: ['Processos', 'Compliance', 'Sustentabilidade', 'Inovação'],
        aiCustomPrompt: 'Focar em vendas consultivas ambientais, demonstração de compliance e benefícios de sustentabilidade.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos regulatórios. Para altos: soluções integradas de ESG.',
        aiChannelInsights: {
            b2b: 'Venda direta para indústrias, grandes corporações, órgãos públicos, consultorias.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com consultorias + network especializado.'
        }
    },
    {
        id: 'financial_1',
        name: 'Serviços financeiros',
        benchmarkMedio: 42,
        topPerformers: 78,
        characteristics: 'Vendas B2B de soluções financeiras para empresas. Alta regulamentação e necessidade de confiança e expertise.',
        trends: 'Fintech, open banking, pagamentos digitais, crédito alternativo, analytics financeiro.',
        challenges: 'Regulamentação rigorosa, necessidade de confiança, concorrência bancária, compliance complexo.',
        successFactors: 'Expertise financeira, compliance rigoroso, relacionamento sólido, inovação tecnológica, segurança.',
        aiFocusAreas: ['Processos', 'Compliance', 'Relacionamento', 'Segurança'],
        aiCustomPrompt: 'Focar em vendas consultivas financeiras, demonstração de expertise e gestão de relacionamento de confiança.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: soluções integradas e parcerias bancárias.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, bancos, fintechs, consultorias financeiras.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias bancárias + network de contadores.'
        }
    },
    {
        id: 'associations_1',
        name: 'Sindicatos / Associações / ONGs',
        benchmarkMedio: 34,
        topPerformers: 66,
        characteristics: 'Vendas B2B para organizações sem fins lucrativos. Foco em impacto social, eficiência e transparência.',
        trends: 'Digitalização de processos, transparência, impacto social mensurável, parcerias estratégicas.',
        challenges: 'Orçamentos limitados, necessidade de transparência, múltiplos stakeholders, impacto social.',
        successFactors: 'Impacto social demonstrável, transparência, eficiência de custos, relacionamento institucional.',
        aiFocusAreas: ['Processos', 'Impacto Social', 'Transparência', 'Eficiência'],
        aiCustomPrompt: 'Focar em vendas para organizações sociais, demonstração de impacto e eficiência de recursos.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em soluções específicas. Para altos: programas integrados e parcerias.',
        aiChannelInsights: {
            b2b: 'Venda direta para sindicatos, associações, ONGs, órgãos públicos.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias institucionais + network social.'
        }
    },
    {
        id: 'startup_1',
        name: 'Startup',
        benchmarkMedio: 44,
        topPerformers: 81,
        characteristics: 'Vendas B2B de soluções inovadoras para empresas. Foco em disrupção, escalabilidade e crescimento rápido.',
        trends: 'Tecnologia disruptiva, escalabilidade, modelos de negócio inovadores, parcerias estratégicas.',
        challenges: 'Credibilidade inicial, recursos limitados, necessidade de crescimento rápido, validação de mercado.',
        successFactors: 'Inovação comprovada, escalabilidade, agilidade, relacionamento estratégico, resultados rápidos.',
        aiFocusAreas: ['Inovação', 'Escalabilidade', 'Agilidade', 'Resultados'],
        aiCustomPrompt: 'Focar em vendas de inovação, demonstração de disrupção e potencial de escalabilidade.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em validação e tração. Para altos: escalabilidade e parcerias estratégicas.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas inovadoras, corporações, investidores, aceleradoras.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias estratégicas + network de inovação.'
        }
    },
    {
        id: 'retail_1',
        name: 'Supermercado / Hipermercado',
        benchmarkMedio: 39,
        topPerformers: 73,
        characteristics: 'Vendas B2B para redes varejistas e atacadistas. Foco em volume, eficiência operacional e tecnologia.',
        trends: 'Omnichannel, automação, analytics de vendas, sustentabilidade, experiência do cliente.',
        challenges: 'Margens apertadas, concorrência acirrada, necessidade de eficiência, gestão de estoque complexa.',
        successFactors: 'Eficiência operacional, tecnologia avançada, relacionamento comercial, flexibilidade.',
        aiFocusAreas: ['Processos', 'Tecnologia', 'Eficiência', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas para varejo, demonstração de eficiência operacional e tecnologia.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em soluções específicas. Para altos: plataformas integradas.',
        aiChannelInsights: {
            b2b: 'Venda direta para redes varejistas, atacadistas, distribuidores, shopping centers.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com redes + representantes regionais.'
        }
    },
    {
        id: 'tech_1',
        name: 'Tecnologia / Desenvolvimento / Sites',
        benchmarkMedio: 46,
        topPerformers: 83,
        characteristics: 'Vendas B2B de soluções tecnológicas para empresas. Foco em inovação, integração e transformação digital.',
        trends: 'Inteligência artificial, cloud computing, automação, cybersecurity, transformação digital.',
        challenges: 'Evolução tecnológica rápida, necessidade de especialização, concorrência global, integração complexa.',
        successFactors: 'Inovação tecnológica, expertise técnica, suporte especializado, resultados mensuráveis.',
        aiFocusAreas: ['Tecnologia', 'Inovação', 'Integração', 'Resultados'],
        aiCustomPrompt: 'Focar em vendas de tecnologia, demonstração de inovação e capacidade de integração.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em soluções específicas. Para altos: plataformas integradas e serviços gerenciados.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, órgãos públicos, outras empresas de tecnologia.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias tecnológicas + canais de distribuição.'
        }
    },
    {
        id: 'tourism_1',
        name: 'Turismo',
        benchmarkMedio: 35,
        topPerformers: 68,
        characteristics: 'Vendas B2B de serviços turísticos corporativos. Foco em experiências, gestão de grupos e eventos corporativos.',
        trends: 'Turismo corporativo sustentável, experiências personalizadas, tecnologia de reservas, wellness travel.',
        challenges: 'Sazonalidade, gestão de múltiplos fornecedores, necessidade de personalização, orçamentos variáveis.',
        successFactors: 'Experiências diferenciadas, gestão eficiente, relacionamento sólido, flexibilidade.',
        aiFocusAreas: ['Processos', 'Experiência', 'Gestão', 'Relacionamento'],
        aiCustomPrompt: 'Focar em vendas de turismo corporativo, gestão de experiências e relacionamento de longo prazo.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: programas corporativos anuais.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, agências corporativas, associações, órgãos públicos.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + parcerias com agências + network de fornecedores.'
        }
    },
    {
        id: 'fashion_1',
        name: 'Vestuário',
        benchmarkMedio: 38,
        topPerformers: 72,
        characteristics: 'Vendas B2B de uniformes corporativos e vestuário profissional. Foco em qualidade, personalização e prazos.',
        trends: 'Sustentabilidade têxtil, personalização digital, uniformes inteligentes, e-commerce B2B.',
        challenges: 'Sazonalidade, gestão de estoque, necessidade de personalização, prazos de entrega.',
        successFactors: 'Qualidade superior, capacidade de personalização, cumprimento de prazos, relacionamento comercial.',
        aiFocusAreas: ['Processos', 'Qualidade', 'Personalização', 'Prazos'],
        aiCustomPrompt: 'Focar em vendas de vestuário corporativo, gestão de personalização e cumprimento de prazos.',
        aiRevenueInsights: 'Para faturamentos baixos: focar em nichos especializados. Para altos: grandes corporações e contratos anuais.',
        aiChannelInsights: {
            b2b: 'Venda direta para empresas, hospitais, escolas, órgãos públicos.',
            b2c: 'Não aplicável - foco exclusivo B2B.',
            hibrido: 'Combinação de venda direta + distribuidores especializados + representantes regionais.'
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
  // Comissão Individual fixa de 0.75% sobre todas as vendas (independente da meta)
  fixedIndividualCommission: {
    rate: 0.0075, // 0.75% sobre vendas realizadas
  },
  // Premiação Individual / Meta (antiga "Comissão individual / meta")
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
  // Labels personalizados para os bônus
  campaignBonusLabels: {
    ticketMedio: 'Ticket médio acima de 70k',
    pagamentoVista: 'Pagamento à vista',
    leadProspeccao: 'Lead de prospecção',
    entrada50: '50% de entrada',
  },
  productBonus: {
    pesquisasAcima25k: { level1: 250, level2: 500, level3: 750, level4: 1000 },
    valuationAcima15k: { level1: 250, level2: 500, level3: 750, level4: 1000 },
    treinamentosAcima10k: { level1: 250, level2: 500, level3: 750, level4: 1000 },
    maisDe6Modulos: { level1: 250, level2: 500, level3: 750, level4: 1000 },
  },
  // Labels personalizados para os bônus de produto
  productBonusLabels: {
    pesquisasAcima25k: 'Pesquisas acima de 25k',
    valuationAcima15k: 'Valuation acima de 15k',
    treinamentosAcima10k: 'Treinamentos acima de 10k',
    maisDe6Modulos: 'Mais de 6 modular no mês',
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