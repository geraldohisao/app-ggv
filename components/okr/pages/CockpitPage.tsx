import React, { useEffect, useState } from 'react';
import { parseLocalDate } from '../utils/date';
import { getGovernanceSprints, listDecisions } from '../services/sprint.service';
import { listSprintCheckins } from '../services/checkin.service';
import type { SprintWithItems, SprintItem } from '../types/sprint.types';
import { Department } from '../types/okr.types';
import { formatDateRange, getSprintTypeLabel, getDecisionTypeLabel, getDecisionStatusLabel, getDecisionStatusColor } from '../types/sprint.types';
import { SelectInput } from '../components/shared/SelectInput';
import { StrategicKRDashboard } from '../components/cockpit/StrategicKRDashboard';
import { usePermissions } from '../hooks/usePermissions';

interface CockpitPageProps {
  onViewSprint?: (sprintId: string) => void;
}

export const CockpitPage: React.FC<CockpitPageProps> = ({ onViewSprint }) => {
  const permissions = usePermissions();
  
  // Filtro global de departamento (usado no Cockpit)
  const [globalDeptFilter, setGlobalDeptFilter] = useState<Department | 'all'>('all');
  
  // Se usuário for HEAD, iniciar com filtro do próprio departamento
  useEffect(() => {
    if (permissions.isHEAD && permissions.userDepartment) {
      setGlobalDeptFilter(permissions.userDepartment as Department);
    }
  }, [permissions.isHEAD, permissions.userDepartment]);

  // Estado para Timeline de Governança
  const [sprints, setSprints] = useState<SprintWithItems[]>([]);
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<'all' | 'concluída'>('concluída');
  const [checkinsMap, setCheckinsMap] = useState<Map<string, any[]>>(new Map());

  // Estado para Decisões
  const [decisions, setDecisions] = useState<SprintItem[]>([]);
  const [loadingDecisions, setLoadingDecisions] = useState(false);

  // Carregar sprints de governança
  useEffect(() => {
    loadGovernanceSprints();
  }, [globalDeptFilter, yearFilter, statusFilter]);

  const loadGovernanceSprints = async () => {
    setLoadingSprints(true);
    try {
      const data = await getGovernanceSprints({
        department: globalDeptFilter === 'all' ? undefined : globalDeptFilter,
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
      setLoadingSprints(false);
    }
  };

  // Carregar decisões
  useEffect(() => {
    loadDecisions();
  }, [globalDeptFilter]);

  const loadDecisions = async () => {
    setLoadingDecisions(true);
    try {
      const data = await listDecisions({
        department: globalDeptFilter === 'all' ? undefined : globalDeptFilter,
      });
      setDecisions(data || []);
    } catch (error) {
      console.error('Erro ao carregar decisões:', error);
    } finally {
      setLoadingDecisions(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Determinar se o usuário pode ver todos os departamentos
  const canSeeAllDepartments = permissions.isCEO || !permissions.isHEAD;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-10 space-y-12 bg-[#F8FAFC]">
      {/* Header Geral com Filtro de Departamento */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="text-purple-600">📊</span>
            Cockpit Estratégico
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            Visão executiva de metas, resultados e decisões estratégicas
          </p>
        </div>

        {/* Filtro Global de Departamento */}
        {canSeeAllDepartments && (
          <div className="w-56">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Visão por Departamento
            </label>
            <SelectInput
              value={globalDeptFilter}
              onChange={(val) => setGlobalDeptFilter(val as Department | 'all')}
              options={[
                { value: 'all', label: 'Todos Departamentos' },
                { value: Department.GENERAL, label: 'Geral' },
                { value: Department.COMMERCIAL, label: 'Comercial' },
                { value: Department.MARKETING, label: 'Marketing' },
                { value: Department.PROJECTS, label: 'Projetos' },
              ]}
            />
          </div>
        )}

        {/* Badge de Departamento para HEADs */}
        {!canSeeAllDepartments && permissions.userDepartment && (
          <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold text-sm capitalize">
            Departamento: {permissions.userDepartment}
          </div>
        )}
      </header>

      {/* ========================================= */}
      {/* SEÇÃO 1: DASHBOARD META X REALIZADO */}
      {/* ========================================= */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Meta x Realizado</h2>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
            KRs Estratégicos
          </span>
        </div>
        
        <StrategicKRDashboard 
          department={globalDeptFilter === 'all' ? undefined : globalDeptFilter}
        />
      </section>

      {/* ========================================= */}
      {/* SEÇÃO 2: TIMELINE DE GOVERNANÇA */}
      {/* ========================================= */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Timeline de Revisões</h2>
            <p className="text-slate-500 text-sm mt-1">Histórico de sprints de governança e resumos executivos</p>
          </div>

          {/* Filtros da Timeline */}
          <div className="flex gap-3 flex-wrap">
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
        </div>

        {loadingSprints ? (
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
              {sprints.map((sprint) => {
                const checkins = checkinsMap.get(sprint.id!) || [];
                const latestCheckin = checkins[0];
                const sprintDecisions = sprint.items.filter(i => i.type === 'decisão');
                const decisionsCompleted = sprintDecisions.filter(d => (d as any).decision_status === 'concluido');

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
                              <p className="text-xs font-black text-indigo-600 uppercase mb-2">Aprendizados:</p>
                              <p className="text-xs text-slate-600 whitespace-pre-line">{latestCheckin.learnings}</p>
                            </div>
                          )}

                          {/* Recomendações */}
                          {latestCheckin.strategic_recommendations && (
                            <div className="mt-3">
                              <p className="text-xs font-black text-purple-600 uppercase mb-2">Recomendações:</p>
                              <p className="text-xs text-slate-600 whitespace-pre-line">{latestCheckin.strategic_recommendations}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Decisões em destaque */}
                      {sprintDecisions.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Decisões ({sprintDecisions.length})</h4>
                            <span className="text-xs font-bold text-emerald-600">
                              {decisionsCompleted.length} concluídas
                            </span>
                          </div>
                          <div className="space-y-2">
                            {sprintDecisions.slice(0, 3).map((decision: any, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full ${
                                  decision.decision_status === 'concluido' ? 'bg-emerald-500' :
                                  decision.decision_status === 'em_execucao' ? 'bg-blue-500' :
                                  'bg-slate-400'
                                }`}></div>
                                <span className="text-slate-700 truncate flex-1">{decision.title}</span>
                              </div>
                            ))}
                            {sprintDecisions.length > 3 && (
                              <p className="text-[10px] text-slate-400 font-bold mt-2">+{sprintDecisions.length - 3} decisões</p>
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
      </section>

      {/* ========================================= */}
      {/* SEÇÃO 3: REGISTRO DE DECISÕES */}
      {/* ========================================= */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Registro de Decisões</h2>
            <p className="text-slate-500 text-sm mt-1">Decisões estratégicas de todas as sprints e seu status de execução</p>
          </div>
        </div>

        {loadingDecisions ? (
          <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto"></div>
              <div className="h-20 bg-slate-100 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 divide-y divide-slate-100">
            {decisions.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-slate-400 font-semibold">Nenhuma decisão encontrada.</p>
                <p className="text-xs text-slate-300 mt-2">Registre decisões nas sprints para acompanhar o histórico.</p>
              </div>
            )}
            {decisions.map((item: any) => (
              <div key={item.id} className="p-6 flex flex-col gap-4 hover:bg-slate-50 transition-colors">
                {/* Header: Sprint + Badges */}
                <div className="flex items-start justify-between gap-4">
                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span className="font-bold">Sprint:</span>
                    <span>{item.sprints?.title || '—'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold">Dept:</span>
                    <span className="capitalize">{item.sprints?.department || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.decision_type && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[9px] font-black uppercase rounded-full border border-purple-200 whitespace-nowrap">
                        {getDecisionTypeLabel(item.decision_type)}
                      </span>
                    )}
                    <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border whitespace-nowrap ${getDecisionStatusColor(item.decision_status)}`}>
                      {getDecisionStatusLabel(item.decision_status)}
                    </span>
                  </div>
                </div>
                
                {/* Título da decisão */}
                <div className="text-base font-bold text-slate-900 italic">"{item.title}"</div>
                
                {/* Impacto */}
                {item.decision_impact && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-600">
                      <span className="font-bold text-indigo-600">Impacto:</span> {item.decision_impact}
                    </p>
                  </div>
                )}
                
                {/* OKR Impactado */}
                {item.okr_id && item.okrs && (
                  <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
                    <div className="text-indigo-600 mt-0.5">🎯</div>
                    <div className="flex-1 text-xs">
                      <div className="font-black uppercase tracking-wider text-indigo-400 mb-1">OKR Impactado</div>
                      <div className="font-bold text-indigo-900">{item.okrs.objective}</div>
                      {item.kr_id && item.key_results && (
                        <div className="mt-1 text-indigo-700">
                          <span className="font-semibold">KR:</span> {item.key_results.title}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Footer: Responsável + Prazo + Data */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    {item.responsible && (
                      <div>
                        <span className="font-bold">Responsável:</span> {item.responsible}
                      </div>
                    )}
                    {item.decision_deadline && (
                      <div>
                        <span className="font-bold">Prazo:</span> {parseLocalDate(item.decision_deadline).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {parseLocalDate(item.created_at || '').toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CockpitPage;
