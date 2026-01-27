import React, { useState, useEffect, useRef } from 'react';
import { TaskStatus, TaskPriority, TaskSource, type UnifiedTask } from '../../types/task.types';

interface TaskInlineFormProps {
  task?: UnifiedTask; // Para edição
  userId: string;
  userName?: string; // Nome do usuário para comparação com responsible
  onSave: (data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}

export const TaskInlineForm: React.FC<TaskInlineFormProps> = ({
  task,
  userId,
  userName,
  onSave,
  onCancel,
  onDelete,
}) => {
  const isEdit = !!task?.id;
  const titleRef = useRef<HTMLTextAreaElement>(null);
  
  // Verificar se usuário é responsável pela task de Sprint
  const isResponsibleForSprintTask = () => {
    if (!task || task.source !== TaskSource.SPRINT) return false;
    // Verificar por ID
    if (task.responsible_user_id && task.responsible_user_id === userId) return true;
    // Fallback: verificar por nome
    if (task.responsible && userName) {
      const taskResponsible = task.responsible.toLowerCase().trim();
      const userNameLower = userName.toLowerCase().trim();
      return taskResponsible === userNameLower || 
             taskResponsible.includes(userNameLower) || 
             userNameLower.includes(taskResponsible);
    }
    return false;
  };
  
  // Pode editar: task pessoal OU task de sprint onde é responsável
  const canEdit = task?.source === TaskSource.PERSONAL || !task || isResponsibleForSprintTask();
  
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || TaskStatus.PENDING,
    priority: task?.priority || TaskPriority.MEDIUM,
    due_date: task?.due_date || '',
  });
  
  const [saving, setSaving] = useState(false);

  // Auto-focus no título ao montar
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      if (isEdit) {
        titleRef.current.select();
      }
      // Auto-resize inicial
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [isEdit]);

  // Auto-resize do textarea ao digitar
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, title: e.target.value });
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // Handler para teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Enter sem Shift salva, Enter com Shift quebra linha
    if (e.key === 'Enter' && !e.shiftKey && e.target === titleRef.current) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      titleRef.current?.focus();
      return;
    }
    
    setSaving(true);
    try {
      await onSave({
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
      });
    } catch (error) {
      console.error('Erro ao salvar task:', error);
    } finally {
      setSaving(false);
    }
  };

  // Se for task de sprint E usuário NÃO é responsável, mostrar só leitura
  if (task && task.source === TaskSource.SPRINT && !isResponsibleForSprintTask()) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase">
            Task de Sprint (Somente Leitura)
          </span>
          <button
            onClick={onCancel}
            className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-slate-700 font-medium">{task.title}</p>
        <p className="text-xs text-slate-500 mt-2">
          Edite esta task na sprint: {task.sprint_title}
        </p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-sm border border-indigo-200 transition-all duration-200"
      onKeyDown={handleKeyDown}
    >
      {/* Linha principal: Checkbox + Título + Ações */}
      <div className="flex items-center gap-3">
        {/* Checkbox de status */}
        <button
          type="button"
          onClick={() => setFormData({ 
            ...formData, 
            status: formData.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED 
          })}
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
            ${formData.status === TaskStatus.COMPLETED
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'border-slate-300 text-transparent hover:border-indigo-400'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* Campo Título */}
        <textarea
          ref={titleRef}
          value={formData.title}
          onChange={handleTitleChange}
          placeholder="Título da tarefa..."
          rows={1}
          className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-300 p-0 resize-none overflow-hidden leading-tight"
          style={{ minHeight: '20px' }}
        />

        {/* Botões de ação */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-all"
              title="Excluir"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !formData.title.trim()}
            className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Salvar (Enter)"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-all"
            title="Cancelar (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Segunda linha: Descrição */}
      <div className="mt-3 ml-9">
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição opcional..."
          rows={1}
          className="w-full bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 focus:border-indigo-400 focus:ring-0 text-xs text-slate-600 placeholder:text-slate-300 resize-none transition-all"
        />
      </div>

      {/* Terceira linha: Campos adicionais */}
      <div className="mt-3 ml-9 flex flex-wrap items-center gap-2">
        {/* Prioridade */}
        <select
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
            formData.priority === TaskPriority.URGENT 
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : formData.priority === TaskPriority.HIGH
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : formData.priority === TaskPriority.MEDIUM
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <option value={TaskPriority.LOW}>Baixa</option>
          <option value={TaskPriority.MEDIUM}>Média</option>
          <option value={TaskPriority.HIGH}>Alta</option>
          <option value={TaskPriority.URGENT}>Urgente</option>
        </select>

        {/* Data Limite */}
        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
          formData.due_date 
            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="bg-transparent border-none focus:ring-0 text-[10px] font-bold p-0 w-[90px] cursor-pointer"
            style={{ colorScheme: 'light' }}
          />
          {formData.due_date && (
            <span
              onClick={() => setFormData({ ...formData, due_date: '' })}
              className="cursor-pointer hover:text-rose-500"
            >
              ×
            </span>
          )}
        </div>

        {/* Status */}
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
            formData.status === TaskStatus.COMPLETED 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : formData.status === TaskStatus.IN_PROGRESS
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <option value={TaskStatus.PENDING}>Pendente</option>
          <option value={TaskStatus.IN_PROGRESS}>Em Andamento</option>
          <option value={TaskStatus.COMPLETED}>Concluído</option>
        </select>
      </div>
    </div>
  );
};

export default TaskInlineForm;
