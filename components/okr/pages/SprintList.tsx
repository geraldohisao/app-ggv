import React, { useEffect, useState } from 'react';
import { useSprintStore } from '../store/sprintStore';
import { SprintCard } from '../components/sprint/SprintCard';
import { EmptyState } from '../components/shared/EmptyState';
import { LoadingState } from '../components/shared/LoadingState';
import { usePermissions } from '../hooks/usePermissions';
import { SprintType, SprintStatus } from '../types/sprint.types';
import { Department } from '../types/okr.types';

interface SprintListProps {
  onCreateNew?: () => void;
  onEdit?: (sprint: any) => void;
  onSprintClick?: (sprintId: string) => void;
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
  const [typeFilter, setTypeFilter] = useState<SprintType | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SprintStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSprints();
    fetchMetrics();
  }, []);

  useEffect(() => {
    const filters: any = {};
    if (typeFilter !== 'all') filters.type = typeFilter;
    if (deptFilter !== 'all') filters.department = deptFilter;
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (searchTerm) filters.search = searchTerm;
    fetchSprints(filters);
  }, [typeFilter, deptFilter, statusFilter, searchTerm]);

  const handleSprintClick = (sprint: typeof sprints[0]) => {
    if (onSprintClick && sprint.id) {
      onSprintClick(sprint.id);
    }
  };

  if (loading && sprints.length === 0) return <LoadingState message="Carregando Sprints..." />;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-10 space-y-8 bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Ritmo de Gestão</h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">Gestão de Sprints e Rituais (Semanais a Anuais).</p>
        </div>

        {permissions.sprint.canCreate && (
          <button
            onClick={onCreateNew}
            className="bg-[#5B5FF5] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:brightness-110 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="text-2xl">+</span> Nova Sprint
          </button>
        )}
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total</p>
          <p className="text-4xl font-black text-slate-900">{metrics.total}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Planejadas</p>
          <p className="text-4xl font-black text-slate-700">{metrics.planned}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Em Andamento</p>
          <p className="text-4xl font-black text-blue-600">{metrics.in_progress}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Concluídas</p>
          <p className="text-4xl font-black text-emerald-600">{metrics.completed}</p>
        </div>
      </div>

      {/* Filtros Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar sprints..."
          className="flex-1 min-w-[240px] bg-white rounded-full px-6 py-3 border border-slate-200 focus:ring-2 focus:ring-[#5B5FF5] text-sm font-medium placeholder:text-slate-300 shadow-sm"
        />

        <div className="flex gap-2">
          {['all', SprintType.WEEKLY, SprintType.MONTHLY, SprintType.QUARTERLY, SprintType.SEMI_ANNUAL, SprintType.ANNUAL].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type as any)}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${typeFilter === type
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
          className="bg-white rounded-full px-6 py-3 border border-slate-200 text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-[#5B5FF5] shadow-sm"
        >
          <option value="all">Todos Departamentos</option>
          <option value={Department.GENERAL}>Geral</option>
          <option value={Department.COMMERCIAL}>Comercial</option>
          <option value={Department.MARKETING}>Marketing</option>
          <option value={Department.PROJECTS}>Projetos</option>
        </select>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
          <p className="text-rose-800 font-medium">{error}</p>
        </div>
      )}

      {sprints.length === 0 ? (
        <EmptyState
          title="Nenhuma Sprint encontrada"
          description="Comece criando sua primeira Sprint semanal, mensal ou trimestral."
          action={permissions.sprint.canCreate ? { label: 'Criar Primeira Sprint', onClick: onCreateNew! } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              onClick={() => handleSprintClick(sprint)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
