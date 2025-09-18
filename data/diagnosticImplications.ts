import { DiagnosticArea } from '../types';

export interface DiagnosticImplication {
    area: DiagnosticArea;
    title: string;
    category?: string; // Nova categoria para exibição
    implication: string;
    excellentComment: string; // Para casos de 100%
    expectedImpact: string; // Impacto esperado
}

export const DIAGNOSTIC_IMPLICATIONS: Record<DiagnosticArea, DiagnosticImplication> = {
    "Processos": {
        area: "Processos",
        title: "Mapeamento de Processos",
        category: "Padronização",
        implication: "Sem processos definidos, vendedores operam no automático, gerando inconsistência e dificultando a integração de novos membros.",
        excellentComment: "Excelente! Processos bem mapeados garantem consistência. Para crescer ainda mais, considere automatizar etapas repetitivas e criar métricas de eficiência por processo.",
        expectedImpact: "Aumento da eficiência e previsibilidade do processo de vendas"
    },
    "Tecnologia": {
        area: "Tecnologia", 
        title: "CRM",
        category: "Tecnologia",
        implication: "Sem CRM estruturado, perde-se o controle das ações comerciais, dificultando a gestão da produtividade e previsibilidade de vendas.",
        excellentComment: "Ótimo! CRM bem implementado oferece controle total. Para maximizar resultados, explore automações avançadas e integre com ferramentas de marketing.",
        expectedImpact: "Melhoria na gestão da produtividade e previsibilidade de vendas"
    },
    "Padronização": {
        area: "Padronização",
        title: "Script Comercial", 
        category: "Abordagem",
        implication: "A falta de um script estruturado leva à improvisação e queda na conversão. O script deve guiar a dor do cliente, não robotizar o vendedor.",
        excellentComment: "Perfeito! Script bem estruturado garante consistência. Para evoluir, desenvolva variações para diferentes perfis de cliente e situações específicas.",
        expectedImpact: "Aumento nas taxas de conversão e padronização da abordagem"
    },
    "Pessoas": {
        area: "Pessoas",
        title: "Teste de Perfil Comportamental",
        category: "Pessoas",
        implication: "Sem conhecer o próprio perfil comportamental, o vendedor não consegue se adaptar ao perfil do cliente, perdendo conexão e comprometendo as conversões.",
        excellentComment: "Excelente! Conhecer o perfil comportamental maximiza a empatia. Para aprimorar, implemente treinamentos contínuos de adaptação de abordagem.",
        expectedImpact: "Melhoria na empatia e personalização do atendimento"
    },
    "Gestão": {
        area: "Gestão",
        title: "Plano de Metas e Comissionamento", 
        category: "Gestão",
        implication: "Sem metas claras e comissionamento bem estruturado, o vendedor trabalha sem direção, impactando diretamente a performance e previsibilidade.",
        excellentComment: "Muito bom! Plano estruturado motiva a equipe. Para otimizar, considere metas escalonadas e bonificações por performance excepcional.",
        expectedImpact: "Aumento da motivação e direcionamento da equipe de vendas"
    },
    "Monitoramento": {
        area: "Monitoramento",
        title: "Indicadores Comerciais",
        category: "Monitoramento",
        implication: "Sem indicadores bem definidos e rituais de acompanhamento, é como pilotar um avião sem painel. Decisões passam a ser feitas por intuição e não por dados.",
        excellentComment: "Excelente! Indicadores bem definidos garantem decisões assertivas. Para evoluir, implemente dashboards em tempo real e alertas automáticos.",
        expectedImpact: "Decisões mais assertivas baseadas em dados concretos"
    },
    "Desenvolvimento": {
        area: "Desenvolvimento", 
        title: "Treinamentos Periódicos",
        category: "Desenvolvimento",
        implication: "O vendedor pode dominar o produto, mas sem reciclagem de técnicas de vendas ele se limita a tirar pedidos.",
        excellentComment: "Ótimo! Treinamentos regulares mantêm a equipe afiada. Para maximizar, personalize conteúdos por nível de experiência e performance individual.",
        expectedImpact: "Evolução contínua das técnicas e habilidades de vendas"
    },
    "Relacionamento": {
        area: "Relacionamento",
        title: "Ações de Pós-venda", 
        category: "Relacionamento",
        implication: "Pós-venda não é suporte técnico — é estratégia de retenção e expansão. Deixar isso com o vendedor é desperdiçar oportunidade de gerar novas vendas.",
        excellentComment: "Perfeito! Pós-venda estruturado gera expansão. Para potencializar, implemente programas de upsell automático e pesquisas de satisfação regulares.",
        expectedImpact: "Aumento da retenção de clientes e oportunidades de expansão"
    },
    "Prospecção": {
        area: "Prospecção",
        title: "Prospecção Ativa",
        category: "Prospecção",
        implication: "Sem canal ativo de geração de demanda, a empresa fica refém do mercado e da base atual, perdendo previsibilidade de crescimento.",
        excellentComment: "Excelente! Prospecção ativa garante pipeline saudável. Para escalar, implemente automação de sequências e segmentação avançada de prospects.",
        expectedImpact: "Maior previsibilidade de crescimento e pipeline constante"
    }
};

/**
 * Função para obter a implicação de uma área específica
 */
export const getAreaImplication = (area: DiagnosticArea): DiagnosticImplication => {
    return DIAGNOSTIC_IMPLICATIONS[area];
};

/**
 * Função para obter o comentário de pontos de atenção baseado na pontuação
 */
export const getAttentionPoints = (score: number, maxScore: number, area: DiagnosticArea): string => {
    const percentage = (score / maxScore) * 100;
    const implication = DIAGNOSTIC_IMPLICATIONS[area];
    
    if (percentage === 100) {
        return implication.excellentComment;
    } else {
        return implication.implication;
    }
};
