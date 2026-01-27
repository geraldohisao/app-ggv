import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const TaskStatus = {
  PENDING: 'pendente',
  IN_PROGRESS: 'em andamento',
  COMPLETED: 'concluido',
} as const;

export const TaskPriority = {
  LOW: 'baixa',
  MEDIUM: 'media',
  HIGH: 'alta',
  URGENT: 'urgente',
} as const;

export const TaskSource = {
  PERSONAL: 'personal',
  SPRINT: 'sprint',
} as const;

// ============================================
// ZOD SCHEMAS
// ============================================

export const subtaskSchema = z.object({
  id: z.string().uuid().optional(),
  task_id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  is_completed: z.boolean().default(false),
  position: z.number().default(0),
  created_at: z.string().optional(),
  completed_at: z.string().optional().nullable(),
});

export type Subtask = z.infer<typeof subtaskSchema>;
export type CreateSubtaskInput = Omit<Subtask, 'id' | 'created_at' | 'completed_at'>;

// Comentários
export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  // Dados do usuário (join)
  user_name?: string;
  user_avatar?: string;
}

export type CreateTaskCommentInput = Pick<TaskComment, 'task_id' | 'user_id' | 'content'>;

// Activity Log / Histórico
export type ActivityActionType = 
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'title_changed'
  | 'responsible_changed'
  | 'subtask_added'
  | 'subtask_completed'
  | 'comment_added';

export interface TaskActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action_type: ActivityActionType;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  // Dados do usuário (join)
  user_name?: string;
  user_avatar?: string;
}

export const personalTaskSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  status: z.enum([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
  priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT]).optional(),
  due_date: z.string().optional().nullable(),
  responsible_user_id: z.string().uuid().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  completed_at: z.string().optional().nullable(),
});

export const createPersonalTaskSchema = personalTaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  completed_at: true,
});

// ============================================
// TYPESCRIPT TYPES
// ============================================

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];
export type TaskSource = typeof TaskSource[keyof typeof TaskSource];

export type PersonalTask = z.infer<typeof personalTaskSchema>;
export type CreatePersonalTaskInput = z.infer<typeof createPersonalTaskSchema>;

/**
 * Interface unificada para exibição de tasks
 * Combina tasks pessoais e itens de sprint em uma única estrutura
 */
export interface UnifiedTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  created_at: string;
  updated_at?: string;
  
  // Identificador da fonte
  source: TaskSource;
  
  // Contexto de task pessoal
  user_id?: string;
  completed_at?: string | null;
  
  // Responsável (usado tanto em pessoais quanto em sprints)
  responsible?: string; // Nome do responsável (para exibição)
  responsible_user_id?: string; // ID do responsável
  responsible_avatar?: string; // Avatar do responsável
  
  // Subtarefas (apenas para tasks pessoais)
  subtasks?: Subtask[];
  subtasks_total?: number;
  subtasks_completed?: number;
  
  // Contexto de sprint (quando source === 'sprint')
  sprint_id?: string;
  sprint_title?: string;
  sprint_status?: string;
  item_type?: string; // 'iniciativa', 'impedimento', 'decisão', 'atividade', 'marco'
}

// ============================================
// HELPER TYPES
// ============================================

export interface TaskFilters {
  status?: TaskStatus | 'all';
  source?: TaskSource | 'all';
  search?: string;
}

export interface TaskMetrics {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getTaskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'Pendente',
    [TaskStatus.IN_PROGRESS]: 'Em Andamento',
    [TaskStatus.COMPLETED]: 'Concluído',
  };
  return labels[status] || status;
}

export function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.PENDING:
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case TaskStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case TaskStatus.COMPLETED:
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getTaskPriorityLabel(priority?: TaskPriority): string {
  if (!priority) return 'Média';
  const labels: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: 'Baixa',
    [TaskPriority.MEDIUM]: 'Média',
    [TaskPriority.HIGH]: 'Alta',
    [TaskPriority.URGENT]: 'Urgente',
  };
  return labels[priority] || priority;
}

