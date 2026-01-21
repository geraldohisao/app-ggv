import React, { useEffect, useState } from 'react';
import { listDecisions } from '../services/sprint.service';
import type { SprintItem } from '../types/sprint.types';
import { Department } from '../types/okr.types';
import { usePermissions } from '../hooks/usePermissions';
import { getDecisionTypeLabel, getDecisionStatusLabel, getDecisionStatusColor } from '../types/sprint.types';

export const DecisionsPage: React.FC = () => {
  const [decisions, setDecisions] = useState<SprintItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deptFilter, setDeptFilter] = useState<Department | 'all'>('all');
  const permissions = usePermissions();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listDecisions({
          department: deptFilter === 'all' ? undefined : deptFilter,
        });
        setDecisions(data || []);
      } catch (error) {
        console.error('Erro ao carregar decisões:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deptFilter]);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-10 space-y-8 bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Registro de Decisões</h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">
            Decisões estratégicas tomadas nas sprints e vinculadas aos OKRs.
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value as any)}
            className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <option value="all">Todos departamentos</option>
            <option value={Department.GENERAL}>Geral</option>
            <option value={Department.COMMERCIAL}>Comercial</option>
            <option value={Department.MARKETING}>Marketing</option>
            <option value={Department.PROJECTS}>Projetos</option>
          </select>
        </div>
      </header>

      {loading ? (
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
                      <span className="font-bold">Prazo:</span> {new Date(item.decision_deadline).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {new Date(item.created_at || '').toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

