import React, { useEffect, useState, useMemo } from 'react';
import { 
  getStrategicKRs, 
  getCockpitSummary, 
  calculateKRTrend,
  type KRWithOKRContext,
  type CockpitSummary 
} from '../../services/cockpit.service';
import { calculateKeyResultProgress, getDepartmentLabel, type Department } from '../../types/okr.types';
import { LoadingState } from '../shared/LoadingState';

interface StrategicKRDashboardProps {
  department?: Department;
  onKRClick?: (kr: KRWithOKRContext) => void;
}

export const StrategicKRDashboard: React.FC<StrategicKRDashboardProps> = ({
  department,
  onKRClick,
}) => {
  const [krs, setKRs] = useState<KRWithOKRContext[]>([]);
  const [summary, setSummary] = useState<CockpitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [department]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [krsData, summaryData] = await Promise.all([
        getStrategicKRs(department),
        getCockpitSummary(department),
      ]);
      setKRs(krsData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar dados do Cockpit');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar KRs por OKR
  const krsGroupedByOKR = useMemo(() => {
    const grouped = new Map<string, { objective: string; department: string; owner: string; krs: KRWithOKRContext[] }>();
    
    krs.forEach((kr) => {
      const okrId = kr.okr_id;
      if (!grouped.has(okrId)) {
        grouped.set(okrId, {
          objective: kr.okr_objective,
          department: kr.okr_department,
          owner: kr.okr_owner,
          krs: [],
        });
      }
      grouped.get(okrId)!.krs.push(kr);
    });

    return grouped;
  }, [krs]);

  if (loading) {
    return <LoadingState message="Carregando KRs estratégicos..." />;
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
        <p className="text-rose-600 font-medium">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (krs.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-slate-500 font-semibold text-lg">Nenhum KR estratégico configurado</p>
        <p className="text-xs text-slate-400 mt-2">
          Marque KRs como "Exibir no Cockpit" para visualizá-los aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cards de Resumo */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Total de KRs"
            value={summary.totalKRs}
            color="indigo"
          />
          <SummaryCard
            label="No Prazo"
            value={summary.greenKRs}
            color="emerald"
            icon="✓"
          />
          <SummaryCard
            label="Atenção"
            value={summary.yellowKRs}
            color="amber"
            icon="!"
          />
          <SummaryCard
            label="Crítico"
            value={summary.redKRs}
            color="rose"
            icon="✕"
          />
        </div>
      )}

      {/* Barra de Progresso Geral */}
      {summary && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">
              Progresso Médio dos KRs Estratégicos
            </span>
            <span className="text-2xl font-black text-slate-900">{summary.averageProgress}%</span>
          </div>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                summary.averageProgress >= 70 ? 'bg-emerald-500' :
                summary.averageProgress >= 40 ? 'bg-amber-500' :
                'bg-rose-500'
              }`}
              style={{ width: `${summary.averageProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid de KRs por OKR */}
      <div className="space-y-6">
        {Array.from(krsGroupedByOKR.entries()).map(([okrId, group]) => (
          <div key={okrId} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            {/* Header do OKR */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-full">
                    OKR
                  </span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full capitalize">
                    {getDepartmentLabel(group.department as Department)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{group.objective}</h3>
                <p className="text-xs text-slate-400 mt-1">Responsável: {group.owner}</p>
              </div>
            </div>

            {/* Lista de KRs */}
            <div className="space-y-4">
              {group.krs.map((kr) => (
                <KRProgressCard 
                  key={kr.id} 
                  kr={kr} 
                  onClick={onKRClick ? () => onKRClick(kr) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// Sub-componentes
// ============================================

interface SummaryCardProps {
  label: string;
  value: number;
  color: 'indigo' | 'emerald' | 'amber' | 'rose';
  icon?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, color, icon }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    rose: 'bg-rose-50 border-rose-100 text-rose-700',
  };

  return (
    <div className={`rounded-2xl p-5 border ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <span className="text-3xl font-black">{value}</span>
        {icon && <span className="text-2xl opacity-50">{icon}</span>}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider mt-2 opacity-70">{label}</p>
    </div>
  );
};

interface KRProgressCardProps {
  kr: KRWithOKRContext;
  onClick?: () => void;
}

const KRProgressCard: React.FC<KRProgressCardProps> = ({ kr, onClick }) => {
  const progress = calculateKeyResultProgress(kr);
  const trend = calculateKRTrend(kr);

  const statusColors = {
    verde: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amarelo: 'bg-amber-100 text-amber-700 border-amber-200',
    vermelho: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const progressBarColor = 
    progress.percentage >= 70 ? 'bg-emerald-500' :
    progress.percentage >= 40 ? 'bg-amber-500' :
    'bg-rose-500';

  const formatValue = (value: number | null | undefined, unit?: string): string => {
    if (value === null || value === undefined) return '—';
    if (kr.type === 'percentage') return `${value}%`;
    if (kr.type === 'currency') return `R$ ${value.toLocaleString('pt-BR')}`;
    return unit ? `${value} ${unit}` : value.toString();
  };

  return (
    <div 
      className={`rounded-2xl p-5 bg-slate-50 border border-slate-100 transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-slate-900 line-clamp-2">{kr.title}</h4>
          {kr.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{kr.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Trend indicator */}
          {trend.direction !== 'stable' && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
              trend.direction === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {trend.direction === 'up' ? '↑' : '↓'}
              {trend.percentage}%
            </div>
          )}
          <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full border ${statusColors[kr.status as keyof typeof statusColors] || statusColors.amarelo}`}>
            {kr.status}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500 font-medium">Progresso</span>
          <span className="font-black text-slate-900">{Math.round(progress.percentage)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${Math.min(100, progress.percentage)}%` }}
          />
        </div>
      </div>

      {/* Meta x Realizado */}
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200">
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Início</p>
          <p className="text-sm font-black text-slate-600">{formatValue(kr.start_value, kr.unit)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Atual</p>
          <p className="text-lg font-black text-indigo-600">{formatValue(kr.current_value, kr.unit)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Meta</p>
          <p className="text-sm font-black text-slate-600">{formatValue(kr.target_value, kr.unit)}</p>
        </div>
      </div>
    </div>
  );
};

export default StrategicKRDashboard;
