import React, { useState } from 'react';
import { TaskCard } from './TaskCard';
import { TaskInlineForm } from './TaskInlineForm';
import {
  TaskStatus,
  TaskPriority,
  sortTasks,
  type UnifiedTask,
  type TaskFilters,
} from '../../types/task.types';

interface TaskListViewProps {
  tasks: UnifiedTask[];
  filters?: TaskFilters;
  userId?: string;
  onToggleComplete: (task: UnifiedTask) => void;
  onEdit?: (task: UnifiedTask) => void;
  onDelete?: (task: UnifiedTask) => void;
  onSaveEdit?: (task: UnifiedTask, data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
  }) => Promise<void>;
  emptyMessage?: string;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  filters,
  userId,
  onToggleComplete,
  onEdit,
  onDelete,
  onSaveEdit,
  emptyMessage = 'Nenhuma tarefa encontrada',
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  // Aplicar filtros
  const filteredTasks = React.useMemo(() => {
    let result = [...tasks];

    // Filtrar por status
    if (filters?.status && filters.status !== 'all') {
      result = result.filter(t => t.status === filters.status);
    }

    // Filtrar por fonte
    if (filters?.source && filters.source !== 'all') {
      result = result.filter(t => t.source === filters.source);
    }

    // Filtrar por busca
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.sprint_title?.toLowerCase().includes(searchLower)
      );
    }

    return sortTasks(result);
  }, [tasks, filters]);

  // Separar tarefas pendentes/em andamento das concluídas
  const pendingTasks = filteredTasks.filter(t => t.status !== TaskStatus.COMPLETED);
  const completedTasks = filteredTasks.filter(t => t.status === TaskStatus.COMPLETED);

  const handleEditClick = (task: UnifiedTask) => {
    setEditingTaskId(task.id);
    onEdit?.(task);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const handleSaveInlineEdit = async (task: UnifiedTask, data: Parameters<NonNullable<typeof onSaveEdit>>[1]) => {
    await onSaveEdit?.(task, data);
    setEditingTaskId(null);
  };

  const handleDeleteInline = async (task: UnifiedTask) => {
    await onDelete?.(task);
    setEditingTaskId(null);
  };

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">{emptyMessage}</h3>
        <p className="text-slate-500 text-sm">
          {filters?.status === TaskStatus.COMPLETED 
            ? 'Suas tarefas concluídas aparecerão aqui.'
            : 'Adicione uma tarefa usando o campo acima.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarefas Pendentes e Em Andamento */}
      {pendingTasks.length > 0 && (
        <div className="space-y-3">
          {pendingTasks.map(task => (
            editingTaskId === task.id ? (
              <TaskInlineForm
                key={`${task.source}-${task.id}-edit`}
                task={task}
                userId={userId || ''}
                onSave={(data) => handleSaveInlineEdit(task, data)}
                onCancel={handleCancelEdit}
                onDelete={() => handleDeleteInline(task)}
              />
            ) : (
              <TaskCard
                key={`${task.source}-${task.id}`}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={handleEditClick}
                onDelete={onDelete}
                variant="list"
              />
            )
          ))}
        </div>
      )}

      {/* Separador se houver ambos */}
      {pendingTasks.length > 0 && completedTasks.length > 0 && (
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Concluídas ({completedTasks.length})
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
      )}

      {/* Tarefas Concluídas */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          {completedTasks.map(task => (
            editingTaskId === task.id ? (
              <TaskInlineForm
                key={`${task.source}-${task.id}-edit`}
                task={task}
                userId={userId || ''}
                onSave={(data) => handleSaveInlineEdit(task, data)}
                onCancel={handleCancelEdit}
                onDelete={() => handleDeleteInline(task)}
              />
            ) : (
              <TaskCard
                key={`${task.source}-${task.id}`}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={handleEditClick}
                onDelete={onDelete}
                variant="list"
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskListView;
