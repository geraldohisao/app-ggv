import React, { useEffect, useState } from 'react';
import { getGovernanceSprints } from '../services/sprint.service';
import { listSprintCheckins } from '../services/checkin.service';
import type { SprintWithItems } from '../types/sprint.types';
import { Department } from '../types/okr.types';
import { formatDateRange, getSprintTypeLabel } from '../types/sprint.types';
import { SelectInput } from '../components/shared/SelectInput';

interface GovernanceTimelineProps {
  onViewSprint?: (sprintId: string) => void;
}

export const GovernanceTimeline: React.FC<GovernanceTimelineProps> = ({ onViewSprint }) => {
  const [sprints, setSprints] = useState<SprintWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<'all' | 'concluída'>('concluída');
  const [checkinsMap, setCheckinsMap] = useState<Map<string, any[]>>(new Map());

  useEffect(() => {
    loadGovernanceSprints();
  }, [deptFilter, yearFilter, statusFilter]);

  const loadGovernanceSprints = async () => {
    setLoading(true);
    try {
      const data = await getGovernanceSprints({
        department: deptFilter === 'all' ? undefined : deptFilter,
        year: yearFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      
      setSprints(data);

      // Carregar check-ins para cada sprint
      const checkinsData = new Map<string, any[]>();
      for (const sprint of data) {
        try {
          const checkins = await listSprintCheckins(sprint.id!);
          checkinsData.set(sprint.id!, checkins);
        } catch (err) {
          console.warn('Erro ao carregar check-ins:', err);
        }
      }
      setCheckinsMap(checkinsData);
    } catch (error) {
      console.error('Erro ao carregar sprints de governança:', error);
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-10 space-y-8 bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="text-purple-600">🎯</span>
            Timeline de Governança
          </h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">
            Histórico de revisões estratégicas e decisões tomadas
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="w-48">
            <SelectInput
              value={deptFilter}
              onChange={(val) => setDeptFilter(val as any)}
              options={[
                { value: 'all', label: 'Todos Departamentos' },
                { value: Department.GENERAL, label: 'Geral' },
                { value: Department.COMMERCIAL, label: 'Comercial' },
                { value: Department.MARKETING, label: 'Marketing' },
                { value: Department.PROJECTS, label: 'Projetos' },
              ]}
            />
          </div>

          <div className="w-32">
            <SelectInput
              value={yearFilter.toString()}
              onChange={(val) => setYearFilter(parseInt(val))}
              options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
            />
          </div>

          <div className="w-40">
            <SelectInput
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={[
                { value: 'concluída', label: 'Concluídas' },
                { value: 'all', label: 'Todas' },
              ]}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="h-32 bg-slate-100 rounded"></div>
          </div>
        </div>
      ) : sprints.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-slate-400 font-semibold text-lg">Nenhuma sprint de governança encontrada</p>
          <p className="text-xs text-slate-300 mt-2">Ajuste os filtros ou crie uma nova Sprint de Governança.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Vertical */}
          <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-300 via-indigo-200 to-slate-200"></div>

          <div className="space-y-8">
            {sprints.map((sprint, index) => {
              const checkins = checkinsMap.get(sprint.id!) || [];
              const latestCheckin = checkins[0];
              const decisions = sprint.items.filter(i => i.type === 'decisão');
              const decisionsCompleted = decisions.filter(d => (d as any).decision_status === 'concluido');

              return (
                <div key={sprint.id} className="relative pl-20">
                  {/* Timeline Dot */}
                  <div className={`absolute left-6 top-6 w-5 h-5 rounded-full border-4 border-white shadow-lg ${
                    sprint.status === 'concluída' 
                      ? 'bg-purple-500' 
                      : sprint.status === 'em andamento' 
                        ? 'bg-blue-500 animate-pulse' 
                        : 'bg-slate-300'
                  }`}></div>

                  {/* Card */}
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-4 py-1.5 bg-purple-100 text-purple-700 text-xs font-black uppercase rounded-full border border-purple-200">
                            {getSprintTypeLabel(sprint.type)}
                          </span>
                          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                            {formatDateRange(sprint.start_date, sprint.end_date)}
                          </span>
                          {sprint.status === 'em andamento' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-full animate-pulse">
                              Em Andamento
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">{sprint.title}</h2>
                        <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">
                          Departamento: <span className="text-indigo-600 capitalize">{sprint.department}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => onViewSprint?.(sprint.id!)}
                        className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold hover:bg-indigo-100 transition-all text-sm group-hover:shadow-md"
                      >
                        Ver Detalhes →
                      </button>
                    </div>

                    {/* Executive Summary */}
                    {latestCheckin && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 mb-6">
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Resumo Executivo
                        </h3>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                          "{latestCheckin.summary}"
                        </p>

                        {/* Aprendizados-chave (Governança) */}
                        {latestCheckin.learnings && (
                          <div className="mt-4 pt-4 border-t border-indigo-200">
                            <p className="text-xs font-black text-indigo-600 uppercase mb-2">💡 Aprendizados:</p>
                            <p className="text-xs text-slate-600 whitespace-pre-line">{latestCheckin.learnings}</p>
                          </div>
                        )}

                        {/* Recomendações */}
                        {latestCheckin.strategic_recommendations && (
                          <div className="mt-3">
                            <p className="text-xs font-black text-purple-600 uppercase mb-2">📋 Recomendações:</p>
                            <p className="text-xs text-slate-600 whitespace-pre-line">{latestCheckin.strategic_recommendations}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Métricas Rápidas */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-slate-50 rounded-2xl">
                        <div className="text-2xl font-black text-indigo-600">{checkins.length}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">Check-ins</div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-2xl">
                        <div className="text-2xl font-black text-purple-600">{decisions.length}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">Decisões</div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-2xl">
                        <div className="text-2xl font-black text-emerald-600">{decisionsCompleted.length}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">Executadas</div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-2xl">
                        <div className={`text-2xl font-black ${
                          latestCheckin?.health === 'verde' ? 'text-emerald-600' :
                          latestCheckin?.health === 'amarelo' ? 'text-amber-600' :
                          'text-rose-600'
                        }`}>
                          {latestCheckin?.health === 'verde' ? '✅' :
                           latestCheckin?.health === 'amarelo' ? '⚠️' :
                           latestCheckin?.health === 'vermelho' ? '🔴' : '—'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">Saúde</div>
                      </div>
                    </div>

                    {/* Decisões em Destaque */}
                    {decisions.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3">
                          Decisões Estratégicas
                        </h4>
                        <div className="space-y-2">
                          {decisions.slice(0, 3).map((decision: any) => (
                            <div key={decision.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className={`mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                decision.decision_status === 'concluido' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : decision.decision_status === 'em_execucao'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}>
                                {decision.decision_status === 'concluido' ? '✓' : 
                                 decision.decision_status === 'em_execucao' ? '⚙️' : '📝'}
                              </div>
                              <p className="text-xs font-semibold text-slate-700 flex-1">
                                {decision.title}
                              </p>
                            </div>
                          ))}
                          {decisions.length > 3 && (
                            <button 
                              onClick={() => onViewSprint?.(sprint.id!)}
                              className="text-xs text-indigo-600 font-bold hover:underline"
                            >
                              + {decisions.length - 3} decisões
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
