import { z } from 'zod';
import { Department } from './okr.types';
import { parseLocalDate } from '../utils/date';

// ============================================
// ENUMS
// ============================================

export const SprintType = {
  WEEKLY: 'semanal',
  MONTHLY: 'mensal',
  QUARTERLY: 'trimestral',
  SEMI_ANNUAL: 'semestral',
  ANNUAL: 'anual',
} as const;

export const SprintStatus = {
  PLANNED: 'planejada',
  IN_PROGRESS: 'em andamento',
  COMPLETED: 'concluída',
  CANCELLED: 'cancelada',
} as const;

export const SprintScope = {
  EXECUTION: 'execucao',
  GOVERNANCE: 'governanca',
} as const;

export const SprintItemType = {
  INITIATIVE: 'iniciativa',
  IMPEDIMENT: 'impedimento',
  DECISION: 'decisão',
  ACTIVITY: 'atividade',
  MILESTONE: 'marco',
} as const;

export const SprintItemStatus = {
  PENDING: 'pendente',
  IN_PROGRESS: 'em andamento',
  COMPLETED: 'concluído',
} as const;

export const DecisionType = {
  OKR_ADJUSTMENT: 'ajuste_okr',
  PRIORITIZATION: 'priorizacao',
  RESOURCE_ALLOCATION: 'alocacao_recursos',
  CANCELLATION: 'cancelamento_pivot',
  STRATEGIC: 'estrategica',
  TACTICAL: 'tatica',
} as const;

export const DecisionStatus = {
  DECIDED: 'decidido',
  IN_EXECUTION: 'em_execucao',
  PAUSED: 'pausado',
  CANCELLED: 'cancelado',
  COMPLETED: 'concluido',
} as const;

export const ImpedimentStatus = {
  OPEN: 'aberto',
  BLOCKED: 'bloqueado',
  AT_RISK: 'em_risco',
  RESOLVED: 'resolvido',
} as const;

export const AttachmentType = {
  LINK: 'link',
  FILE: 'file',
} as const;

export const LinkType = {
  DRIVE: 'drive',
  NOTION: 'notion',
  FIGMA: 'figma',
  MIRO: 'miro',
  SHEETS: 'sheets',
  DOCS: 'docs',
  SLIDES: 'slides',
  YOUTUBE: 'youtube',
  LOOM: 'loom',
  OTHER: 'other',
} as const;

// ============================================
// ZOD SCHEMAS
// ============================================

export const sprintItemSchema = z.object({
  id: z.string().uuid().optional(),
  sprint_id: z.string().uuid().optional(),
  type: z.enum([
    SprintItemType.INITIATIVE,
    SprintItemType.IMPEDIMENT,
    SprintItemType.DECISION,
    SprintItemType.ACTIVITY,
    SprintItemType.MILESTONE,
  ]),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  responsible: z.string().optional(),
  responsible_user_id: z.string().uuid().nullable().optional(),
  status: z.enum([
    SprintItemStatus.PENDING,
    SprintItemStatus.IN_PROGRESS,
    SprintItemStatus.COMPLETED,
  ]),
  due_date: z.string().optional(),
  is_carry_over: z.boolean().optional(),
  carried_from_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().optional(),
  okr_id: z.string().uuid().nullable().optional(),
  kr_id: z.string().uuid().nullable().optional(),
  checkin_id: z.string().uuid().nullable().optional(), // ID do check-in que originou este item
  decision_type: z.enum([
    DecisionType.OKR_ADJUSTMENT,
    DecisionType.PRIORITIZATION,
    DecisionType.RESOURCE_ALLOCATION,
    DecisionType.CANCELLATION,
    DecisionType.STRATEGIC,
    DecisionType.TACTICAL,
  ]).optional(),
  decision_status: z.enum([
    DecisionStatus.DECIDED,
    DecisionStatus.IN_EXECUTION,
    DecisionStatus.PAUSED,
    DecisionStatus.CANCELLED,
    DecisionStatus.COMPLETED,
  ]).optional(),
  decision_impact: z.string().optional(),
  decision_deadline: z.string().optional(),
  impediment_status: z.enum([
    ImpedimentStatus.OPEN,
    ImpedimentStatus.BLOCKED,
    ImpedimentStatus.AT_RISK,
    ImpedimentStatus.RESOLVED,
  ]).optional(),
  created_at: z.string().optional(),
});

