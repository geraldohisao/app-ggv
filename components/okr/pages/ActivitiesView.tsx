import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useUser } from '../../../contexts/DirectUserContext';
import { UserRole } from '../../../types';
import * as taskService from '../services/task.service';
import * as sprintService from '../services/sprint.service';
import {
  TaskStatus,
  TaskSource,
  TaskPriority,
  calculateTaskMetrics,
  type UnifiedTask,
  type TaskFilters,
} from '../types/task.types';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskKanbanView } from '../components/tasks/TaskKanbanView';
import { TaskQuickAdd } from '../components/tasks/TaskQuickAdd';
import { TaskEditModal } from '../components/tasks/TaskEditModal';
import { LoadingState } from '../components/shared/LoadingState';

type ViewMode = 'list' | 'kanban';
type FilterStatus = 'all' | 'pending' | 'completed';
type FilterOwner = 'mine' | 'all';
type FilterDatePeriod = 'all' | 'overdue' | 'today' | 'week' | 'month';
type FilterPriority = 'all' | TaskPriority;

interface ActivitiesViewProps {
  onSprintClick?: (sprintId: string) => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({ onSprintClick }) => {
  const { user } = useUser();
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterOwner, setFilterOwner] = useState<FilterOwner>('mine');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros avançados
  const [filterDatePeriod, setFilterDatePeriod] = useState<FilterDatePeriod>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [filterSprint, setFilterSprint] = useState<string>('all'); // 'all' ou sprint_id
  const [filterResponsible, setFilterResponsible] = useState<string>('all'); // 'all' ou nome do responsável
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Modal state
  const [editingTask, setEditingTask] = useState<UnifiedTask | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Verificar se usuário é admin (pode ver tarefas de outros e atribuir)
  // Apenas CEO, HEAD, SUPER_ADMIN e ADMIN podem
  const isAdminUser = useMemo(() => {
    if (!user) return false;
    const role = user.role;
    const cargo = user.cargo?.toUpperCase() || '';
    
    return (
      role === UserRole.SuperAdmin ||
      role === UserRole.Admin ||
      cargo.includes('CEO') ||
      cargo.includes('HEAD') ||
      cargo.includes('DIRETOR') ||
      cargo.includes('GERENTE')
    );
  }, [user]);
  
  const canAssignResponsible = isAdminUser;

  // Função para verificar se usuário pode editar uma task específica
  const canEditTask = useCallback((task: UnifiedTask): boolean => {
    if (!user) return false;
    
    // Task pessoal: só pode editar se for o dono ou admin
    if (task.source === TaskSource.PERSONAL) {
      return task.user_id === user.id || isAdminUser;
    }
    
    // Task de Sprint: pode editar se for responsável ou admin
    // Verificar por ID
    if (task.responsible_user_id && task.responsible_user_id === user.id) return true;
    // Fallback: verificar por nome
    if (task.responsible && user.name) {
      const taskResponsible = task.responsible.toLowerCase().trim();
      const userName = user.name.toLowerCase().trim();
      if (taskResponsible === userName || 
          taskResponsible.includes(userName) || 
          userName.includes(taskResponsible)) {
        return true;
      }
    }
    // Admin pode editar qualquer task
    return isAdminUser;
  }, [user, isAdminUser]);

