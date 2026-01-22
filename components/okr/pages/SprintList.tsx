import React, { useEffect, useState, useMemo } from 'react';
import { useSprintStore } from '../store/sprintStore';
import { SprintCard } from '../components/sprint/SprintCard';
import { EmptyState } from '../components/shared/EmptyState';
import { LoadingState } from '../components/shared/LoadingState';
import { usePermissions } from '../hooks/usePermissions';
import { useUser } from '../../../contexts/DirectUserContext';
import { useOKRUsers } from '../hooks/useOKRUsers';
import { SprintType, SprintStatus, SprintWithItems } from '../types/sprint.types';
import { Department } from '../types/okr.types';

// Calcula score de urgência para ordenação
function getUrgencyScore(sprint: SprintWithItems): number {
  const now = new Date();
  const endDate = sprint.end_date ? new Date(sprint.end_date) : null;
  const startDate = sprint.start_date ? new Date(sprint.start_date) : null;
  
  // Se não tem data de término, usar data de início
  const daysRemaining = endDate 
    ? (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    : startDate 
      ? (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
  
  // Sprints em andamento têm prioridade máxima
  if (sprint.status === 'em_andamento') {
    if (daysRemaining < 0) return 1000; // Atrasada - máxima urgência
    if (daysRemaining < 3) return 900 + (3 - daysRemaining) * 10; // Urgente (0-3 dias)
    if (daysRemaining < 7) return 800 + (7 - daysRemaining) * 5; // Próxima de vencer
    return 700 - Math.min(daysRemaining, 100); // Ativa normal
  }
  
  // Sprints planejadas - próximas de começar primeiro
  if (sprint.status === 'planejado') {
    const daysToStart = startDate 
      ? (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    if (daysToStart < 0) return 600; // Deveria ter começado
    if (daysToStart < 7) return 500 + (7 - daysToStart) * 5; // Começa em breve
    return 400 - Math.min(daysToStart, 100);
  }
  
  // Concluídas - mais recentes primeiro
  if (sprint.status === 'concluído') {
    const daysSinceEnd = endDate
      ? (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    return 200 - Math.min(daysSinceEnd, 100);
  }
  
  // Canceladas por último
  return 0;
}

// Ordena sprints por urgência
function sortSprintsByUrgency(sprints: SprintWithItems[]): SprintWithItems[] {
  return [...sprints].sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));
}

interface SprintListProps {
  onCreateNew?: () => void;
  onEdit?: (sprint: any) => void;
  onSprintClick?: (sprintId: string) => void;
}

// Chave para localStorage
const FILTER_STORAGE_KEY = 'sprintListFilters';

// Função para carregar filtros salvos
function loadSavedFilters(): { type: SprintType | 'all'; dept: Department | 'all'; status: SprintStatus | 'all' } {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        type: parsed.type || 'all',
        dept: parsed.dept || 'all',
        status: parsed.status || 'all',
      };
    }
  } catch (e) {
    console.warn('Erro ao carregar filtros salvos:', e);
  }
  return { type: 'all', dept: 'all', status: 'all' };
}

// Função para salvar filtros
function saveFilters(filters: { type: SprintType | 'all'; dept: Department | 'all'; status: SprintStatus | 'all' }) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch (e) {
    console.warn('Erro ao salvar filtros:', e);
  }
}

