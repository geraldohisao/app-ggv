import { z } from 'zod';
import { parseLocalDate } from '../utils/date';

// ============================================
// ENUMS
// ============================================

export const OKRLevel = {
  STRATEGIC: 'estratégico',
  SECTORAL: 'setorial',
} as const;

export const Department = {
  GENERAL: 'geral',
  COMMERCIAL: 'comercial',
  MARKETING: 'marketing',
  PROJECTS: 'projetos',
} as const;

export const OKRStatus = {
  NOT_STARTED: 'não iniciado',
  IN_PROGRESS: 'em andamento',
  COMPLETED: 'concluído',
} as const;

export const Periodicity = {
  MONTHLY: 'mensal',
  QUARTERLY: 'trimestral',
} as const;

export const KeyResultStatus = {
  GREEN: 'verde',
  YELLOW: 'amarelo',
  RED: 'vermelho',
} as const;

export const KeyResultType = {
  NUMERIC: 'numeric',
  PERCENTAGE: 'percentage',
  CURRENCY: 'currency',
  ACTIVITY: 'activity',
} as const;

export const KeyResultDirection = {
  INCREASE: 'increase',
  DECREASE: 'decrease',
  AT_MOST: 'at_most',
  AT_LEAST: 'at_least',
  IN_BETWEEN: 'in_between',
} as const;

// ============================================
// ZOD SCHEMAS
// ============================================

export const keyResultSchema = z.object({
  id: z.string().uuid().optional(),
  okr_id: z.string().uuid().optional(),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),

  // Novo modelo robusto
  type: z.enum([
    KeyResultType.NUMERIC,
    KeyResultType.PERCENTAGE,
    KeyResultType.CURRENCY,
    KeyResultType.ACTIVITY,
  ]).default(KeyResultType.NUMERIC),

  direction: z.enum([
    KeyResultDirection.INCREASE,
    KeyResultDirection.DECREASE,
    KeyResultDirection.AT_MOST,
    KeyResultDirection.AT_LEAST,
    KeyResultDirection.IN_BETWEEN,
  ]).optional(),

  start_value: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(),
  target_value: z.number().nullable().optional(),
  target_max: z.number().nullable().optional(), // Para direção "in_between" (faixa: target_value até target_max)
  unit: z.string().optional(),
  position: z.number().nullable().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),

  // Para atividades
  activity_done: z.boolean().nullable().optional(), // Deprecated: usar activity_progress
  activity_progress: z.number().min(0).max(100).nullable().optional(), // Progresso em % (0-100)

  status: z.enum([
    KeyResultStatus.GREEN,
    KeyResultStatus.YELLOW,
    KeyResultStatus.RED,
  ]),
  description: z.string().nullable().optional(), // Aceita null, undefined ou string
  responsible_user_id: z.string().uuid().nullable().optional(), // Responsável pelo KR
  show_in_cockpit: z.boolean().nullable().optional(), // Flag para exibir no dashboard estratégico (Cockpit)
  updated_at: z.string().optional(),
  last_checkin_at: z.string().optional(),
  last_checkin_comment: z.string().optional(),
  history: z
    .array(
      z.object({
        date: z.string(),
        value: z.number(),
      })
    )
    .optional(),
});

export const okrSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  level: z.enum([OKRLevel.STRATEGIC, OKRLevel.SECTORAL]),
  department: z.enum([
    Department.GENERAL,
    Department.COMMERCIAL,
    Department.MARKETING,
    Department.PROJECTS,
  ]),
  owner: z.string().min(2, 'Nome do responsável é obrigatório'),
  objective: z.string().min(10, 'Objetivo deve ter pelo menos 10 caracteres'),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Data de início inválida',
  }),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Data de término inválida',
  }),
  periodicity: z.enum([Periodicity.MONTHLY, Periodicity.QUARTERLY]),
  status: z.enum([
    OKRStatus.NOT_STARTED,
    OKRStatus.IN_PROGRESS,
    OKRStatus.COMPLETED,
  ]),
  notes: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  key_results: z.array(keyResultSchema).min(1, 'Pelo menos 1 Key Result é obrigatório').optional(),
}).refine(
  (data) => {
    const start = parseLocalDate(data.start_date);
    const end = parseLocalDate(data.end_date);
    return start <= end;
  },
  {
    message: 'Data de início deve ser anterior à data de término',
    path: ['end_date'],
  }
);

