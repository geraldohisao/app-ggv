import { z } from 'zod';
import { parseLocalDate } from '../utils/date';

// ============================================
// KR CHECK-IN (Histórico de Valores)
// ============================================

export const krCheckinSchema = z.object({
  id: z.string().uuid().optional(),
  kr_id: z.string().uuid(),
  sprint_id: z.string().uuid().optional(),
  value: z.number(),
  previous_value: z.number().optional(),
  target_value: z.number().optional(),
  delta: z.number().optional(),
  progress_pct: z.number().optional(),
  comment: z.string().optional(),
  confidence: z.enum(['baixa', 'média', 'alta']).optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
});

export type KRCheckin = z.infer<typeof krCheckinSchema>;

// ============================================
// SPRINT CHECK-IN (Registro do Ciclo)
// ============================================

export const sprintCheckinSchema = z.object({
  id: z.string().uuid().optional(),
  sprint_id: z.string().uuid(),
  checkin_date: z.string().optional(),
  summary: z.string().min(10, 'Resumo deve ter pelo menos 10 caracteres'),
  
  // Campos de Sprint de Execução
  achievements: z.string().optional(),
  blockers: z.string().optional(),
  decisions_taken: z.string().optional(),
  next_focus: z.string().optional(),
  
  // Campos de Sprint de Governança
  learnings: z.string().optional(),
  okr_misalignments: z.string().optional(),
  keep_doing: z.string().optional(),
  stop_doing: z.string().optional(),
  adjust_doing: z.string().optional(),
  strategic_recommendations: z.string().optional(),
  identified_risks: z.string().optional(),
  
  health: z.enum(['verde', 'amarelo', 'vermelho']),
  health_reason: z.string().optional(),
  initiatives_completed: z.number().optional(),
  initiatives_total: z.number().optional(),
  impediments_count: z.number().optional(),
  decisions_count: z.number().optional(),
  carry_over_count: z.number().optional(),
  carry_over_pct: z.number().optional(),
  notes: z.string().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
});

export type SprintCheckin = z.infer<typeof sprintCheckinSchema>;

// ============================================
// SPRINT TEMPLATE
// ============================================

export const sprintTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  type: z.enum(['semanal', 'mensal', 'trimestral', 'semestral', 'anual']),
  department: z.enum(['geral', 'comercial', 'marketing', 'projetos']),
  scope: z.enum(['operacional', 'tático', 'estratégico']).default('operacional'),
  audience: z.enum(['time', 'liderança', 'diretoria']).default('time'),
  auto_create: z.boolean().default(true),
  max_initiatives: z.number().default(7),
  max_carry_over_pct: z.number().default(30),
  require_checkin: z.boolean().default(true),
  title_template: z.string().optional(),
  description_template: z.string().optional(),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
});

export type SprintTemplate = z.infer<typeof sprintTemplateSchema>;

// ============================================
// EXTENDED TYPES (com dados relacionados)
// ============================================

export interface KRCheckinWithDetails extends KRCheckin {
  kr_title?: string;
  kr_unit?: string;
  kr_direction?: 'increase' | 'decrease' | 'at_most' | 'at_least' | 'in_between';
  sprint_title?: string;
}

export interface SprintCheckinWithDetails extends SprintCheckin {
  sprint_title?: string;
  sprint_type?: string;
  department?: string;
  completion_rate?: number;
  high_carry_over?: boolean;
}

// ============================================
// HELPER TYPES
// ============================================

export interface CheckinMetrics {
  initiatives_completed: number;
  initiatives_total: number;
  impediments_count: number;
  decisions_count: number;
  carry_over_count: number;
  carry_over_pct: number;
  completion_rate: number;
}

export interface KRWithLatestCheckin {
  id: string;
  title: string;
  current_value: number;
  target_value: number;
  unit?: string;
  direction: 'increase' | 'decrease' | 'at_most' | 'at_least' | 'in_between';
  status: string;
  progress: number;
  latest_checkin?: KRCheckin;
  checkins_count: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function calculateProgress(
  currentValue: number,
  targetValue: number,
  direction: 'increase' | 'decrease'
): number {
  if (targetValue === 0) return 0;

  let progress: number;

  if (direction === 'increase') {
    // Maior é melhor (vendas, contratos, receita)
    progress = (currentValue / targetValue) * 100;
  } else {
    // Menor é melhor (churn, custo, tempo)
    progress = ((targetValue - currentValue) / targetValue) * 100;
  }

  // Limitar entre 0 e 100
  return Math.max(0, Math.min(100, progress));
}

export function getHealthColor(health: 'verde' | 'amarelo' | 'vermelho'): string {
  switch (health) {
    case 'verde':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'amarelo':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'vermelho':
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

export function getHealthEmoji(health: 'verde' | 'amarelo' | 'vermelho'): string {
  switch (health) {
    case 'verde':
      return '✅';
    case 'amarelo':
      return '⚠️';
    case 'vermelho':
      return '🔴';
  }
}

export function formatCheckinDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function calculateMetricsFromItems(items: any[]): CheckinMetrics {
  const initiatives = items.filter(i => i.type === 'iniciativa');
  const initiativesCompleted = initiatives.filter(i => i.status === 'concluído');
  const carryOverItems = items.filter(i => i.is_carry_over === true);

  return {
    initiatives_completed: initiativesCompleted.length,
    initiatives_total: initiatives.length,
    impediments_count: items.filter(i => i.type === 'impedimento').length,
    decisions_count: items.filter(i => i.type === 'decisão').length,
    carry_over_count: carryOverItems.length,
    carry_over_pct: items.length > 0 ? Math.round((carryOverItems.length / items.length) * 100) : 0,
    completion_rate: initiatives.length > 0 ? Math.round((initiativesCompleted.length / initiatives.length) * 100) : 0,
  };
}
