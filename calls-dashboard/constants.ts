import { CallItem, ScorecardDefinition, SdrUser } from './types';

export const SDRS: SdrUser[] = [
  { id: 'sdr1', name: 'Carla Dias', avatarUrl: 'https://i.pravatar.cc/64?img=1' },
  { id: 'sdr2', name: 'Ana Silva', avatarUrl: 'https://i.pravatar.cc/64?img=2' },
  { id: 'sdr3', name: 'Bruno Costa', avatarUrl: 'https://i.pravatar.cc/64?img=3' },
  { id: 'sdr4', name: 'Daniel Alves', avatarUrl: 'https://i.pravatar.cc/64?img=4' },
];

export const CALLS: CallItem[] = [
  {
    id: 'call-7484',
    company: 'Future Systems',
    dealCode: 'DEAL-7484',
    sdr: SDRS[0],
    date: new Date().toISOString(),
    durationSec: 210,
    status: 'answered',
  },
  {
    id: 'call-7483',
    company: 'Nexus Digital',
    dealCode: 'DEAL-7483',
    sdr: SDRS[2],
    date: new Date().toISOString(),
    durationSec: 450,
    status: 'analyzed',
    score: 78,
  },
  {
    id: 'call-7482',
    company: 'Inovatech Soluções',
    dealCode: 'DEAL-7482',
    sdr: SDRS[1],
    date: new Date().toISOString(),
    durationSec: 320,
    status: 'analyzed',
    score: 92,
  },
  {
    id: 'call-7486',
    company: 'Inovatech Soluções',
    dealCode: 'DEAL-7486',
    sdr: SDRS[1],
    date: new Date(Date.now() - 24*3600*1000).toISOString(),
    durationSec: 180,
    status: 'missed',
  },
  {
    id: 'call-7485',
    company: 'Alpha Builders',
    dealCode: 'DEAL-7485',
    sdr: SDRS[3],
    date: new Date(Date.now() - 24*3600*1000).toISOString(),
    durationSec: 600,
    status: 'analyzed',
    score: 65,
  },
  {
    id: 'call-7487',
    company: 'QuantumLeap Tech',
    dealCode: 'DEAL-7487',
    sdr: SDRS[2],
    date: new Date(Date.now() - 2*24*3600*1000).toISOString(),
    durationSec: 512,
    status: 'analyzed',
    score: 88,
  },
  {
    id: 'call-7488',
    company: 'Vertex Group',
    dealCode: 'DEAL-7488',
    sdr: SDRS[0],
    date: new Date(Date.now() - 2*24*3600*1000).toISOString(),
    durationSec: 330,
    status: 'analyzed',
    score: 95,
  },
  {
    id: 'call-7489',
    company: 'Nexus Digital',
    dealCode: 'DEAL-7489',
    sdr: SDRS[1],
    date: new Date(Date.now() - 3*24*3600*1000).toISOString(),
    durationSec: 245,
    status: 'analyzed',
    score: 81,
  },
];

export const SCORECARDS: ScorecardDefinition[] = [
  {
    id: 'sc-1',
    name: 'Diagnóstico Comercial [Consultoria em Vendas]',
    conversationType: '[GGV] - Reunião de Diagnóstico',
    updatedAt: new Date().toISOString(),
    active: false,
    criteria: [
      { id: 'c1', name: 'Abertura e Rapport', description: 'Apresentação correta e conexão inicial.', weight: 15 },
      { id: 'c2', name: 'Qualificação (BANT)', description: 'Investigou Budget, Autoridade, Necessidade, Timing.', weight: 30 },
      { id: 'c3', name: 'Apresentação do Valor', description: 'Conectou dores do prospect à solução.', weight: 25 },
      { id: 'c4', name: 'Contorno de Objeções', description: 'Lidou com objeções de forma consultiva.', weight: 20 },
      { id: 'c5', name: 'Próximos Passos e Fechamento', description: 'Definiu próximos passos e encerramento.', weight: 10 },
    ],
  },
  {
    id: 'sc-2',
    name: 'Ligação [Consultoria em Vendas]',
    conversationType: '[GGV] - Ligação',
    updatedAt: new Date(Date.now() - 3*24*3600*1000).toISOString(),
    active: false,
    criteria: [
      { id: 'c1', name: 'Abertura', description: 'Início da chamada', weight: 20 },
      { id: 'c2', name: 'Objetivo', description: 'Definiu objetivo', weight: 30 },
      { id: 'c3', name: 'Valor', description: 'Apresentou valor', weight: 30 },
      { id: 'c4', name: 'Encerramento', description: 'Encerramento claro', weight: 20 },
    ],
  },
  {
    id: 'sc-3',
    name: 'Proposta Comercial [Consultoria em Vendas]',
    conversationType: '[GGV] - Reunião de Proposta',
    updatedAt: new Date(Date.now() - 18*24*3600*1000).toISOString(),
    active: false,
    criteria: [
      { id: 'c1', name: 'Necessidades', description: 'Refletiu necessidades', weight: 25 },
      { id: 'c2', name: 'Proposta', description: 'Proposta adequada', weight: 35 },
      { id: 'c3', name: 'Objeções', description: 'Tratou objeções', weight: 25 },
      { id: 'c4', name: 'Próximos Passos', description: 'Alinhou próximos passos', weight: 15 },
    ],
  },
];

export const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric'
});

export const TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit', minute: '2-digit'
});

export function secondsToHuman(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}


