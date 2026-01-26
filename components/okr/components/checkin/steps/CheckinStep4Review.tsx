import React from 'react';
import { UseFormWatch } from 'react-hook-form';
import { getHealthColor, getHealthEmoji } from '../../../types/checkin.types';

interface MetricsData {
  completion_rate: number;
  initiatives_completed: number;
  initiatives_total: number;
  impediments_count: number;
  carry_over_pct: number;
}

interface CheckinStep4ReviewProps {
  watch: UseFormWatch<any>;
  metrics: MetricsData;
  isSubmitting: boolean;
  isEditMode: boolean;
  onSubmit: () => void;
  onGoBack: () => void;
  isGovernance?: boolean;
}

export const CheckinStep4Review: React.FC<CheckinStep4ReviewProps> = ({
  watch,
  metrics,
  isSubmitting,
  isEditMode,
  onSubmit,
  onGoBack,
  isGovernance = false,
}) => {
  const summary = watch('summary') || '';
  const health = watch('health') || 'verde';
  const healthReason = watch('health_reason') || '';
  const achievements = watch('achievements') || '';
  const blockers = watch('blockers') || '';
  const decisions = watch('decisions_taken') || '';
  const nextFocus = watch('next_focus') || '';
  const notes = watch('notes') || '';

  // Governance fields
  const learnings = watch('learnings') || '';
  const okrMisalignments = watch('okr_misalignments') || '';
  const keepDoing = watch('keep_doing') || '';
  const stopDoing = watch('stop_doing') || '';
  const adjustDoing = watch('adjust_doing') || '';
  const strategicRecommendations = watch('strategic_recommendations') || '';
  const identifiedRisks = watch('identified_risks') || '';

  const healthColorClass = getHealthColor(health);
  const healthEmoji = getHealthEmoji(health);

  // Count filled fields
  const executionFieldsFilled = [achievements, blockers, decisions, nextFocus].filter(f => f.trim()).length;
  const governanceFieldsFilled = [learnings, okrMisalignments, keepDoing, stopDoing, adjustDoing, strategicRecommendations, identifiedRisks].filter(f => f.trim()).length;

  const PreviewCard = ({ 
    title, 
    content, 
    icon, 
    color 
  }: { 
    title: string; 
    content: string; 
    icon: string; 
    color: string;
  }) => {
    if (!content.trim()) return null;
    
    return (
      <div className={`bg-${color}-50 rounded-xl p-4 border border-${color}-200`}>
        <h4 className={`text-xs font-black text-${color}-700 uppercase tracking-wider mb-2 flex items-center gap-1`}>
          <span>{icon}</span> {title}
        </h4>
        <p className="text-sm text-slate-700 whitespace-pre-line line-clamp-4">
          {content}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-xl font-black text-slate-800">Revisar e Confirmar</h3>
        <p className="text-slate-500 text-sm">Verifique os dados antes de salvar o check-in</p>
      </div>

      {/* Summary Card - Main */}
      <div className={`rounded-2xl p-6 border-2 ${healthColorClass}`}>
        <div className="flex items-start gap-4">
          <div className="text-4xl">{healthEmoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                health === 'verde' ? 'bg-emerald-100 text-emerald-700' :
                health === 'amarelo' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              }`}>
                {health.charAt(0).toUpperCase() + health.slice(1)}
              </span>
              <span className="text-xs text-slate-500">
                {new Date().toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            <p className="text-slate-800 font-medium">{summary || 'Sem resumo'}</p>
            {healthReason && (
              <p className="text-sm text-slate-600 mt-2 italic">
                Motivo: {healthReason}
              </p>
            )}
          </div>
        </div>

        {/* Metrics inline */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-indigo-600">{metrics.completion_rate}%</span>
            <span className="text-xs text-slate-500">conclusão</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-emerald-600">{metrics.initiatives_completed}/{metrics.initiatives_total}</span>
            <span className="text-xs text-slate-500">iniciativas</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-rose-600">{metrics.impediments_count}</span>
            <span className="text-xs text-slate-500">impedimentos</span>
          </div>
        </div>
      </div>

      {/* Content Preview Grid */}
      {isGovernance ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">
              Análise Estratégica
            </h4>
            <span className="text-xs text-slate-500">
              {governanceFieldsFilled}/7 campos preenchidos
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PreviewCard title="Aprendizados" content={learnings} icon="💡" color="indigo" />
            <PreviewCard title="Desalinhamentos" content={okrMisalignments} icon="⚠️" color="rose" />
            <PreviewCard title="Manter" content={keepDoing} icon="✅" color="emerald" />
            <PreviewCard title="Parar" content={stopDoing} icon="⛔" color="amber" />
            <PreviewCard title="Ajustar" content={adjustDoing} icon="🔧" color="blue" />
            <PreviewCard title="Recomendações" content={strategicRecommendations} icon="📋" color="purple" />
          </div>
          
          {identifiedRisks && (
            <PreviewCard title="Riscos Identificados" content={identifiedRisks} icon="🚨" color="rose" />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">
              Conteúdo do Check-in
            </h4>
            <span className="text-xs text-slate-500">
              {executionFieldsFilled}/4 campos preenchidos
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PreviewCard title="Entregas" content={achievements} icon="✅" color="emerald" />
            <PreviewCard title="Bloqueios" content={blockers} icon="⚠️" color="rose" />
            <PreviewCard title="Decisões" content={decisions} icon="💬" color="purple" />
            <PreviewCard title="Próximo Foco" content={nextFocus} icon="🎯" color="blue" />
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
            📎 Notas Adicionais
          </h4>
          <p className="text-sm text-slate-600 italic">{notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onGoBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar e Editar
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-3"
        >
          {isSubmitting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              {isEditMode ? 'Atualizando...' : 'Salvando...'}
            </>
          ) : (
            <>
              {isEditMode ? '✏️' : '✅'}
              {isEditMode ? 'Atualizar Check-in' : 'Salvar Check-in'}
            </>
          )}
        </button>
      </div>

      {/* Info notice */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-blue-700">
          {isEditMode 
            ? 'Você está editando o check-in de hoje. Após meia-noite, ele se torna imutável.'
            : 'Após salvar, você pode editar o check-in apenas durante o dia de hoje.'
          }
        </p>
      </div>
    </div>
  );
};

export default CheckinStep4Review;
