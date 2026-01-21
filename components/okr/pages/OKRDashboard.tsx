import React, { useEffect, useState, useMemo } from 'react';
import { useOKRStore } from '../store/okrStore';
import { OKRCard } from '../components/okr/OKRCard';
import { EmptyState } from '../components/shared/EmptyState';
import { LoadingState } from '../components/shared/LoadingState';
import { usePermissions } from '../hooks/usePermissions';
import { useOKRUsers } from '../hooks/useOKRUsers';
import { OKRLevel, Department, OKRStatus, OKRWithKeyResults } from '../types/okr.types';
import { DonutChart } from '../components/shared/DonutChart';
import { getActiveSprints } from '../services/sprint.service';
import type { SprintWithItems } from '../types/sprint.types';
import { calculateOKRProgress } from '../types/okr.types';

interface OKRDashboardProps {
  onCreateNew?: () => void;
  onEdit?: (okr: any) => void;
  onViewSprint?: (sprintId: string) => void;
  hideList?: boolean; // quando true, esconde a lista inferior (usado na Home)
}

export const OKRDashboard: React.FC<OKRDashboardProps> = ({ onCreateNew, onEdit, onViewSprint, hideList }) => {
  const {
    okrs,
    loading,
    fetchOKRs,
  } = useOKRStore();

  const permissions = usePermissions();
  const { users: okrUsers } = useOKRUsers();
  const [levelFilter, setLevelFilter] = useState<OKRLevel | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<OKRStatus | 'all'>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSprints, setActiveSprints] = useState<SprintWithItems[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [, forceUpdate] = useState({});

  const activeSprint = useMemo(
    () => activeSprints.find((s) => s.id === selectedSprintId) || activeSprints[0],
    [activeSprints, selectedSprintId]
  );

  // Calculate sprint progress
  const sprintProgress = useMemo(() => {
    if (!activeSprint) return 0;
    if (!activeSprint.items || activeSprint.items.length === 0) return 0;
    const completed = activeSprint.items.filter(i => i.status === 'concluído').length;
    return Math.round((completed / activeSprint.items.length) * 100);
  }, [activeSprint]);

  const sprintCounts = useMemo(() => {
    if (!activeSprint?.items) return { total: 0, completed: 0, pending: 0 };
    const items = activeSprint.items;
    return {
      total: items.length,
      completed: items.filter(i => i.status === 'concluído').length,
      pending: items.filter(i => i.status !== 'concluído').length
    };
  }, [activeSprint]);

  // Current Quarter info - atualiza automaticamente
  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const quarter = Math.floor(month / 3) + 1;
    const start = new Date(year, (quarter - 1) * 3, 1);
    const end = new Date(year, quarter * 3, 0);
    return {
        label: `${quarter}º Trimestre ${year}`,
        range: `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`,
        progress: Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100))
    };
  };
  
  const currentQuarter = getCurrentQuarter();

  // Helper: Calcular métricas de uma sprint
  const getSprintMetrics = (sprint: SprintWithItems) => {
    const items = sprint.items || [];
    const initiatives = items.filter(i => i.type === 'iniciativa');
    const impediments = items.filter(i => i.type === 'impedimento');
    const decisions = items.filter(i => i.type === 'decisão');
    
    const openImpediments = impediments.filter(
      i => (i as any).impediment_status !== 'resolvido'
    ).length;
    
    const pendingDecisions = decisions.filter(
      i => (i as any).decision_status !== 'concluido' &&
           (i as any).decision_status !== 'cancelado'
    ).length;
    
    const completedItems = items.filter(i => i.status === 'concluído').length;
    const totalItems = items.length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    // Determinar nível de risco
    const hasBlockedImpediments = impediments.some(
      i => (i as any).impediment_status === 'bloqueado'
    );
    const hasRiskImpediments = impediments.some(
      i => (i as any).impediment_status === 'em_risco'
    );
    
    const riskLevel = hasBlockedImpediments ? 'high' : 
                      (hasRiskImpediments || openImpediments > 0) ? 'medium' : 
                      'low';
    
    return {
      totalItems,
      completedItems,
      progress,
      initiatives: initiatives.length,
      openImpediments,
      pendingDecisions,
      riskLevel,
      hasBlockedImpediments,
    };
  };

  // Função de priorização de sprints
  const prioritizeSprints = (sprints: SprintWithItems[]) => {
    return sprints.sort((a, b) => {
      // Calcular score de prioridade para cada sprint
      const getSprintPriority = (sprint: SprintWithItems) => {
        let score = 0;
        
        // 1. Impedimentos abertos (prioridade máxima)
        const openImpediments = sprint.items?.filter(
          i => i.type === 'impedimento' && 
          (i as any).impediment_status !== 'resolvido'
        ).length || 0;
        score += openImpediments * 1000;
        
        // 2. KRs vinculados em risco (alto)
        // TODO: quando tivermos KRs linked, verificar status
        
        // 3. Decisões pendentes (médio)
        const pendingDecisions = sprint.items?.filter(
          i => i.type === 'decisão' && 
          (i as any).decision_status !== 'concluido' &&
          (i as any).decision_status !== 'cancelado'
        ).length || 0;
        score += pendingDecisions * 100;
        
        // 4. Data (desempate - mais recente)
        const date = sprint.start_date ? new Date(sprint.start_date).getTime() : 0;
        score += date / 1000000; // Normalizar para não interferir muito
        
        return score;
      };
      
      return getSprintPriority(b) - getSprintPriority(a);
    });
  };

  useEffect(() => {
    fetchOKRs();
    const loadSprint = async () => {
      try {
        const sprints = await getActiveSprints();
        const prioritized = prioritizeSprints(sprints || []);
        setActiveSprints(prioritized);
        setSelectedSprintId(prioritized[0]?.id ?? null);
      } catch (e) {
        console.error('Failed to load active sprint', e);
      }
    };
    loadSprint();
  }, []);

  useEffect(() => {
    const filters: any = {};
    if (levelFilter !== 'all') filters.level = levelFilter;
    if (deptFilter !== 'all') filters.department = deptFilter;
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (responsibleFilter !== 'all') {
      filters.search = responsibleFilter; // backend ainda usa busca livre; usamos owner como busca
    } else if (searchTerm) {
      filters.search = searchTerm;
    }
    fetchOKRs(filters);
  }, [levelFilter, deptFilter, statusFilter, responsibleFilter, searchTerm]);

  // Atualizar trimestre automaticamente a cada hora
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 3600000); // 1 hora
    return () => clearInterval(interval);
  }, []);

  // Métricas calculadas localmente para refletir filtros
  const metricsData = useMemo(() => {
    const data = okrs.map(o => {
        const progress = calculateOKRProgress(o);
        const overdue = new Date(o.end_date) < new Date() && o.status !== 'concluído';
        return { ...o, calculatedProgress: progress, isOverdue: overdue };
    });

    const totals = data.reduce((acc, o) => {
        if (o.isOverdue) acc.red++;
        else if (o.calculatedProgress >= 70) acc.green++;
        else acc.yellow++;
        return acc;
    }, { green: 0, yellow: 0, red: 0 });

    return [
        { label: 'Atenção', value: totals.red, color: '#F43F5E' },
        { label: 'Em Progresso', value: totals.yellow, color: '#F59E0B' },
        { label: 'No Prazo', value: totals.green, color: '#10B981' },
    ];
  }, [okrs]);

  const barChartData = useMemo(() => 
    okrs.slice(0, 3).map(o => ({
      ...o, // pass full okr object for click handler
      label: o.objective,
      value: calculateOKRProgress(o)
    })), [okrs]);

  if (loading && okrs.length === 0) return <LoadingState message="Carregando Dashboard..." />;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-10 space-y-10 bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Performance GGV 2026</h1>
          <div className="flex items-center gap-3 mt-2">
             <p className="text-slate-500 text-lg font-medium">Visão geral consolidada</p>
             <span className="text-slate-300">|</span>
             <div className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {currentQuarter.label} ({currentQuarter.range})
             </div>
          </div>
        </div>
      </header>

      {/* Seção Superior: Gráficos e Sprint */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Gráfico de Evolução (Top) - Agora Full Width */}
        <div className="lg:col-span-12 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className="text-[#5B5FF5]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </span>
              <h2 className="text-xl font-bold text-slate-800">Evolução do Trimestre</h2>
            </div>
            {permissions.okr.canCreate && (
              <button
                onClick={onCreateNew}
                className="bg-[#5B5FF5] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:brightness-110 transition-all active:scale-95 flex items-center gap-2 text-sm"
              >
                <span className="text-lg leading-none">+</span> Criar Novo OKR
              </button>
            )}
          </div>
          
          {okrs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2 w-full">
              {barChartData.map((d, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-3 cursor-pointer"
                  onClick={() => onEdit?.(d)}
                >
                  <div className="w-full max-w-md">
                    <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#5B5FF5] to-[#4A4FE3] rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.max(d.value, 5)}%` }} // min 5% para visibilidade
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-black text-white bg-slate-900/80 px-2 py-0.5 rounded-full">
                        {d.value.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-base font-semibold text-slate-700 text-center line-clamp-2 w-full"
                    title={d.label}
                  >
                    {d.label}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
                Sem dados suficientes para exibir o gráfico.
            </div>
          )}
        </div>

        {/* Sprints Ativas - Design minimalista */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-[#5B5FF5]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              <h2 className="text-xl font-bold text-slate-800">Sprints Ativas</h2>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activeSprints.length} {activeSprints.length === 1 ? 'sprint' : 'sprints'}
            </span>
          </div>

          {activeSprints.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 font-medium">Nenhuma sprint ativa no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSprints.slice(0, 3).map((sprint) => {
                const metrics = getSprintMetrics(sprint);
                const hasRisk = metrics.openImpediments > 0 || metrics.riskLevel === 'high';

                return (
                  <div
                    key={sprint.id}
                    onClick={() => onViewSprint?.(sprint.id!)}
                    className={`rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${
                      hasRisk 
                        ? 'bg-gradient-to-r from-rose-50 to-white border-2 border-rose-100' 
                        : 'bg-slate-50 border border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate mb-1">
                          {sprint.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-full">
                            {sprint.type}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-bold uppercase rounded-full capitalize">
                            {sprint.department}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900">{metrics.progress}%</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          metrics.progress >= 70 ? 'bg-emerald-500' :
                          metrics.progress >= 40 ? 'bg-amber-500' :
                          'bg-[#5B5FF5]'
                        }`}
                        style={{ width: `${metrics.progress}%` }}
                      />
                    </div>

                    {/* Indicators */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {metrics.openImpediments > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-bold text-rose-600">{metrics.openImpediments} impedimento{metrics.openImpediments > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {metrics.pendingDecisions > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span className="text-xs font-bold text-purple-600">{metrics.pendingDecisions} decisão{metrics.pendingDecisions > 1 ? 'ões' : ''}</span>
                          </div>
                        )}
                        {metrics.openImpediments === 0 && metrics.pendingDecisions === 0 && (
                          <span className="text-xs font-medium text-slate-400">Sem pendências críticas</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#5B5FF5] uppercase tracking-wider hover:underline">
                        Detalhes →
                      </span>
                    </div>
                  </div>
                );
              })}

              {activeSprints.length > 3 && (
                <p className="text-center text-xs font-bold text-slate-400 pt-2">
                  +{activeSprints.length - 3} sprint{activeSprints.length - 3 > 1 ? 's' : ''} ativa{activeSprints.length - 3 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Painel Lateral: Saúde Estratégica (Direita - 4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-800 self-start mb-8">Saúde Estratégica</h3>
                <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                    <DonutChart data={metricsData} />
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none z-10">
                        <span className="text-4xl font-black text-slate-800 leading-none tracking-tighter mb-2">{okrs.length}</span>
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em] text-center leading-tight">OKRs<br/>TOTAIS</span>
                    </div>
                </div>
            <div className="w-full space-y-3">
                {metricsData.map((h, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl px-5 py-4 flex items-center justify-between group hover:bg-slate-100 transition-colors cursor-default">
                    <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: h.color }} />
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">{h.label}</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">{h.value}</span>
                </div>
                ))}
            </div>
        </div>
      </div>

      {!hideList && (
        <>
          {/* Seção Inferior: Lista de OKRs (Full Width) */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">Objetivos e Resultados Chave</h3>
              </div>
              
              {/* Filtros (visíveis apenas na tela de OKRs) */}
              <div className="flex flex-col md:flex-row gap-3 md:items-end bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-1 flex-wrap gap-3">
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value as any)}
                    className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer hover:border-indigo-300 transition-colors min-w-[140px]"
                  >
                    <option value="all">Todos Níveis</option>
                    <option value={OKRLevel.STRATEGIC}>Estratégico</option>
                    <option value={OKRLevel.SECTORAL}>Setorial</option>
                  </select>

                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value as any)}
                    className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer hover:border-indigo-300 transition-colors min-w-[140px]"
                  >
                    <option value="all">Todos Depts</option>
                    <option value={Department.GENERAL}>Geral</option>
                    <option value={Department.COMMERCIAL}>Comercial</option>
                    <option value={Department.MARKETING}>Marketing</option>
                    <option value={Department.PROJECTS}>Projetos</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer hover:border-indigo-300 transition-colors min-w-[140px]"
                  >
                    <option value="all">Todos Status</option>
                    <option value={OKRStatus.NOT_STARTED}>Não iniciado</option>
                    <option value={OKRStatus.IN_PROGRESS}>Em andamento</option>
                    <option value={OKRStatus.COMPLETED}>Concluído</option>
                  </select>

                  <select
                    value={responsibleFilter}
                    onChange={(e) => setResponsibleFilter(e.target.value as any)}
                    className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer hover:border-indigo-300 transition-colors min-w-[160px]"
                  >
                    <option value="all">Responsável (todos)</option>
                    {okrUsers.map((u) => (
                      <option key={u.id ?? u.name} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {okrs.length === 0 ? (
                <EmptyState
                title="Nenhum OKR encontrado"
                description="Ajuste os filtros ou crie um novo objetivo."
                action={permissions.okr.canCreate ? { label: 'Criar OKR', onClick: onCreateNew! } : undefined}
                />
            ) : (
                <div className="space-y-6">
                {okrs.map((okr) => {
                    const ownerUser = okrUsers.find(u => u.name === okr.owner);
                    return (
                    <OKRCard 
                        key={okr.id} 
                        okr={okr} 
                        onClick={() => onEdit?.(okr)} 
                        ownerAvatarUrl={ownerUser?.avatar_url}
                    />
                    );
                })}
                </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