// ============================================
// TYPESCRIPT TYPES
// ============================================

export type OKRLevel = typeof OKRLevel[keyof typeof OKRLevel];
export type Department = typeof Department[keyof typeof Department];
export type OKRStatus = typeof OKRStatus[keyof typeof OKRStatus];
export type Periodicity = typeof Periodicity[keyof typeof Periodicity];
export type KeyResultStatus = typeof KeyResultStatus[keyof typeof KeyResultStatus];
export type KeyResultType = typeof KeyResultType[keyof typeof KeyResultType];
export type KeyResultDirection = typeof KeyResultDirection[keyof typeof KeyResultDirection];

export type KeyResult = z.infer<typeof keyResultSchema>;
export type OKR = z.infer<typeof okrSchema>;

// ============================================
// HELPER TYPES
// ============================================

export interface OKRWithKeyResults extends OKR {
  key_results: KeyResult[];
}

export interface OKRMetrics {
  total: number;
  completed: number;
  in_progress: number;
  overdue: number;
}

export interface KeyResultProgress {
  percentage: number;
  status: KeyResultStatus;
  isOverTarget: boolean;
}

export interface OKRFilters {
  level?: OKRLevel;
  department?: Department;
  status?: OKRStatus;
  search?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Funções de cálculo de progresso
function calculateProgressIncreasing(
  start: number,
  current: number,
  target: number
): number {
  if (target === start) return current >= target ? 100 : 0;
  const raw = ((current - start) / (target - start)) * 100;
  return Math.max(0, Math.min(100, raw));
}

function calculateProgressDecreasing(
  start: number,
  current: number,
  target: number
): number {
  if (start === target) return current <= target ? 100 : 0;
  const raw = ((start - current) / (start - target)) * 100;
  return Math.max(0, Math.min(100, raw));
}

export function calculateKeyResultProgress(kr: KeyResult): KeyResultProgress {
  // Atividade: 0% ou 100%
  if (kr.type === KeyResultType.ACTIVITY) {
    if (kr.activity_progress !== null && kr.activity_progress !== undefined) {
      return {
        percentage: Math.max(0, Math.min(100, kr.activity_progress)),
        status: kr.status,
        isOverTarget: false,
      };
    }
    const percentage = kr.activity_done ? 100 : 0;
    return {
      percentage,
      status: kr.status,
      isOverTarget: false,
    };
  }

  const start = kr.start_value ?? 0;
  const current = kr.current_value ?? 0;
  const target = kr.target_value ?? 0;

  const isAllZero =
    (kr.start_value === null || kr.start_value === undefined || kr.start_value === 0) &&
    (kr.current_value === null || kr.current_value === undefined || kr.current_value === 0) &&
    (kr.target_value === null || kr.target_value === undefined || kr.target_value === 0);
  if (isAllZero) {
    return {
      percentage: 0,
      status: kr.status,
      isOverTarget: false,
    };
  }

  // Se não tem direção definida, usar lógica antiga (simples) mas com clamp
  if (!kr.direction) {
    const rawPercentage = target > 0 ? (current / target) * 100 : 0;
    const percentage = Math.max(0, Math.min(100, rawPercentage));

    return {
      percentage,
      status: kr.status,
      isOverTarget: current > target,
    };
  }

  // Usar nova lógica com direção
  let percentage = 0;
  let isOverTarget = false;
  const targetMax = kr.target_max ?? target;

  switch (kr.direction) {
    case KeyResultDirection.INCREASE:
      // Aumentar: mais é melhor (atual → meta)
      percentage = calculateProgressIncreasing(start, current, target);
      isOverTarget = current > target;
      break;

    case KeyResultDirection.DECREASE:
      // Diminuir: menos é melhor (atual → meta)
      percentage = calculateProgressDecreasing(start, current, target);
      isOverTarget = current < target;
      break;

    case KeyResultDirection.AT_MOST:
      // No máximo: 100% se atual <= meta, senão calcula quanto passou
      if (current <= target) {
        percentage = 100;
        isOverTarget = false;
      } else {
        // Quanto mais passa da meta, menor o progresso
        const excess = current - target;
        const tolerance = target * 0.5; // 50% de tolerância
        percentage = Math.max(0, 100 - (excess / tolerance) * 100);
        isOverTarget = true;
      }
      break;

    case KeyResultDirection.AT_LEAST:
      // No mínimo: 100% se atual >= meta, senão calcula progresso
      if (current >= target) {
        percentage = 100;
        isOverTarget = current > target;
      } else {
        percentage = target > 0 ? (current / target) * 100 : 0;
        isOverTarget = false;
      }
      break;

    case KeyResultDirection.IN_BETWEEN:
      // Entre: 100% se está na faixa, senão calcula distância
      if (current >= target && current <= targetMax) {
        percentage = 100;
        isOverTarget = false;
      } else if (current < target) {
        // Abaixo do mínimo
        percentage = target > 0 ? (current / target) * 100 : 0;
        isOverTarget = false;
      } else {
        // Acima do máximo
        const excess = current - targetMax;
        const tolerance = (targetMax - target) || targetMax * 0.5;
        percentage = Math.max(0, 100 - (excess / tolerance) * 100);
        isOverTarget = true;
      }
      break;

    default:
      percentage = target > 0 ? (current / target) * 100 : 0;
  }

  return {
    percentage: Math.max(0, Math.min(150, percentage)),
    status: kr.status,
    isOverTarget,
  };
}

export function calculateOKRProgress(okr: OKRWithKeyResults): number {
  if (!okr.key_results || okr.key_results.length === 0) return 0;

  // Média ponderada por peso; se não houver peso, assume 1
  const totalWeight = okr.key_results.reduce((sum, kr) => sum + (kr.weight ?? 1), 0) || okr.key_results.length;

  const weighted = okr.key_results.reduce((sum, kr) => {
    const progress = calculateKeyResultProgress(kr);
    const weight = kr.weight ?? 1;
    return sum + progress.percentage * weight;
  }, 0);

  return Math.round(weighted / totalWeight);
}

// View auxiliar (okrs_with_progress)
export interface OKRWithProgressView extends OKR {
  progress?: number;
  total_key_results?: number;
  green_krs?: number;
  yellow_krs?: number;
  red_krs?: number;
  is_overdue?: boolean;
}

export function isOKROverdue(okr: OKR): boolean {
  const today = new Date();
  const endDate = parseLocalDate(okr.end_date);
  return endDate < today && okr.status !== OKRStatus.COMPLETED;
}

export function getKeyResultStatusColor(status: KeyResultStatus): string {
  switch (status) {
    case KeyResultStatus.GREEN:
      return 'bg-green-100 text-green-800 border-green-200';
    case KeyResultStatus.YELLOW:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case KeyResultStatus.RED:
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getOKRStatusColor(status: OKRStatus): string {
  switch (status) {
    case OKRStatus.NOT_STARTED:
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case OKRStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case OKRStatus.COMPLETED:
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getLevelBadgeColor(level: OKRLevel): string {
  return level === OKRLevel.STRATEGIC
    ? 'bg-purple-100 text-purple-800 border-purple-200'
    : 'bg-indigo-100 text-indigo-800 border-indigo-200';
}

export function getDepartmentLabel(department: Department): string {
  const labels: Record<Department, string> = {
    [Department.GENERAL]: 'Geral',
    [Department.COMMERCIAL]: 'Comercial',
    [Department.MARKETING]: 'Marketing',
    [Department.PROJECTS]: 'Projetos',
  };
  return labels[department];
}

export function formatDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