  // Carregar tasks
  const loadTasks = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Se é admin e quer ver "Todas", buscar todas as tasks
      // Senão, buscar apenas as do usuário
      let data: UnifiedTask[];
      if (isAdminUser && filterOwner === 'all') {
        data = await taskService.getAllTasks();
      } else {
        data = await taskService.getMyTasks(user.id);
      }
      setTasks(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterOwner, isAdminUser]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Lista de sprints disponíveis (derivada das tasks)
  const availableSprints = useMemo(() => {
    const sprints = new Map<string, { id: string; title: string }>();
    tasks.forEach(t => {
      if (t.source === TaskSource.SPRINT && t.sprint_id && t.sprint_title) {
        sprints.set(t.sprint_id, { id: t.sprint_id, title: t.sprint_title });
      }
    });
    return Array.from(sprints.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [tasks]);

  // Lista de responsáveis disponíveis (derivada das tasks)
  const availableResponsibles = useMemo(() => {
    const responsibles = new Map<string, string>();
    tasks.forEach(t => {
      if (t.responsible) {
        // Usar o nome como chave para evitar duplicatas
        responsibles.set(t.responsible.toLowerCase().trim(), t.responsible);
      }
    });
    return Array.from(responsibles.values()).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Verificar se algum filtro avançado está ativo
  const hasActiveAdvancedFilter = filterDatePeriod !== 'all' || filterPriority !== 'all' || filterSprint !== 'all' || filterResponsible !== 'all';

  // Filtros
  const filters: TaskFilters = useMemo(() => ({
    status: filterStatus === 'pending' ? TaskStatus.PENDING : 
            filterStatus === 'completed' ? TaskStatus.COMPLETED : 
            'all',
    search: searchTerm || undefined,
  }), [filterStatus, searchTerm]);

  // Filtrar tasks para exibição
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filtro de ownership - "Minhas Tarefas" vs "Todas"
    if (filterOwner === 'mine') {
      result = result.filter(t => 
        t.source === TaskSource.PERSONAL || 
        t.responsible_user_id === user?.id
      );
    }

    // Filtro de status
    // OBS: No Kanban não filtramos por status, senão itens "somem" ao arrastar entre colunas
    if (viewMode === 'list') {
      if (filterStatus === 'pending') {
        result = result.filter(t => t.status !== TaskStatus.COMPLETED);
      } else if (filterStatus === 'completed') {
        result = result.filter(t => t.status === TaskStatus.COMPLETED);
      }
    }

    // Filtro por período de data (aplicado em ambos os modos)
    if (filterDatePeriod !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (7 - today.getDay())); // Próximo domingo
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      result = result.filter(t => {
        if (!t.due_date) return filterDatePeriod === 'all'; // Sem data só aparece em "todas"
        
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);

        switch (filterDatePeriod) {
          case 'overdue':
            return dueDate < today && t.status !== TaskStatus.COMPLETED;
          case 'today':
            return dueDate.getTime() === today.getTime();
          case 'week':
            return dueDate >= today && dueDate <= endOfWeek;
          case 'month':
            return dueDate >= today && dueDate <= endOfMonth;
          default:
            return true;
        }
      });
    }

    // Filtro por prioridade (apenas para tasks pessoais)
    if (filterPriority !== 'all') {
      result = result.filter(t => 
        t.source === TaskSource.SPRINT || // Sprint tasks não têm prioridade, passam
        t.priority === filterPriority
      );
    }

    // Filtro por sprint
    if (filterSprint !== 'all') {
      result = result.filter(t => 
        t.source === TaskSource.SPRINT && t.sprint_id === filterSprint
      );
    }

    // Filtro por responsável
    if (filterResponsible !== 'all') {
      result = result.filter(t => {
        if (!t.responsible) return false;
        return t.responsible.toLowerCase().trim() === filterResponsible.toLowerCase().trim();
      });
    }

    // Busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        t.sprint_title?.toLowerCase().includes(search) ||
        t.responsible?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [tasks, filterStatus, filterOwner, searchTerm, user?.id, viewMode, filterDatePeriod, filterPriority, filterSprint, filterResponsible]);

  // Métricas (baseado no filtro de ownership atual)
  const metrics = useMemo(() => {
    const tasksForMetrics = filterOwner === 'mine' 
      ? tasks.filter(t => t.source === TaskSource.PERSONAL || t.responsible_user_id === user?.id)
      : tasks;
    return calculateTaskMetrics(tasksForMetrics);
  }, [tasks, filterOwner, user?.id]);

  // Handlers
  const handleQuickAdd = async (title: string) => {
    try {
      await taskService.quickAddTask(title, user?.id);
      await loadTasks();
    } catch (err) {
      console.error('Erro ao adicionar atividade:', err);
      throw err;
    }
  };

  const handleToggleComplete = async (task: UnifiedTask) => {
    try {
      await taskService.toggleTaskComplete(task);
      // Atualizar localmente para resposta imediata
      setTasks(prev => prev.map(t => 
        t.id === task.id && t.source === task.source
          ? { ...t, status: t.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED }
          : t
      ));
    } catch (err) {
      console.error('Erro ao atualizar atividade:', err);
      await loadTasks(); // Recarregar em caso de erro
    }
  };

  const handleStatusChange = async (task: UnifiedTask, newStatus: TaskStatus) => {
    try {
      await taskService.updateTaskStatus(task.id, newStatus, task.source);
      // Atualizar localmente
      setTasks(prev => prev.map(t => 
        t.id === task.id && t.source === task.source
          ? { ...t, status: newStatus }
          : t
      ));
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      await loadTasks();
    }
  };

  const handleEdit = (task: UnifiedTask) => {
    setEditingTask(task);
    setIsCreating(false);
    setShowEditModal(true);
  };

  const handleDelete = async (task: UnifiedTask) => {
    if (task.source !== TaskSource.PERSONAL) return;
    
    try {
      await taskService.deletePersonalTask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      console.error('Erro ao excluir atividade:', err);
    }
  };

  // Helper para verificar se usuário é responsável pela task de Sprint
  const isUserResponsibleForTask = (task: UnifiedTask) => {
    if (!user || task.source !== TaskSource.SPRINT) return false;
    // Verificar por ID
    if (task.responsible_user_id && task.responsible_user_id === user.id) return true;
    // Fallback: verificar por nome
    if (task.responsible && user.name) {
      const taskResponsible = task.responsible.toLowerCase().trim();
      const userName = user.name.toLowerCase().trim();
      return taskResponsible === userName || 
             taskResponsible.includes(userName) || 
             userName.includes(taskResponsible);
    }
    return false;
  };

  const handleSaveTask = async (data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
    responsible_user_id?: string | null;
  }) => {
    try {
      if (isCreating) {
        if (!user?.id) {
          throw new Error('Usuário não identificado');
        }
        await taskService.createPersonalTask({
          user_id: user.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date || undefined,
          responsible_user_id: canAssignResponsible ? data.responsible_user_id ?? undefined : undefined,
        });
      } else if (editingTask) {
        if (editingTask.source === TaskSource.PERSONAL) {
          await taskService.updatePersonalTask(editingTask.id, {
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            due_date: data.due_date,
            responsible_user_id: canAssignResponsible ? data.responsible_user_id : editingTask.responsible_user_id,
          });
        } else if (isUserResponsibleForTask(editingTask)) {
          // Para tasks de sprint onde o usuário é responsável, atualiza todos os campos
          let sprintStatus = 'pendente';
          if (data.status === TaskStatus.COMPLETED) {
            sprintStatus = 'concluído';
          } else if (data.status === TaskStatus.IN_PROGRESS) {
            sprintStatus = 'em andamento';
          }
          
          await sprintService.updateSprintItem(editingTask.id, {
            title: data.title,
            description: data.description,
            status: sprintStatus,
            due_date: data.due_date || undefined,
          });
        } else {
          // Para tasks de sprint onde NÃO é responsável, só atualiza status
          await taskService.updateTaskStatus(editingTask.id, data.status, editingTask.source);
        }
      }
      await loadTasks();
    } catch (err) {
      console.error('Erro ao salvar atividade:', err);
      throw err;
    }
  };

