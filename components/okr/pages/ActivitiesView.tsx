import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useUser } from '../../../contexts/DirectUserContext';
import * as taskService from '../services/task.service';
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
  
  // Modal state
  const [editingTask, setEditingTask] = useState<UnifiedTask | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Carregar tasks
  const loadTasks = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await taskService.getMyTasks(user.id);
      setTasks(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
    if (filterStatus === 'pending') {
      result = result.filter(t => t.status !== TaskStatus.COMPLETED);
    } else if (filterStatus === 'completed') {
      result = result.filter(t => t.status === TaskStatus.COMPLETED);
    }

    // Busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        t.sprint_title?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [tasks, filterStatus, filterOwner, searchTerm, user?.id]);

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

  const handleSaveTask = async (data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
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
        });
      } else if (editingTask) {
        if (editingTask.source === TaskSource.PERSONAL) {
          await taskService.updatePersonalTask(editingTask.id, {
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            due_date: data.due_date,
          });
        } else {
          // Para tasks de sprint, só atualiza status
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
      } else {
        // Para tasks de sprint, só atualiza status
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

  if (loading) {
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
              onClick={() => setViewMode('kanban')}
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
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onSaveEdit={handleSaveInlineEdit}
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
      />
    </div>
  );
};

export default ActivitiesView;
