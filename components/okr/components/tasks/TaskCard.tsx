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
  type UnifiedTask,
} from '../../types/task.types';

interface TaskCardProps {
  task: UnifiedTask;
  onToggleComplete: (task: UnifiedTask) => void;
  onEdit?: (task: UnifiedTask) => void;
  onDelete?: (task: UnifiedTask) => void;
  variant?: 'list' | 'kanban';
  isDragging?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  variant = 'list',
  isDragging = false,
}) => {
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const overdue = isTaskOverdue(task);
  const daysUntilDue = getDaysUntilDue(task.due_date);

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
          bg-white rounded-xl p-4 shadow-sm border transition-all cursor-pointer group
          ${isDragging ? 'shadow-lg ring-2 ring-indigo-400 rotate-2' : 'hover:shadow-md'}
          ${isCompleted ? 'opacity-70' : ''}
        `}
        onClick={() => onEdit?.(task)}
      >
        {/* Header com source badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {task.source === TaskSource.SPRINT && task.item_type && (
              <span className="text-sm">{getItemTypeIcon()}</span>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getTaskSourceColor(task.source)}`}>
              {task.source === TaskSource.SPRINT && task.sprint_title 
                ? task.sprint_title.substring(0, 15) + (task.sprint_title.length > 15 ? '...' : '')
                : getTaskSourceLabel(task.source)
              }
            </span>
          </div>
          {task.priority && task.source === TaskSource.PERSONAL && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${getTaskPriorityColor(task.priority)}`}>
              {getTaskPriorityLabel(task.priority)}
            </span>
          )}
        </div>

        {/* Título */}
        <h4 className={`font-medium text-sm mb-2 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {task.title}
        </h4>

        {/* Footer com data */}
        {task.due_date && (
          <div className={`
            flex items-center gap-1 text-xs
            ${overdue ? 'text-rose-500 font-bold' : 'text-slate-500'}
          `}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {getDueDateLabel()}
          </div>
        )}
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
        <div className="flex-1 min-w-0" onClick={() => onEdit?.(task)}>
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
          
          <h4 className={`font-semibold cursor-pointer transition-all ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 hover:text-indigo-600'}`}>
            {task.title}
          </h4>
          
          {/* Meta info */}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
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

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
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
          {onDelete && task.source === TaskSource.PERSONAL && (
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