  const handleSaveInlineEdit = async (task: UnifiedTask, data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
  }) => {
    try {
      if (task.source === TaskSource.PERSONAL) {
        await taskService.updatePersonalTask(task.id, {
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date,
        });
      } else if (isUserResponsibleForTask(task)) {
        // Para tasks de sprint onde o usuário é responsável, atualiza todos os campos
        // Mapear status para formato do sprint
        let sprintStatus = 'pendente';
        if (data.status === TaskStatus.COMPLETED) {
          sprintStatus = 'concluído';
        } else if (data.status === TaskStatus.IN_PROGRESS) {
          sprintStatus = 'em andamento';
        }
        
        await sprintService.updateSprintItem(task.id, {
          title: data.title,
          description: data.description,
          status: sprintStatus,
          due_date: data.due_date || undefined,
        });
      } else {
        // Para tasks de sprint onde NÃO é responsável, só atualiza status
        await taskService.updateTaskStatus(task.id, data.status, task.source);
      }
      await loadTasks();
    } catch (err) {
      console.error('Erro ao salvar atividade inline:', err);
      throw err;
    }
  };

  const handleDeleteFromModal = async () => {
    if (editingTask && editingTask.source === TaskSource.PERSONAL) {
      await handleDelete(editingTask);
    }
  };

  const handleCreateNew = () => {
    setEditingTask(null);
    setIsCreating(true);
    setShowEditModal(true);
  };

  // Mostrar loading apenas no carregamento inicial (sem tasks carregadas)
  // NÃO mostrar loading durante refreshes (evita "piscar" a UI)
  if (loading && tasks.length === 0) {
    return <LoadingState message="Carregando atividades..." />;
  }

  if (error) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 py-10">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <p className="text-rose-600 font-medium">{error}</p>
          <button
            onClick={loadTasks}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-10 space-y-6 bg-[#F8FAFC]">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Atividades
          </h1>
          <p className="text-slate-500 text-sm sm:text-lg mt-1 font-medium">
            {metrics.pending + metrics.in_progress} pendente{metrics.pending + metrics.in_progress !== 1 ? 's' : ''} · {metrics.completed} concluída{metrics.completed !== 1 ? 's' : ''}
            {metrics.overdue > 0 && (
              <span className="text-rose-500 ml-2">· {metrics.overdue} atrasada{metrics.overdue !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Busca */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm w-40 sm:w-56"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filtro de Ownership - Minhas Tarefas / Todas */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
            <button
              onClick={() => setFilterOwner('mine')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                filterOwner === 'mine'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Minhas Tarefas
            </button>
            <button
              onClick={() => setFilterOwner('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                filterOwner === 'all'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Todas
            </button>
          </div>

          {/* Filtros de Status */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  filterStatus === 'pending'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  filterStatus === 'completed'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Concluídas
              </button>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todas
              </button>
            </div>
          )}

          {/* Toggle de Visualização */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Visao Lista"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => {
                setViewMode('kanban');
              }}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Visao Kanban"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>

          {/* Botão Filtros Avançados */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`p-2 rounded-xl transition-all relative ${
              showAdvancedFilters || hasActiveAdvancedFilter
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-slate-100'
            } border shadow-sm`}
            title="Filtros Avançados"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {hasActiveAdvancedFilter && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
            )}
          </button>

          {/* Botao Nova Tarefa */}
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nova Tarefa</span>
          </button>
        </div>
      </header>

      {/* Painel de Filtros Avançados */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros Avançados
            </h3>
            {hasActiveAdvancedFilter && (
              <button
                onClick={() => {
                  setFilterDatePeriod('all');
                  setFilterPriority('all');
                  setFilterSprint('all');
                  setFilterResponsible('all');
                }}
                className="text-sm text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpar filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Filtro por Período */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Período
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  { value: 'all' as FilterDatePeriod, label: 'Todas', icon: '📅' },
                  { value: 'overdue' as FilterDatePeriod, label: 'Atrasadas', icon: '🔴' },
                  { value: 'today' as FilterDatePeriod, label: 'Hoje', icon: '📍' },
                  { value: 'week' as FilterDatePeriod, label: 'Esta semana', icon: '📆' },
                  { value: 'month' as FilterDatePeriod, label: 'Este mês', icon: '🗓️' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterDatePeriod(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterDatePeriod === opt.value
                        ? opt.value === 'overdue' 
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    } border`}
                  >
                    <span className="mr-1">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Prioridade */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Prioridade
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterPriority('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterPriority === 'all'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  } border`}
                >
                  Todas
                </button>
                {[
                  { value: TaskPriority.URGENT, label: 'Urgente', color: 'bg-rose-100 text-rose-700 border-rose-200' },
                  { value: TaskPriority.HIGH, label: 'Alta', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                  { value: TaskPriority.MEDIUM, label: 'Média', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                  { value: TaskPriority.LOW, label: 'Baixa', color: 'bg-slate-100 text-slate-600 border-slate-200' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterPriority(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterPriority === opt.value
                        ? opt.color
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    } border`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Sprint */}
            {availableSprints.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Sprint
                </label>
                <select
                  value={filterSprint}
                  onChange={(e) => setFilterSprint(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    filterSprint !== 'all'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-amber-200`}
                >
                  <option value="all">Todas as sprints</option>
                  {availableSprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro por Responsável - só mostra se tem responsáveis */}
            {availableResponsibles.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Responsável
                </label>
                <select
                  value={filterResponsible}
                  onChange={(e) => setFilterResponsible(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    filterResponsible !== 'all'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-200`}
                >
                  <option value="all">Todos os responsáveis</option>
                  {availableResponsibles.map(responsible => (
                    <option key={responsible} value={responsible}>
                      {responsible}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add */}
      <div className="max-w-2xl">
        <TaskQuickAdd
          onAdd={handleQuickAdd}
          placeholder="Adicionar tarefa rapida... (pressione Enter)"
        />
      </div>

      {/* Conteudo */}
      <div className="mt-8">
        {viewMode === 'list' ? (
          <TaskListView
            tasks={filteredTasks}
            userId={user?.id}
            userName={user?.name}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onSaveEdit={handleSaveInlineEdit}
            canEditTask={canEditTask}
            emptyMessage={
              filterStatus === 'completed' 
                ? 'Nenhuma atividade concluida' 
                : filterStatus === 'pending'
                ? 'Nenhuma atividade pendente'
                : 'Nenhuma atividade encontrada'
            }
          />
        ) : (
          <TaskKanbanView
            tasks={filteredTasks}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canEditTask={canEditTask}
          />
        )}
      </div>

      {/* Modal de Edicao - Apenas para Kanban e Nova Tarefa */}
      <TaskEditModal
        task={editingTask}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
          setIsCreating(false);
        }}
        onSave={handleSaveTask}
        onDelete={editingTask?.source === TaskSource.PERSONAL ? handleDeleteFromModal : undefined}
        isCreating={isCreating}
        canAssignResponsible={canAssignResponsible}
      />
    </div>
  );
};

export default ActivitiesView;