export function getTaskPriorityColor(priority?: TaskPriority): string {
  if (!priority) return 'bg-slate-100 text-slate-600';
  switch (priority) {
    case TaskPriority.LOW:
      return 'bg-slate-100 text-slate-600';
    case TaskPriority.MEDIUM:
      return 'bg-blue-100 text-blue-600';
    case TaskPriority.HIGH:
      return 'bg-amber-100 text-amber-600';
    case TaskPriority.URGENT:
      return 'bg-rose-100 text-rose-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function getTaskSourceLabel(source: TaskSource): string {
  return source === TaskSource.PERSONAL ? 'Pessoal' : 'Sprint';
}

export function getTaskSourceColor(source: TaskSource): string {
  return source === TaskSource.PERSONAL 
    ? 'bg-violet-100 text-violet-700 border-violet-200'
    : 'bg-indigo-100 text-indigo-700 border-indigo-200';
}

/**
 * Verifica se uma task está atrasada
 */
export function isTaskOverdue(task: UnifiedTask): boolean {
  if (!task.due_date || task.status === TaskStatus.COMPLETED) return false;
  const dueDate = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

/**
 * Calcula dias restantes até o vencimento
 */
export function getDaysUntilDue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Níveis de urgência para due date
 */
export type DueDateUrgency = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal' | null;

/**
 * Calcula o nível de urgência de uma task baseado na due_date
 */
export function getDueDateUrgency(task: UnifiedTask): DueDateUrgency {
  if (!task.due_date || task.status === TaskStatus.COMPLETED) return null;
  const daysUntil = getDaysUntilDue(task.due_date);
  if (daysUntil === null) return null;
  
  if (daysUntil < 0) return 'overdue';
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  if (daysUntil <= 3) return 'soon';
  return 'normal';
}

/**
 * Retorna classes CSS para o badge de due date baseado na urgência
 */
export function getDueDateUrgencyClasses(urgency: DueDateUrgency): { badge: string; text: string; icon: string } {
  switch (urgency) {
    case 'overdue':
      return {
        badge: 'bg-rose-100 border-rose-200',
        text: 'text-rose-600 font-bold',
        icon: 'text-rose-500',
      };
    case 'today':
      return {
        badge: 'bg-amber-100 border-amber-200',
        text: 'text-amber-700 font-bold',
        icon: 'text-amber-500',
      };
    case 'tomorrow':
      return {
        badge: 'bg-amber-50 border-amber-100',
        text: 'text-amber-600 font-medium',
        icon: 'text-amber-400',
      };
    case 'soon':
      return {
        badge: 'bg-blue-50 border-blue-100',
        text: 'text-blue-600',
        icon: 'text-blue-400',
      };
    case 'normal':
    default:
      return {
        badge: 'bg-slate-50 border-slate-100',
        text: 'text-slate-500',
        icon: 'text-slate-400',
      };
  }
}

/**
 * Retorna label para o badge de urgência
 */
export function getDueDateUrgencyLabel(urgency: DueDateUrgency, daysUntil: number | null): string {
  if (urgency === null || daysUntil === null) return '';
  
  switch (urgency) {
    case 'overdue':
      return daysUntil === -1 ? 'Ontem' : `${Math.abs(daysUntil)}d atrasado`;
    case 'today':
      return 'Hoje';
    case 'tomorrow':
      return 'Amanhã';
    case 'soon':
      return `${daysUntil}d`;
    case 'normal':
      return `${daysUntil}d`;
    default:
      return '';
  }
}

/**
 * Ordena tasks por prioridade de exibição:
 * 1. Tasks com due_date mais próximo primeiro
 * 2. Tasks sem due_date: por created_at (mais antigas primeiro)
 * 3. Tasks concluídas vão para o final
 */
export function sortTasks(tasks: UnifiedTask[]): UnifiedTask[] {
  return [...tasks].sort((a, b) => {
    // Concluídas vão para o final
    if (a.status === TaskStatus.COMPLETED && b.status !== TaskStatus.COMPLETED) return 1;
    if (b.status === TaskStatus.COMPLETED && a.status !== TaskStatus.COMPLETED) return -1;
    
    // Entre concluídas, ordenar por completed_at desc (mais recentes primeiro)
    if (a.status === TaskStatus.COMPLETED && b.status === TaskStatus.COMPLETED) {
      const aCompleted = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const bCompleted = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return bCompleted - aCompleted;
    }
    
    // Entre não-concluídas:
    // 1. Tasks com due_date vêm primeiro
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    
    // 2. Se ambas têm due_date, ordenar por data (mais próximas primeiro)
    if (a.due_date && b.due_date) {
      const aDate = new Date(a.due_date).getTime();
      const bDate = new Date(b.due_date).getTime();
      if (aDate !== bDate) return aDate - bDate;
    }
    
    // 3. Se não têm due_date ou têm a mesma, ordenar por created_at (mais antigas primeiro)
    const aCreated = new Date(a.created_at).getTime();
    const bCreated = new Date(b.created_at).getTime();
    return aCreated - bCreated;
  });
}

/**
 * Agrupa tasks por status para visão Kanban
 */
export function groupTasksByStatus(tasks: UnifiedTask[]): Record<TaskStatus, UnifiedTask[]> {
  return {
    [TaskStatus.PENDING]: sortTasks(tasks.filter(t => t.status === TaskStatus.PENDING)),
    [TaskStatus.IN_PROGRESS]: sortTasks(tasks.filter(t => t.status === TaskStatus.IN_PROGRESS)),
    [TaskStatus.COMPLETED]: sortTasks(tasks.filter(t => t.status === TaskStatus.COMPLETED)),
  };
}

/**
 * Calcula métricas de tasks
 */
export function calculateTaskMetrics(tasks: UnifiedTask[]): TaskMetrics {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
    in_progress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    overdue: tasks.filter(t => isTaskOverdue(t)).length,
  };
}
