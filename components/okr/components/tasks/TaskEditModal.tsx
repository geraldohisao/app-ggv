import React, { useState, useEffect, useCallback } from 'react';
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
  type Subtask,
  type TaskComment,
  type TaskActivityLog,
} from '../../types/task.types';
import { useOKRUsers, formatUserLabel, type OKRUser } from '../../hooks/useOKRUsers';
import * as taskService from '../../services/task.service';
import { useUser } from '../../../../contexts/DirectUserContext';

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
    responsible_user_id?: string | null;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  isCreating?: boolean;
  /** Se true, mostra o seletor de responsável (apenas admins) */
  canAssignResponsible?: boolean;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isCreating = false,
  canAssignResponsible = false,
}) => {
  const { user: currentUser } = useUser();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.PENDING);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  
  // Subtasks state
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  
  // Tabs state
  type TabType = 'details' | 'comments' | 'history';
  const [activeTab, setActiveTab] = useState<TabType>('details');
  
  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Activity log state
  const [activityLog, setActivityLog] = useState<TaskActivityLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Buscar lista de usuários para o picker (apenas se pode atribuir)
  const { users, loading: loadingUsers } = useOKRUsers();

  // Filtrar usuários pela busca
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Encontrar usuário responsável selecionado
  const selectedResponsible = responsibleUserId 
    ? users.find(u => u.id === responsibleUserId)
    : null;

  // Calcular progresso das subtasks
  const subtasksTotal = subtasks.length;
  const subtasksCompleted = subtasks.filter(s => s.is_completed).length;
  const subtasksProgress = subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0;

  // Preencher dados quando task muda
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority || TaskPriority.MEDIUM);
      setDueDate(task.due_date || '');
      setResponsibleUserId(task.responsible_user_id || null);
      // Carregar subtasks
      setSubtasks(task.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setStatus(TaskStatus.PENDING);
      setPriority(TaskPriority.MEDIUM);
      setDueDate('');
      setResponsibleUserId(null);
      setSubtasks([]);
    }
    setShowDeleteConfirm(false);
    setShowUserPicker(false);
    setUserSearch('');
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);
    setActiveTab('details');
    setComments([]);
    setNewComment('');
    setActivityLog([]);
  }, [task, isOpen]);

  // Carregar comentários quando tab de comentários é ativada
  useEffect(() => {
    if (activeTab === 'comments' && task?.id && task.source === TaskSource.PERSONAL) {
      setLoadingComments(true);
      taskService.getTaskComments(task.id)
        .then(setComments)
        .finally(() => setLoadingComments(false));
    }
  }, [activeTab, task?.id, task?.source]);

  // Carregar histórico quando tab de histórico é ativada
  useEffect(() => {
    if (activeTab === 'history' && task?.id && task.source === TaskSource.PERSONAL) {
      setLoadingHistory(true);
      taskService.getTaskActivityLog(task.id)
        .then(setActivityLog)
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab, task?.id, task?.source]);

  // Handlers de subtasks
  const handleAddSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim() || !task?.id || isCreating) return;
    
    setIsAddingSubtask(true);
    try {
      const newSubtask = await taskService.createSubtask({
        task_id: task.id,
        title: newSubtaskTitle.trim(),
        is_completed: false,
        position: subtasks.length,
      });
      if (newSubtask) {
        setSubtasks(prev => [...prev, newSubtask]);
        setNewSubtaskTitle('');
      }
    } catch (error) {
      console.error('Erro ao adicionar subtask:', error);
    } finally {
      setIsAddingSubtask(false);
    }
  }, [newSubtaskTitle, task?.id, isCreating, subtasks.length]);

  const handleToggleSubtask = useCallback(async (subtask: Subtask) => {
    // Atualização otimista
    setSubtasks(prev => prev.map(s => 
      s.id === subtask.id ? { ...s, is_completed: !s.is_completed } : s
    ));
    
    try {
      await taskService.toggleSubtaskComplete(subtask);
    } catch (error) {
      // Reverter em caso de erro
      setSubtasks(prev => prev.map(s => 
        s.id === subtask.id ? { ...s, is_completed: subtask.is_completed } : s
      ));
      console.error('Erro ao toggle subtask:', error);
    }
  }, []);

  const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
    // Atualização otimista
    const previousSubtasks = subtasks;
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    
    try {
      await taskService.deleteSubtask(subtaskId);
    } catch (error) {
      // Reverter em caso de erro
      setSubtasks(previousSubtasks);
      console.error('Erro ao deletar subtask:', error);
    }
  }, [subtasks]);

  // Handlers de comentários
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !task?.id || !currentUser?.id) return;
    
    setIsAddingComment(true);
    try {
      const comment = await taskService.createTaskComment({
        task_id: task.id,
        user_id: currentUser.id,
        content: newComment.trim(),
      });
      if (comment) {
        setComments(prev => [...prev, comment]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setIsAddingComment(false);
    }
  }, [newComment, task?.id, currentUser?.id]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    const previousComments = comments;
    setComments(prev => prev.filter(c => c.id !== commentId));
    
    try {
      await taskService.deleteTaskComment(commentId);
    } catch (error) {
      setComments(previousComments);
      console.error('Erro ao deletar comentário:', error);
    }
  }, [comments]);

  // Formatar data para exibição relativa
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins}min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 7) return `há ${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

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
        responsible_user_id: responsibleUserId,
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
  
  // Verificar se usuário é responsável pela task de Sprint
  const isUserResponsibleForSprintTask = () => {
    if (!task || !currentUser || task.source !== TaskSource.SPRINT) return false;
    // Verificar por ID
    if (task.responsible_user_id && task.responsible_user_id === currentUser.id) return true;
    // Fallback: verificar por nome
    if (task.responsible && currentUser.name) {
      const taskResponsible = task.responsible.toLowerCase().trim();
      const userName = currentUser.name.toLowerCase().trim();
      return taskResponsible === userName || 
             taskResponsible.includes(userName) || 
             userName.includes(taskResponsible);
    }
    return false;
  };
  
  // Pode editar tudo: task pessoal OU task de sprint onde é responsável
  const canEditFully = !isSprintTask || isUserResponsibleForSprintTask();

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

        {/* Tabs (apenas para tasks existentes e pessoais) */}
        {!isCreating && task && task.source === TaskSource.PERSONAL && (
          <div className="flex border-b border-slate-100 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'details'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Detalhes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Comentários
              {comments.length > 0 && (
                <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 rounded-full">
                  {comments.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Histórico
            </button>
          </div>
        )}

        {/* Tab Content: Details */}
        {(activeTab === 'details' || isCreating || task?.source !== TaskSource.PERSONAL) && (
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
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

          {/* Responsável (apenas para admins e tasks pessoais) */}
          {canEditFully && canAssignResponsible && (
            <div className="relative">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Responsável
              </label>
              
              {/* Seletor de responsável */}
              <div 
                onClick={() => setShowUserPicker(!showUserPicker)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between"
              >
                {selectedResponsible ? (
                  <div className="flex items-center gap-3">
                    {selectedResponsible.avatar_url ? (
                      <img 
                        src={selectedResponsible.avatar_url} 
                        alt={selectedResponsible.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                        {selectedResponsible.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-slate-800">{selectedResponsible.name}</span>
                      {selectedResponsible.cargo && (
                        <span className="text-xs text-slate-500 ml-2">{selectedResponsible.cargo}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">Selecionar responsável (opcional)</span>
                )}
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Dropdown de usuários */}
              {showUserPicker && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-lg max-h-64 overflow-hidden">
                  {/* Campo de busca */}
                  <div className="p-2 border-b border-slate-100">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Buscar usuário..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400"
                      autoFocus
                    />
                  </div>
                  
                  {/* Lista de usuários */}
                  <div className="overflow-y-auto max-h-48">
                    {/* Opção para remover responsável */}
                    <button
                      type="button"
                      onClick={() => {
                        setResponsibleUserId(null);
                        setShowUserPicker(false);
                        setUserSearch('');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 text-slate-500 text-sm"
                    >
                      Sem responsável (eu mesmo)
                    </button>

                    {loadingUsers ? (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">Carregando...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">Nenhum usuário encontrado</div>
                    ) : (
                      filteredUsers.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setResponsibleUserId(user.id);
                            setShowUserPicker(false);
                            setUserSearch('');
                          }}
                          className={`w-full px-4 py-2 text-left hover:bg-indigo-50 flex items-center gap-3 ${
                            responsibleUserId === user.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                              {user.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {user.cargo && `${user.cargo}`}
                              {user.cargo && user.department && ' · '}
                              {user.department}
                            </p>
                          </div>
                          {responsibleUserId === user.id && (
                            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtarefas/Checklist (apenas para tasks pessoais existentes) */}
          {canEditFully && !isCreating && task && (
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Subtarefas
                  {subtasksTotal > 0 && (
                    <span className="text-xs font-normal text-slate-500">
                      ({subtasksCompleted}/{subtasksTotal})
                    </span>
                  )}
                </label>
              </div>

              {/* Barra de progresso */}
              {subtasksTotal > 0 && (
                <div className="mb-4">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        subtasksProgress === 100 ? 'bg-emerald-500' : 'bg-violet-500'
                      }`}
                      style={{ width: `${subtasksProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Lista de subtarefas */}
              <div className="space-y-2 mb-3">
                {subtasks.map(subtask => (
                  <div 
                    key={subtask.id} 
                    className="flex items-center gap-3 group bg-slate-50 rounded-lg px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(subtask)}
                      className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${subtask.is_completed 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-slate-300 hover:border-violet-400'
                        }
                      `}
                    >
                      {subtask.is_completed && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${subtask.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {subtask.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(subtask.id!)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      title="Remover"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar nova subtarefa */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Adicionar subtarefa..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all"
                  disabled={isAddingSubtask}
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                  className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isAddingSubtask ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Info para tasks de sprint - só mostra se NÃO for responsável */}
          {isSprintTask && !canEditFully && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium">Esta tarefa pertence a uma Sprint</p>
              <p className="text-amber-600 mt-1">
                Você pode alterar apenas o status. Para editar outros campos, acesse a Sprint.
              </p>
            </div>
          )}
        </form>
        )}

        {/* Tab Content: Comments */}
        {activeTab === 'comments' && !isCreating && task?.source === TaskSource.PERSONAL && (
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Lista de comentários */}
            <div className="space-y-4 mb-4">
              {loadingComments ? (
                <div className="text-center py-8 text-slate-500">
                  <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Carregando comentários...
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="font-medium">Nenhum comentário ainda</p>
                  <p className="text-sm">Seja o primeiro a comentar!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 group">
                    {comment.user_avatar ? (
                      <img 
                        src={comment.user_avatar} 
                        alt={comment.user_name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                        {comment.user_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-800">{comment.user_name}</span>
                        <span className="text-xs text-slate-400">{formatRelativeTime(comment.created_at)}</span>
                        {comment.user_id === currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 transition-all"
                            title="Excluir"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Campo para novo comentário */}
            <div className="flex items-start gap-3 pt-4 border-t border-slate-100">
              {currentUser?.avatar_url ? (
                <img 
                  src={currentUser.avatar_url} 
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
                  disabled={isAddingComment}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {isAddingComment ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: History */}
        {activeTab === 'history' && !isCreating && task?.source === TaskSource.PERSONAL && (
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loadingHistory ? (
              <div className="text-center py-8 text-slate-500">
                <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Carregando histórico...
              </div>
            ) : activityLog.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">Nenhuma atividade registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLog.map(entry => (
                  <div key={entry.id} className="flex gap-3 text-sm">
                    {entry.user_avatar ? (
                      <img 
                        src={entry.user_avatar} 
                        alt={entry.user_name}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs flex-shrink-0 mt-0.5">
                        {entry.user_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-600">
                        <span className="font-medium text-slate-800">{entry.user_name}</span>
                        {' '}
                        <span>{taskService.formatActivityLogEntry(entry)}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatRelativeTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