export const SprintList: React.FC<SprintListProps> = ({ onCreateNew, onEdit, onSprintClick }) => {
  const {
    sprints,
    metrics,
    loading,
    error,
    fetchSprints,
    fetchMetrics,
  } = useSprintStore();

  const permissions = usePermissions();
  const { user } = useUser();
  const { users: okrUsers } = useOKRUsers();
  
  // Carregar filtros salvos no estado inicial
  const savedFilters = useMemo(() => loadSavedFilters(), []);
  const [typeFilter, setTypeFilter] = useState<SprintType | 'all'>(savedFilters.type);
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>(savedFilters.dept);
  const [statusFilter, setStatusFilter] = useState<SprintStatus | 'all'>(savedFilters.status);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSprints(
      undefined,
      permissions.isOP
        ? { userId: user?.id || null, userDepartment: permissions.userDepartment, isAdmin: false }
        : { isAdmin: true }
    );
    fetchMetrics();
  }, [permissions.isOP, permissions.userDepartment, user?.id]);

  // Salvar filtros quando mudarem
  useEffect(() => {
    saveFilters({ type: typeFilter, dept: deptFilter, status: statusFilter });
  }, [typeFilter, deptFilter, statusFilter]);

  useEffect(() => {
    const filters: any = {};
    if (typeFilter !== 'all') filters.type = typeFilter;
    if (deptFilter !== 'all') filters.department = deptFilter;
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (searchTerm) filters.search = searchTerm;
    fetchSprints(
      filters,
      permissions.isOP
        ? { userId: user?.id || null, userDepartment: permissions.userDepartment, isAdmin: false }
        : { isAdmin: true }
    );
  }, [typeFilter, deptFilter, statusFilter, searchTerm, permissions.isOP, permissions.userDepartment, user?.id]);

  const handleSprintClick = (sprint: typeof sprints[0]) => {
    if (onSprintClick && sprint.id) {
      onSprintClick(sprint.id);
    }
  };

  // Ordenar sprints por urgência
  const sortedSprints = useMemo(() => sortSprintsByUrgency(sprints), [sprints]);
  const usersById = useMemo(() => {
    const map = new Map<string, typeof okrUsers[number]>();
    okrUsers.forEach((user) => map.set(user.id, user));
    return map;
  }, [okrUsers]);

  const resolveResponsibleUser = (sprint: SprintWithItems) => {
    if ((sprint as any).responsible_user_id) {
      return usersById.get((sprint as any).responsible_user_id) || null;
    }
    const name = (sprint as any).responsible;
    if (!name) return null;
    return okrUsers.find((user) => user.name.toLowerCase() === name.toLowerCase()) || null;
  };

  if (loading && sprints.length === 0) return <LoadingState message="Carregando Sprints..." />;

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-10 space-y-4 sm:space-y-8 bg-[#F8FAFC]">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Ritmo de Gestão</h1>
          <p className="text-slate-500 text-sm sm:text-lg mt-1 sm:mt-2 font-medium">Gestão de Sprints e Rituais</p>
        </div>

        {permissions.sprint.canCreate && (
          <button
            onClick={onCreateNew}
            className="bg-[#5B5FF5] text-white px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold shadow-lg shadow-indigo-200 hover:brightness-110 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="text-lg sm:text-2xl">+</span> <span className="hidden sm:inline">Nova Sprint</span><span className="sm:hidden">Nova</span>
          </button>
        )}
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-100 shadow-sm">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-2">Total</p>
          <p className="text-2xl sm:text-4xl font-black text-slate-900">{metrics.total}</p>
        </div>
        <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-100">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-2">Planejadas</p>
          <p className="text-2xl sm:text-4xl font-black text-slate-700">{metrics.planned}</p>
        </div>
        <div className="bg-blue-50 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-blue-100">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 sm:mb-2">Em Andamento</p>
          <p className="text-2xl sm:text-4xl font-black text-blue-600">{metrics.in_progress}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-emerald-100">
          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 sm:mb-2">Concluídas</p>
          <p className="text-2xl sm:text-4xl font-black text-emerald-600">{metrics.completed}</p>
        </div>
      </div>

      {/* Filtros Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar sprints..."
          className="flex-1 min-w-[200px] sm:min-w-[240px] bg-white rounded-full px-4 sm:px-6 py-2.5 sm:py-3 border border-slate-200 focus:ring-2 focus:ring-[#5B5FF5] text-sm font-medium placeholder:text-slate-300 shadow-sm"
        />

        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {['all', SprintType.WEEKLY, SprintType.MONTHLY, SprintType.QUARTERLY, SprintType.SEMI_ANNUAL, SprintType.ANNUAL].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type as any)}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${typeFilter === type
                  ? 'bg-[#5B5FF5] text-white shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-200'
                }`}
            >
              {type === 'all'
                ? 'Todas'
                : type === 'semanal'
                  ? 'Semanal'
                  : type === 'mensal'
                    ? 'Mensal'
                    : type === 'trimestral'
                      ? 'Trimestral'
                      : type === 'semestral'
                        ? 'Semestral'
                        : 'Anual'}
            </button>
          ))}
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value as any)}
          className="bg-white rounded-full px-4 sm:px-6 py-2.5 sm:py-3 border border-slate-200 text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-[#5B5FF5] shadow-sm"
        >
          <option value="all">Todos Departamentos</option>
          <option value={Department.GENERAL}>Geral</option>
          <option value={Department.COMMERCIAL}>Comercial</option>
          <option value={Department.MARKETING}>Marketing</option>
          <option value={Department.PROJECTS}>Projetos</option>
        </select>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <p className="text-rose-800 font-medium text-sm sm:text-base">{error}</p>
        </div>
      )}

      {sortedSprints.length === 0 ? (
        <EmptyState
          title="Nenhuma Sprint encontrada"
          description="Comece criando sua primeira Sprint semanal, mensal ou trimestral."
          action={permissions.sprint.canCreate ? { label: 'Criar Primeira Sprint', onClick: onCreateNew! } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 items-stretch">
          {sortedSprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              responsibleUser={resolveResponsibleUser(sprint)}
              responsibleName={(sprint as any).responsible || null}
              onClick={() => handleSprintClick(sprint)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