export const sprintSchema = z.object({
  id: z.string().uuid().optional(),
  okr_id: z.string().uuid().nullable().optional(),
  responsible: z.string().optional(),
  responsible_user_id: z.string().uuid().nullable().optional(),
  type: z.enum([
    SprintType.WEEKLY,
    SprintType.MONTHLY,
    SprintType.QUARTERLY,
    SprintType.SEMI_ANNUAL,
    SprintType.ANNUAL
  ]),
  scope: z.enum([
    SprintScope.EXECUTION,
    SprintScope.GOVERNANCE,
  ]).optional(),
  department: z.enum([
    Department.GENERAL,
    Department.COMMERCIAL,
    Department.MARKETING,
    Department.PROJECTS,
  ]),
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  description: z.string().optional(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Data de início inválida',
  }),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Data de término inválida',
  }).nullable().optional(), // Permite sprints contínuas (sem data fim)
  status: z.enum([
    SprintStatus.PLANNED,
    SprintStatus.IN_PROGRESS,
    SprintStatus.COMPLETED,
    SprintStatus.CANCELLED,
  ]),
  parent_id: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  deleted_at: z.string().optional(),
  deleted_by: z.string().uuid().optional(),
  deleted_reason: z.string().optional(),
  items: z.array(sprintItemSchema).optional(),
}).refine(
  (data) => {
    // Só validar se end_date existir (sprints contínuas não têm end_date)
    if (!data.end_date) return true;
    const start = parseLocalDate(data.start_date);
    const end = parseLocalDate(data.end_date);
    return start <= end;
  },
  {
    message: 'Data de início deve ser anterior à data de término',
    path: ['end_date'],
  }
);

export const krCheckinSchema = z.object({
  id: z.string().uuid().optional(),
  sprint_id: z.string().uuid(),
  kr_id: z.string().uuid(),
  value: z.number(),
  previous_value: z.number().optional(),
  comment: z.string().optional(),
  created_at: z.string().optional(),
});

// Projetos
export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  okr_id: z.string().uuid().nullable().optional(),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  owner: z.string().optional(),
  status: z.enum(['ativo', 'pausado', 'concluído', 'cancelado']).optional(),
  priority: z.enum(['baixa', 'média', 'alta', 'crítica']).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Project = z.infer<typeof projectSchema>;

// Schema para anexos da sprint
export const sprintAttachmentSchema = z.object({
  id: z.string().uuid().optional(),
  sprint_id: z.string().uuid(),
  type: z.enum([AttachmentType.LINK, AttachmentType.FILE]),
  
  // Para links externos
  url: z.string().url().optional(),
  link_type: z.enum([
    LinkType.DRIVE,
    LinkType.NOTION,
    LinkType.FIGMA,
    LinkType.MIRO,
    LinkType.SHEETS,
    LinkType.DOCS,
    LinkType.SLIDES,
    LinkType.YOUTUBE,
    LinkType.LOOM,
    LinkType.OTHER,
  ]).optional(),
  
  // Para arquivos uploadados
  file_name: z.string().optional(),
  file_path: z.string().optional(),
  file_size: z.number().optional(),
  file_type: z.string().optional(),
  
  // Metadados comuns
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  
  // Histórico
  created_by: z.string().optional(),
  created_at: z.string().optional(),
});

// ============================================
// TYPESCRIPT TYPES
// ============================================

export type SprintType = typeof SprintType[keyof typeof SprintType];
export type SprintStatus = typeof SprintStatus[keyof typeof SprintStatus];
export type SprintScope = typeof SprintScope[keyof typeof SprintScope];
export type SprintItemType = typeof SprintItemType[keyof typeof SprintItemType];
export type SprintItemStatus = typeof SprintItemStatus[keyof typeof SprintItemStatus];
export type DecisionType = typeof DecisionType[keyof typeof DecisionType];
export type DecisionStatus = typeof DecisionStatus[keyof typeof DecisionStatus];
export type ImpedimentStatus = typeof ImpedimentStatus[keyof typeof ImpedimentStatus];
export type AttachmentType = typeof AttachmentType[keyof typeof AttachmentType];
export type LinkType = typeof LinkType[keyof typeof LinkType];

export type SprintItem = z.infer<typeof sprintItemSchema>;
export type Sprint = z.infer<typeof sprintSchema>;
export type KRCheckin = z.infer<typeof krCheckinSchema>;
export type SprintAttachment = z.infer<typeof sprintAttachmentSchema>;

