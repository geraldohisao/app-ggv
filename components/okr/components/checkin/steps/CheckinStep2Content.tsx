import React from 'react';
import { UseFormRegister, UseFormWatch } from 'react-hook-form';

interface MetricsData {
  completion_rate: number;
  initiatives_completed: number;
  initiatives_total: number;
  impediments_count: number;
  carry_over_pct: number;
}

interface CheckinStep2ContentProps {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  metrics: MetricsData;
  completedInitiatives: any[];
  pendingInitiatives: any[];
  impediments: any[];
  decisions: any[];
  isGovernance?: boolean;
}

export const CheckinStep2Content: React.FC<CheckinStep2ContentProps> = ({
  register,
  watch,
  metrics,
  completedInitiatives,
  pendingInitiatives,
  impediments,
  decisions,
  isGovernance = false,
}) => {
  // Watch form values for character counts
  const achievements = watch('achievements') || '';
  const blockers = watch('blockers') || '';
  const decisionsText = watch('decisions_taken') || '';
  const nextFocus = watch('next_focus') || '';

  if (isGovernance) {
    // Governance mode - different fields (keep existing layout, already good)
    return (
      <div className="space-y-4 animate-fadeIn">
        {/* Compact Metrics */}
        <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-indigo-600">{metrics.completion_rate}%</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Conclusão</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-emerald-600">{metrics.initiatives_completed}/{metrics.initiatives_total}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Iniciativas</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-rose-600">{metrics.impediments_count}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Impedimentos</span>
            </div>
          </div>
        </div>

        {/* Governance fields - grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Learnings */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-sm">💡</span>
              O que aprendemos?
            </label>
            <textarea
              {...register('learnings')}
              rows={3}
              placeholder="• Principais insights&#10;• Lições aprendidas"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all text-sm resize-none"
            />
          </div>

          {/* OKR Misalignments */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-50 rounded-lg flex items-center justify-center text-sm">⚠️</span>
              OKRs desalinhados?
            </label>
            <textarea
              {...register('okr_misalignments')}
              rows={3}
              placeholder="• Metas que precisam ajuste&#10;• Desconexões identificadas"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all text-sm resize-none"
            />
          </div>

          {/* Keep Doing */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center text-sm">✅</span>
              O que manter?
            </label>
            <textarea
              {...register('keep_doing')}
              rows={3}
              placeholder="• Práticas que funcionam&#10;• Processos eficazes"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition-all text-sm resize-none"
            />
          </div>

          {/* Stop Doing */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center text-sm">⛔</span>
              O que parar?
            </label>
            <textarea
              {...register('stop_doing')}
              rows={3}
              placeholder="• Atividades sem valor&#10;• Processos ineficazes"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all text-sm resize-none"
            />
          </div>

          {/* Adjust Doing */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-sm">🔧</span>
              O que ajustar?
            </label>
            <textarea
              {...register('adjust_doing')}
              rows={3}
              placeholder="• Processos para refinar&#10;• Abordagens para otimizar"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all text-sm resize-none"
            />
          </div>

          {/* Strategic Recommendations */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-50 rounded-lg flex items-center justify-center text-sm">📋</span>
              Recomendações
            </label>
            <textarea
              {...register('strategic_recommendations')}
              rows={3}
              placeholder="• Direcionamentos estratégicos&#10;• Próximos passos sugeridos"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:bg-white transition-all text-sm resize-none"
            />
          </div>
        </div>

        {/* Identified Risks - full width */}
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 bg-rose-50 rounded-lg flex items-center justify-center text-sm">🚨</span>
            Riscos Identificados
          </label>
          <textarea
            {...register('identified_risks')}
            rows={2}
            placeholder="• Riscos que podem impactar OKRs&#10;• Ameaças ao cumprimento das metas"
            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all text-sm resize-none"
          />
        </div>
      </div>
    );
  }

  // Execution mode - All fields visible (no collapsible cards)
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Compact Metrics Bar */}
      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-indigo-600">{metrics.completion_rate}%</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Conclusão</span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-emerald-600">{metrics.initiatives_completed}/{metrics.initiatives_total}</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Iniciativas</span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-rose-600">{metrics.impediments_count}</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Impedimentos</span>
          </div>
          {metrics.carry_over_pct > 0 && (
            <>
              <div className="w-px h-5 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className={`text-xl font-black ${metrics.carry_over_pct > 30 ? 'text-amber-600' : 'text-slate-600'}`}>
                  {metrics.carry_over_pct}%
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Carry-over</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* All 4 Content Fields - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* Achievements Field */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-50 rounded-lg flex items-center justify-center text-sm">✅</span>
              O que foi entregue
            </label>
            {completedInitiatives.length > 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                {completedInitiatives.length} concluídas
              </span>
            )}
          </div>
          <textarea
            {...register('achievements')}
            rows={3}
            placeholder="• Entregas realizadas&#10;• Ex: Campanha gerou 20 SQLs"
            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition-all text-sm resize-none"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">{achievements.length} caracteres</span>
          </div>
        </div>

        {/* Blockers Field */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-rose-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 bg-rose-50 rounded-lg flex items-center justify-center text-sm">⚠️</span>
              O que travou
            </label>
            {impediments.length > 0 && (
              <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                {impediments.length} impedimentos
              </span>
            )}
          </div>
          <textarea
            {...register('blockers')}
            rows={3}
            placeholder="• Bloqueios encontrados&#10;• Ex: Orçamento não aprovado"
            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:bg-white transition-all text-sm resize-none"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">{blockers.length} caracteres</span>
          </div>
        </div>

        {/* Decisions Field */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-50 rounded-lg flex items-center justify-center text-sm">💬</span>
              Decisões tomadas
            </label>
            {decisions.length > 0 && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                {decisions.length} decisões
              </span>
            )}
          </div>
          <textarea
            {...register('decisions_taken')}
            rows={3}
            placeholder="• Decisões importantes&#10;• Ex: Aprovar desconto 20%"
            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:bg-white transition-all text-sm resize-none"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">{decisionsText.length} caracteres</span>
          </div>
        </div>

        {/* Next Focus Field */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-sm">🎯</span>
              Próximo foco
            </label>
            {pendingInitiatives.length > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                {pendingInitiatives.length} pendentes
              </span>
            )}
          </div>
          <textarea
            {...register('next_focus')}
            rows={3}
            placeholder={pendingInitiatives.length > 0 
              ? `Sugestão:\n${pendingInitiatives.slice(0, 2).map(i => `• ${i.title}`).join('\n')}`
              : '• Prioridades para o próximo ciclo'}
            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all text-sm resize-none"
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">{nextFocus.length} caracteres</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckinStep2Content;
