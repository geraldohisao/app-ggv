import type { DiagnosticArea } from '../types';

export type QuestionOption = {
    text: string;
    description: string;
    score: number;
};

export type DiagnosticQuestion = {
    id: number;
    text: string;
    highlight: string;
    area: DiagnosticArea;
    options: QuestionOption[];
    importance: string;
};

export const diagnosticQuestions: DiagnosticQuestion[] = [
    {
        id: 1,
        text: "Você já realizou o mapeamento de processos da área comercial?",
        highlight: "mapeamento de processos",
        area: "Processos",
        options: [
            { text: "Sim", description: "Processos totalmente mapeados e documentados", score: 10 },
            { text: "Parcialmente", description: "Alguns processos mapeados, mas não todos", score: 5 },
            { text: "Não", description: "Nenhum processo comercial foi mapeado", score: 0 },
        ],
        importance: "O mapeamento de processos é fundamental para identificar gargalos, padronizar atividades e garantir previsibilidade nos resultados comerciais.",
    },
    {
        id: 2,
        text: "Você utiliza algum sistema de CRM?",
        highlight: "CRM",
        area: "Tecnologia",
        options: [
            { text: "Sim", description: "CRM implementado e utilizado pela equipe", score: 10 },
            { text: "Parcialmente", description: "Tem CRM mas não é usado consistentemente", score: 5 },
            { text: "Não", description: "Não utiliza sistema de CRM", score: 0 },
        ],
        importance: "Um CRM bem implementado é essencial para organizar leads, acompanhar oportunidades e manter histórico de interações com clientes.",
    },
    {
        id: 3,
        text: "Você tem um script comercial redigido e seguido pelo seu time de vendas?",
        highlight: "script comercial",
        area: "Padronização",
        options: [
            { text: "Sim", description: "Script definido e seguido por toda equipe", score: 10 },
            { text: "Parcialmente", description: "Script existe, mas não é seguido por todos", score: 5 },
            { text: "Não", description: "Não existe script comercial definido", score: 0 },
        ],
        importance: "Um script comercial garante a padronização da comunicação, alinha o discurso da equipe e aumenta as taxas de conversão.",
    },
    {
        id: 4,
        text: "Seu time de vendas já realizou algum teste de perfil comportamental?",
        highlight: "perfil comportamental",
        area: "Pessoas",
        options: [
            { text: "Sim", description: "Toda equipe passou por avaliação comportamental", score: 10 },
            { text: "Parcialmente", description: "Apenas alguns membros foram avaliados", score: 5 },
            { text: "Não", description: "Nenhuma avaliação comportamental foi feita", score: 0 },
        ],
        importance: "Conhecer o perfil comportamental da equipe permite melhor distribuição de funções e desenvolvimento personalizado de cada vendedor.",
    },
    {
        id: 5,
        text: "Você tem um plano de metas e comissionamento para o setor comercial?",
        highlight: "metas e comissionamento",
        area: "Gestão",
        options: [
            { text: "Sim", description: "Plano estruturado de metas e comissões", score: 10 },
            { text: "Parcialmente", description: "Tem metas mas sem plano de comissionamento claro", score: 5 },
            { text: "Não", description: "Não possui plano estruturado", score: 0 },
        ],
        importance: "Metas claras e sistema de comissionamento justo motivam a equipe e direcionam esforços para os resultados desejados.",
    },
    {
        id: 6,
        text: "A área de vendas realiza reuniões semanais para verificar indicadores comerciais?",
        highlight: "indicadores",
        area: "Monitoramento",
        options: [
            { text: "Sim", description: "Reuniões semanais regulares com análise de KPIs", score: 10 },
            { text: "Às vezes", description: "Reuniões esporádicas ou mensais", score: 5 },
            { text: "Não", description: "Não há reuniões regulares de acompanhamento", score: 0 },
        ],
        importance: "Reuniões regulares de acompanhamento permitem ajustes rápidos na estratégia e mantêm a equipe focada nos resultados.",
    },
    {
        id: 7,
        text: "Você realiza treinamentos periódicos para seu time de vendas?",
        highlight: "treinamentos",
        area: "Desenvolvimento",
        options: [
            { text: "Sim", description: "Treinamentos regulares e estruturados", score: 10 },
            { text: "Às vezes", description: "Treinamentos esporádicos", score: 5 },
            { text: "Não", description: "Não oferece treinamentos regulares", score: 0 },
        ],
        importance: "Treinamentos contínuos mantêm a equipe atualizada, melhoram técnicas de vendas e aumentam a performance geral.",
    },
    {
        id: 8,
        text: "Você realiza alguma ação de pós-venda com os seus clientes?",
        highlight: "pós-venda",
        area: "Relacionamento",
        options: [
            { text: "Sim", description: "Programa estruturado de pós-venda", score: 10 },
            { text: "Às vezes", description: "Ações pontuais de pós-venda", score: 5 },
            { text: "Não", description: "Não há ações de pós-venda", score: 0 },
        ],
        importance: "Ações de pós-venda aumentam a satisfação do cliente, geram indicações e criam oportunidades de vendas recorrentes.",
    },
    {
        id: 9,
        text: "Você realiza algum tipo de prospecção ativa com os seus clientes?",
        highlight: "prospecção",
        area: "Prospecção",
        options: [
            { text: "Sim", description: "Prospecção ativa estruturada e regular", score: 10 },
            { text: "Parcialmente", description: "Prospecção esporádica ou não estruturada", score: 5 },
            { text: "Não", description: "Não faz prospecção ativa", score: 0 },
        ],
        importance: "Prospecção ativa garante fluxo constante de novos leads e reduz a dependência de marketing passivo.",
    },
];