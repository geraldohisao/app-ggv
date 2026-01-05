import { TalentState } from '../types/ggv-talent';

export const ggvTalentMock: TalentState = {
  currentCycle: '2025-H1',
  users: [
    { id: 'u1', name: 'Ana Souza', email: 'ana@ggv.com', role: 'LEADER', position: 'Head de Vendas', team: 'Comercial' },
    { id: 'u2', name: 'Bruno Lima', email: 'bruno@ggv.com', role: 'COLLAB', position: 'SDR', leaderId: 'u1', team: 'Outbound' },
    { id: 'u3', name: 'Camila Rocha', email: 'camila@ggv.com', role: 'COLLAB', position: 'Closer', leaderId: 'u1', team: 'Mid-market' },
    { id: 'u4', name: 'Daniel Alves', email: 'daniel@ggv.com', role: 'HR', position: 'People Partner', team: 'RH' },
  ],
  pdis: [
    {
      id: 'pdi-1',
      userId: 'u2',
      cycle: '2025-H1',
      diagnostic: 'SDR em ramp-up com boa cadência, precisa evoluir em discovery e qualificação.',
      status: 'IN_PROGRESS',
      objectives: [
        {
          id: 'obj-1',
          title: 'Aumentar taxa de reuniões qualificadas',
          keyResults: [
            { id: 'kr-1', text: 'Taxa de qualificação > 35%', done: false },
            { id: 'kr-2', text: '30 reuniões/mês', done: false },
            { id: 'kr-3', text: 'NPS de reuniões >= 8', done: false },
          ],
          progress: 45,
        },
        {
          id: 'obj-2',
          title: 'Melhorar velocidade de follow-up',
          keyResults: [
            { id: 'kr-4', text: 'Responder leads em < 15min', done: false },
            { id: 'kr-5', text: 'Sequência com 6 toques em 7 dias', done: true },
          ],
          progress: 60,
        },
      ],
      developmentPlan: [
        { id: 'dev-1', type: 'SOFT', title: 'Treinamento de escuta ativa', owner: 'Ana Souza', status: 'IN_PROGRESS', dueDate: '2025-02-15' },
        { id: 'dev-2', type: 'HARD', title: 'Shadow com Closer sênior', owner: 'Ana Souza', status: 'NOT_STARTED', dueDate: '2025-03-01' },
      ],
      progress: 0,
      history: ['PDI criado em 2025-01-05', 'Revisão com gestor em 2025-01-20'],
    },
    {
      id: 'pdi-2',
      userId: 'u3',
      cycle: '2025-H1',
      diagnostic: 'Closer consistente, oportunidade de evoluir em negociação avançada e multi-threading.',
      status: 'REVIEW',
      objectives: [
        {
          id: 'obj-3',
          title: 'Elevar win rate em mid-market',
          keyResults: [
            { id: 'kr-6', text: 'Win rate > 28%', done: false },
            { id: 'kr-7', text: 'Ticket médio > R$ 40k', done: false },
            { id: 'kr-8', text: 'Reduzir ciclo em 10%', done: false },
          ],
          progress: 35,
        },
      ],
      developmentPlan: [
        { id: 'dev-3', type: 'HARD', title: 'Curso de negociação complexa', owner: 'RH', status: 'NOT_STARTED', dueDate: '2025-02-28' },
        { id: 'dev-4', type: 'SOFT', title: 'Mentoria com Head de CS', owner: 'Daniel Alves', status: 'NOT_STARTED', dueDate: '2025-03-10' },
      ],
      progress: 0,
    },
  ],
  tasks: [
    { id: 't1', userId: 'u2', title: 'Revisar scripts de qualificação', status: 'IN_PROGRESS', pdiId: 'pdi-1', dueDate: '2025-02-05', lane: 'doing' },
    { id: 't2', userId: 'u2', title: 'Aplicar novo playbook em 20 leads', status: 'NOT_STARTED', pdiId: 'pdi-1', dueDate: '2025-02-12', lane: 'backlog' },
    { id: 't3', userId: 'u3', title: 'Workshop de negociação avançada', status: 'LATE', pdiId: 'pdi-2', dueDate: '2025-01-30', lane: 'late' },
    { id: 't4', userId: 'u3', title: 'Checklist multi-threading', status: 'IN_PROGRESS', pdiId: 'pdi-2', dueDate: '2025-02-18', lane: 'doing' },
  ],
  assessments: [
    { id: 'a1', userId: 'u2', period: '2025-01', technicalScore: 34, behavioralScore: 38, totalScore: 72, comments: 'Boa execução, melhorar preparação', assessedBy: 'u1' },
    { id: 'a2', userId: 'u3', period: '2025-01', technicalScore: 42, behavioralScore: 45, totalScore: 87, comments: 'Referência do time, atenção a prazos', assessedBy: 'u1' },
  ],
  checkIns: [
    {
      id: 'c1',
      userId: 'u2',
      leaderId: 'u1',
      date: '2025-01-25',
      advances: 'Melhorou taxa de resposta',
      blocks: 'Agenda cheia em terças',
      motivationScore: 8,
      emotionalState: 'Médio',
      indicators: '23 reuniões, 18 follow-ups, 4 SQLs',
      tasksReview: 'Script atualizado, 1 playbook pendente',
      planNext15: 'Rodar 30 novos leads no fluxo ajustado e medir resposta',
    },
    {
      id: 'c2',
      userId: 'u3',
      leaderId: 'u1',
      date: '2025-01-28',
      advances: 'Fechou 2 deals mid-market',
      blocks: 'Dependência de CS em propostas',
      motivationScore: 9,
      emotionalState: 'Alto',
      indicators: '8 demos, win rate 26%',
      tasksReview: 'Propostas revisadas com CS',
      planNext15: 'Criar biblioteca de objeções e testar em 10 deals',
    },
  ],
  alignments: [
    { id: 'al1', userId: 'u2', leaderId: 'u1', date: '2025-01-10', topic: 'Rota de cadência', category: 'Processo', criticality: 'MEDIUM', notes: 'Ajustar horários de follow-up' },
    { id: 'al2', userId: 'u3', leaderId: 'u1', date: '2025-01-18', topic: 'Negociação em comitê', category: 'Estratégico', criticality: 'HIGH', notes: 'Trazer múltiplos stakeholders cedo' },
  ],
  feedbacks: [
    { id: 'f1', userId: 'u2', fromUserId: 'u1', type: 'MANAGER', date: '2025-01-20', content: 'Bom ritmo, focar em discovery profundo' },
    { id: 'f2', userId: 'u3', fromUserId: 'u1', type: 'MANAGER', date: '2025-01-22', content: 'Excelente condução, atenção ao prazo de propostas' },
  ],
  surveyAnalysis: {
    id: 'sa1',
    surveyId: 'survey-2025-h1',
    createdAt: '2025-01-15',
    summary: 'Clima positivo com atenção a carga de trabalho em pré-vendas.',
    kpis: { participantes: 32, escuta: 78, climaGeral: 74 },
    sentimentDistribution: { positive: 62, neutral: 24, negative: 14 },
    strengths: ['Gestores próximos', 'Treinamentos frequentes', 'Comunicação clara'],
    weaknesses: ['Sobrecarga em sprints', 'Processo de feedback demorado'],
    quotes: [
      'Sinto que minha liderança acompanha de perto.',
      'Precisamos de mais apoio em automações de prospecção.',
      'O ritmo está puxado em final de mês.',
    ],
    recommendations: ['Revisar capacidade do time de SDR', 'Rodar piloto de automações', 'Simplificar fluxo de feedback'],
  },
  nineBox: [
    { id: 'n1', userId: 'u2', cycle: '2025-H1', performanceScore: 2, potentialScore: 3, quadrant: '2x3 – Talento em evolução' },
    { id: 'n2', userId: 'u3', cycle: '2025-H1', performanceScore: 3, potentialScore: 3, quadrant: '3x3 – Top Talent' },
  ],
};