export interface SprintItemSuggestion {
  id: string;
  sprint_id: string;
  checkin_id: string;
  type: SprintItemType;
  title: string;
  status?: SprintItemStatus | string | null;
  source_field?: string | null;
  suggested_action: 'create' | 'update';
  existing_item_id?: string | null;
  applied_item_id?: string | null;
  match_confidence?: number | null;
  suggestion_reason?: string | null;
  suggested_description?: string | null;
  suggestion_status: 'pending' | 'accepted' | 'rejected';
  decided_at?: string | null;
  decided_by?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// HELPER TYPES
// ============================================

export interface SprintWithItems extends Sprint {
  items: SprintItem[];
  okr_title?: string;
  okr_ids?: string[]; // Para seleção múltipla
  okrs?: { id: string; title: string }[]; // Joined data
  checkins?: KRCheckin[];
}

export interface SprintMetrics {
  total: number;
  planned: number;
  in_progress: number;
  completed: number;
}

export interface SprintItemMetrics {
  initiatives: number;
  impediments: number;
  decisions: number;
  activities: number;
  milestones: number;
  completed: number;
  pending: number;
}

export interface SprintFilters {
  type?: SprintType;
  department?: Department;
  status?: SprintStatus;
  search?: string;
  visibilityDepartment?: string;
  visibilityOkrIds?: string[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getSprintStatusColor(status: SprintStatus): string {
  switch (status) {
    case SprintStatus.PLANNED:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case SprintStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case SprintStatus.COMPLETED:
      return 'bg-green-100 text-green-800 border-green-200';
    case SprintStatus.CANCELLED:
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getSprintTypeColor(type: SprintType): string {
  switch (type) {
    case SprintType.WEEKLY:
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case SprintType.MONTHLY:
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case SprintType.QUARTERLY:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case SprintType.SEMI_ANNUAL:
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case SprintType.ANNUAL:
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getSprintItemTypeColor(type: SprintItemType): string {
  switch (type) {
    case SprintItemType.INITIATIVE:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case SprintItemType.IMPEDIMENT:
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case SprintItemType.DECISION:
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case SprintItemType.ACTIVITY:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case SprintItemType.MILESTONE:
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getSprintItemStatusColor(status: SprintItemStatus): string {
  switch (status) {
    case SprintItemStatus.PENDING:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case SprintItemStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case SprintItemStatus.COMPLETED:
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getSprintTypeLabel(type: SprintType): string {
  const labels: Record<SprintType, string> = {
    [SprintType.WEEKLY]: 'Semanal',
    [SprintType.MONTHLY]: 'Mensal',
    [SprintType.QUARTERLY]: 'Trimestral',
    [SprintType.SEMI_ANNUAL]: 'Semestral',
    [SprintType.ANNUAL]: 'Anual',
  };
  return labels[type];
}

export function getSprintScopeLabel(scope?: SprintScope): string {
  if (!scope) return 'Execução'; // Default para sprints antigas
  const labels: Record<SprintScope, string> = {
    [SprintScope.EXECUTION]: 'Execução',
    [SprintScope.GOVERNANCE]: 'Governança',
  };
  return labels[scope];
}

export function getSprintScopeColor(scope?: SprintScope): string {
  if (!scope) return 'bg-blue-100 text-blue-800 border-blue-200'; // Default
  switch (scope) {
    case SprintScope.EXECUTION:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case SprintScope.GOVERNANCE:
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getSprintScopeIcon(scope?: SprintScope): string {
  if (!scope) return '⚡'; // Default
  switch (scope) {
    case SprintScope.EXECUTION:
      return '⚡';
    case SprintScope.GOVERNANCE:
      return '🎯';
    default:
      return '📋';
  }
}

export function getSprintScopeDescription(scope?: SprintScope): string {
  if (!scope) return 'Foco em entregas e execução de iniciativas'; // Default
  const descriptions: Record<SprintScope, string> = {
    [SprintScope.EXECUTION]: 'Foco em entregas e execução de iniciativas',
    [SprintScope.GOVERNANCE]: 'Revisão estratégica e tomada de decisões',
  };
  return descriptions[scope];
}

export function getSprintItemTypeLabel(type: SprintItemType): string {
  const labels: Record<SprintItemType, string> = {
    [SprintItemType.INITIATIVE]: 'Iniciativa',
    [SprintItemType.IMPEDIMENT]: 'Impedimento',
    [SprintItemType.DECISION]: 'Decisão',
    [SprintItemType.ACTIVITY]: 'Atividade',
    [SprintItemType.MILESTONE]: 'Marco',
  };
  return labels[type];
}

export function getDecisionTypeLabel(type?: DecisionType): string {
  if (!type) return '—';
  const labels: Record<DecisionType, string> = {
    [DecisionType.OKR_ADJUSTMENT]: 'Ajuste de OKR',
    [DecisionType.PRIORITIZATION]: 'Priorização',
    [DecisionType.RESOURCE_ALLOCATION]: 'Alocação de Recursos',
    [DecisionType.CANCELLATION]: 'Cancelamento/Pivot',
    [DecisionType.STRATEGIC]: 'Estratégica',
    [DecisionType.TACTICAL]: 'Tática',
  };
  return labels[type];
}

export function getDecisionStatusLabel(status?: DecisionStatus): string {
  if (!status) return 'Decidido';
  const labels: Record<DecisionStatus, string> = {
    [DecisionStatus.DECIDED]: 'Decidido',
    [DecisionStatus.IN_EXECUTION]: 'Em Execução',
    [DecisionStatus.PAUSED]: 'Pausado',
    [DecisionStatus.CANCELLED]: 'Cancelado',
    [DecisionStatus.COMPLETED]: 'Concluído',
  };
  return labels[status];
}

export function getDecisionStatusColor(status?: DecisionStatus): string {
  if (!status) return 'bg-blue-100 text-blue-800 border-blue-200';
  switch (status) {
    case DecisionStatus.DECIDED:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case DecisionStatus.IN_EXECUTION:
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case DecisionStatus.PAUSED:
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case DecisionStatus.CANCELLED:
      return 'bg-slate-100 text-slate-800 border-slate-200';
    case DecisionStatus.COMPLETED:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getImpedimentStatusLabel(status?: ImpedimentStatus): string {
  if (!status) return 'Aberto';
  const labels: Record<ImpedimentStatus, string> = {
    [ImpedimentStatus.OPEN]: 'Aberto',
    [ImpedimentStatus.BLOCKED]: 'Bloqueado',
    [ImpedimentStatus.AT_RISK]: 'Em Risco',
    [ImpedimentStatus.RESOLVED]: 'Resolvido',
  };
  return labels[status];
}

export function getImpedimentStatusColor(status?: ImpedimentStatus): string {
  if (!status) return 'bg-slate-100 text-slate-800 border-slate-200';
  switch (status) {
    case ImpedimentStatus.OPEN:
      return 'bg-slate-100 text-slate-800 border-slate-200';
    case ImpedimentStatus.BLOCKED:
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case ImpedimentStatus.AT_RISK:
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case ImpedimentStatus.RESOLVED:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function calculateSprintProgress(sprint: SprintWithItems): number {
  if (!sprint.items || sprint.items.length === 0) return 0;

  const completed = sprint.items.filter(
    (item) => item.status === SprintItemStatus.COMPLETED
  ).length;

  return Math.round((completed / sprint.items.length) * 100);
}

export function getSprintItemsByType(items: SprintItem[]): Record<SprintItemType, SprintItem[]> {
  return {
    [SprintItemType.INITIATIVE]: items.filter(i => i.type === SprintItemType.INITIATIVE),
    [SprintItemType.IMPEDIMENT]: items.filter(i => i.type === SprintItemType.IMPEDIMENT),
    [SprintItemType.DECISION]: items.filter(i => i.type === SprintItemType.DECISION),
    [SprintItemType.ACTIVITY]: items.filter(i => i.type === SprintItemType.ACTIVITY),
    [SprintItemType.MILESTONE]: items.filter(i => i.type === SprintItemType.MILESTONE),
  };
}

export function isSprintActive(sprint: Sprint): boolean {
  const today = new Date();
  const start = parseLocalDate(sprint.start_date);
  // Sprints contínuas (sem end_date) são sempre ativas após o início
  if (!sprint.end_date) {
    return start <= today;
  }
  const end = parseLocalDate(sprint.end_date);
  return start <= today && today <= end;
}

export function formatDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateRange(startDate: string, endDate: string | null | undefined): string {
  if (!endDate) {
    return `${formatDate(startDate)} - ∞ Contínua`;
  }
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

