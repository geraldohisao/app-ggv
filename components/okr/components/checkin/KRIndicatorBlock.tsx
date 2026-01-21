import React, { useState, useEffect } from 'react';
import { KRCheckinQuickForm } from './KRCheckinQuickForm';
import * as checkinService from '../../services/checkin.service';
import { calculateProgress } from '../../types/checkin.types';
import { useToast } from '../shared/Toast';

interface KRIndicatorBlockProps {
  sprintId: string;
  onKRUpdated?: () => void;
  readOnly?: boolean;
  isGovernance?: boolean;
}

export const KRIndicatorBlock: React.FC<KRIndicatorBlockProps> = ({ sprintId, onKRUpdated, readOnly = false, isGovernance = false }) => {
  const [krs, setKrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKR, setExpandedKR] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadKRs();
  }, [sprintId]);

  const loadKRs = async () => {
    setLoading(true);
    try {
      const krsData = await checkinService.getSprintKRs(sprintId);
      setKrs(krsData);
    } catch (error) {
      console.error('Erro ao carregar KRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKR = async (krId: string, value: number, comment: string, confidence: 'baixa' | 'média' | 'alta') => {
    try {
      await checkinService.createKRCheckin({
        kr_id: krId,
        sprint_id: sprintId,
        value,
        comment,
        confidence
      });
      
      // Recarregar KRs para mostrar novo valor
      await loadKRs();
      setExpandedKR(null);
      onKRUpdated?.();
    } catch (error: any) {
      throw error; // Propaga para o form tratar
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-20 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (krs.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
        <p className="text-slate-400 font-medium">Nenhum KR vinculado a esta sprint.</p>
        <p className="text-xs text-slate-300 mt-1">Vincule OKRs à sprint para acompanhar indicadores.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {isGovernance ? 'Indicadores em Revisão' : 'Indicadores do Ciclo'}
        </h3>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {krs.length} {krs.length === 1 ? 'KR' : 'KRs'}
        </span>
      </div>

      {isGovernance && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs font-semibold text-purple-800">
          🎯 <strong>Sprint de Governança:</strong> Indicadores em modo de visualização para análise qualitativa. Atualizações devem ser feitas nas sprints de execução.
        </div>
      )}

      <div className="space-y-6">
        {krs.map((kr) => {
          const progress = calculateProgress(kr.current_value, kr.target_value, kr.direction);
          const isOnTrack = progress >= 70;
          const isAtRisk = progress < 40;
          
          return (
            <div key={kr.id} className="pb-6 border-b last:border-0 border-slate-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  {kr.okrs?.objective && (
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                      {kr.okrs.objective}
                    </p>
                  )}
                  <h4 className="font-bold text-slate-800">{kr.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {kr.direction === 'increase' ? '📈 Maior é melhor' : '📉 Menor é melhor'}
                  </p>
                </div>
                {isGovernance ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Apenas Visualização</span>
                  </div>
                ) : (
                  <button
                    onClick={() => !readOnly && setExpandedKR(expandedKR === kr.id ? null : kr.id)}
                    disabled={readOnly}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      readOnly
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                    title={readOnly ? 'Sprint concluída/cancelada: atualização bloqueada' : 'Atualizar KR'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    {readOnly ? 'Encerrado' : 'Atualizar'}
                  </button>
                )}
              </div>

              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      isOnTrack ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                      isAtRisk ? 'bg-gradient-to-r from-rose-400 to-rose-600' :
                      'bg-gradient-to-r from-amber-400 to-amber-600'
                    }`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="font-bold text-slate-700">
                    {kr.current_value.toLocaleString('pt-BR')} {kr.unit}
                  </span>
                  <span className={`font-black ${
                    isOnTrack ? 'text-emerald-600' :
                    isAtRisk ? 'text-rose-600' :
                    'text-amber-600'
                  }`}>
                    {progress.toFixed(0)}%
                  </span>
                  <span className="font-bold text-slate-500">
                    Meta: {kr.target_value.toLocaleString('pt-BR')} {kr.unit}
                  </span>
                </div>
              </div>

              {/* Form Inline Expandido - Apenas em sprints de execução */}
              {!isGovernance && expandedKR === kr.id && (
                <KRCheckinQuickForm
                  kr={kr}
                  sprintId={sprintId}
                  onSubmit={(value, comment, confidence) => handleUpdateKR(kr.id, value, comment, confidence)}
                  onCancel={() => setExpandedKR(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Link para histórico completo */}
      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <button className="text-sm font-bold text-indigo-600 hover:underline">
          📈 Ver Evolução Completa dos KRs
        </button>
      </div>
    </div>
  );
};
