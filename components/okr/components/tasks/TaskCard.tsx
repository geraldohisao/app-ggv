import React from 'react';
import {
  TaskStatus,
  TaskSource,
  getTaskStatusColor,
  getTaskSourceLabel,
  getTaskSourceColor,
  getTaskPriorityLabel,
  getTaskPriorityColor,
  isTaskOverdue,
  getDaysUntilDue,
  getDueDateUrgency,
  getDueDateUrgencyClasses,
  getDueDateUrgencyLabel,
  type UnifiedTask,
} from '../../types/task.types';

interface TaskCardProps {
  task: UnifiedTask;
  onToggleComplete: (task: UnifiedTask) => void;
  onEdit?: (task: UnifiedTask) => void;
  onDelete?: (task: UnifiedTask) => void;
  variant?: 'list' | 'kanban';
  isDragging?: boolean;
  /** Ref para o drag handle (usado no Kanban) */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Se false, não mostra opções de edição mesmo que onEdit esteja definido */
  canEdit?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  variant = 'list',
  isDragging = false,
  dragHandleProps,
  canEdit = true, // Por padrão permite edição se onEdit estiver definido
}) => {
  // Só mostra botão de edição se canEdit for true
  const showEditButton = canEdit && onEdit;
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const overdue = isTaskOverdue(task);
  const daysUntilDue = getDaysUntilDue(task.due_date);
  const urgency = getDueDateUrgency(task);
  const urgencyClasses = getDueDateUrgencyClasses(urgency);
  const urgencyLabel = getDueDateUrgencyLabel(urgency, daysUntilDue);

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getDueDateLabel = () => {
    if (!task.due_date) return null;
    if (daysUntilDue === null) return formatDueDate(task.due_date);
    
    if (daysUntilDue < 0) {
      return `${Math.abs(daysUntilDue)}d atrasado`;
    } else if (daysUntilDue === 0) {
      return 'Hoje';
    } else if (daysUntilDue === 1) {
      return 'Amanhã';
    } else if (daysUntilDue <= 7) {
      return `${daysUntilDue}d`;
    }
    return formatDueDate(task.due_date);
  };

  const getItemTypeIcon = () => {
    if (task.source !== TaskSource.SPRINT || !task.item_type) return null;
    switch (task.item_type) {
      case 'iniciativa': return '🎯';
      case 'impedimento': return '🚧';
      case 'decisão': return '⚖️';
      case 'atividade': return '📋';
      case 'marco': return '🏁';
      default: return '📌';
    }
  };

  if (variant === 'kanban') {
    return (
      <div
        className={`
          bg-white rounded-xl shadow-sm border transition-all group relative
          ${isDragging ? 'shadow-lg ring-2 ring-indigo-400 rotate-2' : 'hover:shadow-md'}
          ${isCompleted ? 'opacity-70' : ''}
          ${urgency === 'overdue' ? 'border-rose-200' : urgency === 'today' ? 'border-amber-200' : 'border-slate-100'}
        `}
      >
        {/* Drag Handle - área de arrasto */}
        <div 
          {...dragHandleProps}
          className="absolute top-0 left-0 right-0 h-6 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Arraste para mover"
        >
          <div className="w-8 h-1 bg-slate-300 rounded-full" />
        </div>

        <div className="p-4 pt-3">
          {/* Header com source badge e ações rápidas */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {task.source === TaskSource.SPRINT && task.item_type && (
                <span className="text-sm">{getItemTypeIcon()}</span>
              )}
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getTaskSourceColor(task.source)}`}>
                {task.source === TaskSource.SPRINT && task.sprint_title 
                  ? task.sprint_title.substring(0, 12) + (task.sprint_title.length > 12 ? '...' : '')
                  : getTaskSourceLabel(task.source)
                }
              </span>
            </div>
            
            {/* Ações rápidas no hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Checkbox para marcar como concluída */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
                className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                  ${isCompleted 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'border-slate-300 text-transparent hover:border-emerald-400 hover:bg-emerald-50'
                  }
                `}
                title={isCompleted ? 'Reabrir' : 'Concluir'}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              
              {/* Editar - só mostra se canEdit */}
              {showEditButton && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              
              {/* Excluir (só pessoais) */}
              {onDelete && task.source === TaskSource.PERSONAL && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(task); }}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                  title="Excluir"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Título - clicável para editar se permitido */}
          <h4 
            onClick={() => showEditButton && onEdit?.(task)}
            className={`font-medium text-sm mb-2 ${showEditButton ? 'cursor-pointer' : ''} ${isCompleted ? 'text-slate-400 line-through' : showEditButton ? 'text-slate-800 hover:text-indigo-600' : 'text-slate-800'}`}
          >
            {task.title}
          </h4>

          {/* Footer com data, prioridade, subtasks e responsável */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badge de subtarefas (se houver) */}
              {task.subtasks_total && task.subtasks_total > 0 && (
                <div 
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border
                    ${task.subtasks_completed === task.subtasks_total 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                      : 'bg-violet-50 border-violet-200 text-violet-600'
                    }
                  `}
                  title={`${task.subtasks_completed}/${task.subtasks_total} subtarefas concluídas`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  {task.subtasks_completed}/{task.subtasks_total}
                </div>
              )}

              {/* Badge de vencimento com cores de urgência */}
              {task.due_date && urgency && (
                <div className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border
                  ${urgencyClasses.badge} ${urgencyClasses.text}
                `}>
                  <svg className={`w-3 h-3 ${urgencyClasses.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {urgencyLabel}
                </div>
              )}
              
              {/* Badge de prioridade (apenas pessoais) */}
              {task.priority && task.source === TaskSource.PERSONAL && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${getTaskPriorityColor(task.priority)}`}>
                  {getTaskPriorityLabel(task.priority)}
                </span>
              )}
            </div>

            {/* Avatar do responsável (se houver e for diferente do criador) */}
            {task.responsible_user_id && (
              <div 
                className="flex-shrink-0"
                title={task.responsible ? `Responsável: ${task.responsible}` : 'Responsável atribuído'}
              >
                {task.responsible_avatar ? (
                  <img 
                    src={task.responsible_avatar} 
                    alt={task.responsible || 'Responsável'}
                    className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] ring-2 ring-white">
                    {task.responsible?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Variant: list
  return (
    <div className={`
      bg-white rounded-2xl p-4 shadow-sm border transition-all group
      ${isCompleted ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 hover:shadow-md hover:border-indigo-100'}
      ${overdue && !isCompleted ? 'border-rose-200 bg-rose-50/30' : ''}
    `}>
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
          className={`
            w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
            ${isCompleted 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'border-slate-200 text-transparent hover:border-indigo-400'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0" onClick={() => showEditButton && onEdit?.(task)}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Ícone do tipo (para sprint items) */}
            {task.source === TaskSource.SPRINT && task.item_type && (
              <span className="text-sm">{getItemTypeIcon()}</span>
            )}
            
            {/* Badge de origem */}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getTaskSourceColor(task.source)}`}>
              {task.source === TaskSource.SPRINT && task.sprint_title 
                ? task.sprint_title.substring(0, 20) + (task.sprint_title.length > 20 ? '...' : '')
                : getTaskSourceLabel(task.source)
              }
            </span>

            {/* Badge de prioridade (apenas para tasks pessoais) */}
            {task.priority && task.source === TaskSource.PERSONAL && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${getTaskPriorityColor(task.priority)}`}>
                {getTaskPriorityLabel(task.priority)}
              </span>
            )}
          </div>
          
          <h4 className={`font-semibold transition-all ${showEditButton ? 'cursor-pointer' : ''} ${isCompleted ? 'text-slate-400 line-through' : showEditButton ? 'text-slate-800 hover:text-indigo-600' : 'text-slate-800'}`}>
            {task.title}
          </h4>
          
          {/* Meta info */}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
            {/* Responsável - sempre visível se existir */}
            {task.responsible && (
              <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
                {task.responsible_avatar ? (
                  <img 
                    src={task.responsible_avatar} 
                    alt={task.responsible}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                {task.responsible}
              </span>
            )}
            
            {task.due_date && (
              <span className={`flex items-center gap-1 ${overdue && !isCompleted ? 'text-rose-500 font-bold' : ''}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {getDueDateLabel()}
              </span>
            )}
            
            {task.status === TaskStatus.IN_PROGRESS && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium">
                Em Andamento
              </span>
            )}

            {task.description && (
              <span className="text-slate-400 truncate max-w-[200px]" title={task.description}>
                {task.description}
              </span>
            )}
          </div>
        </div>

        {/* Ações - só mostra se canEdit */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {showEditButton && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && task.source === TaskSource.PERSONAL && canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task); }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
              title="Excluir"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
