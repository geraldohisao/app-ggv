import React, { useState, useCallback } from 'react';
import { TaskCard } from './TaskCard';
import {
  TaskStatus,
  groupTasksByStatus,
  getTaskStatusLabel,
  type UnifiedTask,
} from '../../types/task.types';

interface TaskKanbanViewProps {
  tasks: UnifiedTask[];
  onStatusChange: (task: UnifiedTask, newStatus: TaskStatus) => void;
  onEdit?: (task: UnifiedTask) => void;
  onDelete?: (task: UnifiedTask) => void;
}

interface DragState {
  taskId: string | null;
  sourceStatus: TaskStatus | null;
}

const COLUMN_CONFIG: { status: TaskStatus; color: string; bgColor: string; icon: string }[] = [
  { 
    status: TaskStatus.PENDING, 
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    icon: '⏳'
  },
  { 
    status: TaskStatus.IN_PROGRESS, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: '🔄'
  },
  { 
    status: TaskStatus.COMPLETED, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    icon: '✅'
  },
];

export const TaskKanbanView: React.FC<TaskKanbanViewProps> = ({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
}) => {
  const [dragState, setDragState] = useState<DragState>({ taskId: null, sourceStatus: null });
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  // Agrupar tasks por status
  const groupedTasks = React.useMemo(() => groupTasksByStatus(tasks), [tasks]);

  // Encontrar task pelo ID
  const findTask = useCallback((taskId: string): UnifiedTask | undefined => {
    return tasks.find(t => t.id === taskId);
  }, [tasks]);

  // Handlers de drag
  const handleDragStart = (e: React.DragEvent, task: UnifiedTask) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setDragState({ taskId: task.id, sourceStatus: task.status });
    
    // Adiciona efeito visual com delay
    setTimeout(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
    setDragState({ taskId: null, sourceStatus: null });
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(status);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDropTarget(null);

    const taskId = e.dataTransfer.getData('text/plain');
    const task = findTask(taskId);

    if (task && task.status !== targetStatus) {
      onStatusChange(task, targetStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
      {COLUMN_CONFIG.map(({ status, color, bgColor, icon }) => {
        const columnTasks = groupedTasks[status] || [];
        const isDropActive = dropTarget === status && dragState.sourceStatus !== status;

        return (
          <div
            key={status}
            className={`
              rounded-2xl border-2 transition-all min-h-[400px]
              ${isDropActive 
                ? 'border-indigo-400 border-dashed bg-indigo-50/50' 
                : 'border-transparent bg-slate-50/50'
              }
            `}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Header da Coluna */}
            <div className={`sticky top-0 z-10 px-4 py-3 rounded-t-2xl ${bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <h3 className={`font-bold ${color}`}>
                    {getTaskStatusLabel(status)}
                  </h3>
                </div>
                <span className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                  ${status === TaskStatus.COMPLETED 
                    ? 'bg-emerald-200 text-emerald-700' 
                    : status === TaskStatus.IN_PROGRESS
                    ? 'bg-blue-200 text-blue-700'
                    : 'bg-slate-200 text-slate-700'
                  }
                `}>
                  {columnTasks.length}
                </span>
              </div>
            </div>

            {/* Lista de Cards */}
            <div className="p-3 space-y-3">
              {columnTasks.length === 0 ? (
                <div className={`
                  text-center py-12 rounded-xl border-2 border-dashed transition-all
                  ${isDropActive 
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-600' 
                    : 'border-slate-200 text-slate-400'
                  }
                `}>
                  <p className="text-sm font-medium">
                    {isDropActive ? 'Solte aqui!' : 'Nenhuma tarefa'}
                  </p>
                </div>
              ) : (
                columnTasks.map(task => (
                  <div
                    key={`${task.source}-${task.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className={`
                      cursor-grab active:cursor-grabbing transition-transform
                      ${dragState.taskId === task.id ? 'scale-105' : ''}
                    `}
                  >
                    <TaskCard
                      task={task}
                      onToggleComplete={() => {
                        const newStatus = task.status === TaskStatus.COMPLETED 
                          ? TaskStatus.PENDING 
                          : TaskStatus.COMPLETED;
                        onStatusChange(task, newStatus);
                      }}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      variant="kanban"
                      isDragging={dragState.taskId === task.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskKanbanView;
