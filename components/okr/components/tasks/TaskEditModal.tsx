import React, { useState, useEffect } from 'react';
import {
  TaskStatus,
  TaskSource,
  TaskPriority,
  getTaskStatusLabel,
  getTaskStatusColor,
  getTaskPriorityLabel,
  getTaskPriorityColor,
  getTaskSourceLabel,
  type UnifiedTask,
} from '../../types/task.types';

interface TaskEditModalProps {
  task?: UnifiedTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  isCreating?: boolean;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isCreating = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.PENDING);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Preencher dados quando task muda
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority || TaskPriority.MEDIUM);
      setDueDate(task.due_date || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(TaskStatus.PENDING);
      setPriority(TaskPriority.MEDIUM);
      setDueDate('');
    }
    setShowDeleteConfirm(false);
  }, [task, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        due_date: dueDate || null,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Erro ao excluir task:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const isSprintTask = task?.source === TaskSource.SPRINT;
  const canEditFully = !isSprintTask; // Tasks de sprint só podem ter status alterado

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isCreating ? 'Nova Tarefa' : 'Editar Tarefa'}
              </h2>
              {task && !isCreating && (
                <p className="text-xs text-slate-500">
                  {getTaskSourceLabel(task.source)}
                  {isSprintTask && task.sprint_title && ` · ${task.sprint_title}`}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Título */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Título <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSprintTask && !isCreating}
              placeholder="O que precisa ser feito?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-500"
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSprintTask && !isCreating}
              placeholder="Detalhes adicionais (opcional)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {/* Status e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Status
              </label>
              <div className="flex flex-col gap-2">
                {Object.values(TaskStatus).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`
                      px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all text-left
                      ${status === s 
                        ? `${getTaskStatusColor(s)} border-current` 
                        : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                      }
                    `}
                  >
                    {getTaskStatusLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Prioridade (apenas para tasks pessoais) */}
            {canEditFully && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Prioridade
                </label>
                <div className="flex flex-col gap-2">
                  {Object.values(TaskPriority).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all text-left
                        ${priority === p 
                          ? `${getTaskPriorityColor(p)} border-current` 
                          : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                        }
                      `}
                    >
                      {getTaskPriorityLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data de Vencimento */}
          {canEditFully && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          )}

          {/* Info para tasks de sprint */}
          {isSprintTask && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium">Esta tarefa pertence a uma Sprint</p>
              <p className="text-amber-600 mt-1">
                Você pode alterar apenas o status. Para editar outros campos, acesse a Sprint.
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          {/* Botão de excluir */}
          <div>
            {onDelete && task && !isCreating && task.source === TaskSource.PERSONAL && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-rose-600 font-medium">Confirmar?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 disabled:opacity-50"
                    >
                      Sim, excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-300"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-medium transition-all"
                  >
                    Excluir
                  </button>
                )}
              </>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || !title.trim()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{isCreating ? 'Criar Tarefa' : 'Salvar'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskEditModal;
