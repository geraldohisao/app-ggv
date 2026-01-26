import React from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';

interface CheckinStep3HealthProps {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors;
  autoSummary: string;
}

const healthOptions = [
  { 
    value: 'verde', 
    label: 'Verde', 
    desc: 'No prazo, sem bloqueios críticos', 
    emoji: '✅', 
    color: 'emerald',
    bgGradient: 'from-emerald-50 to-green-50',
    borderActive: 'border-emerald-500',
    bgActive: 'bg-emerald-50',
  },
  { 
    value: 'amarelo', 
    label: 'Amarelo', 
    desc: 'Atenção necessária, riscos identificados', 
    emoji: '⚠️', 
    color: 'amber',
    bgGradient: 'from-amber-50 to-yellow-50',
    borderActive: 'border-amber-500',
    bgActive: 'bg-amber-50',
  },
  { 
    value: 'vermelho', 
    label: 'Vermelho', 
    desc: 'Crítico, bloqueios sérios', 
    emoji: '🔴', 
    color: 'rose',
    bgGradient: 'from-rose-50 to-red-50',
    borderActive: 'border-rose-500',
    bgActive: 'bg-rose-50',
  },
];

export const CheckinStep3Health: React.FC<CheckinStep3HealthProps> = ({
  register,
  watch,
  errors,
  autoSummary,
}) => {
  const health = watch('health');
  const summary = watch('summary') || '';
  const healthReason = watch('health_reason') || '';

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-6">
        <h3 className="text-xl font-black text-slate-800">Como está a saúde do ciclo?</h3>
        <p className="text-slate-500 text-sm">Avalie o status geral e adicione um resumo</p>
      </div>

      {/* Health Picker - Large Visual Cards */}
      <div className="space-y-4">
        <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
          🏥 Status de Saúde <span className="text-rose-500">*</span>
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {healthOptions.map((option) => {
            const isSelected = health === option.value;
            
            return (
              <label 
                key={option.value} 
                className="cursor-pointer group"
              >
                <input
                  type="radio"
                  {...register('health')}
                  value={option.value}
                  className="peer sr-only"
                />
                <div 
                  className={`
                    relative p-6 rounded-2xl border-3 transition-all duration-300
                    ${isSelected 
                      ? `${option.borderActive} ${option.bgActive} shadow-lg scale-105 ring-4 ring-${option.color}-100` 
                      : `border-slate-200 bg-gradient-to-br ${option.bgGradient} hover:border-${option.color}-300 hover:shadow-md`
                    }
                  `}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className={`absolute top-3 right-3 w-6 h-6 rounded-full bg-${option.color}-500 flex items-center justify-center`}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-5xl mb-3">{option.emoji}</div>
                    <div className="font-black text-xl text-slate-800 mb-1">{option.label}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">{option.desc}</div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Health Reason - Conditional */}
      {(health === 'amarelo' || health === 'vermelho') && (
        <div className="animate-fadeIn">
          <label className="block text-sm font-black text-slate-700 mb-2">
            Por que {health === 'amarelo' ? 'amarelo' : 'vermelho'}? <span className="text-rose-500">*</span>
          </label>
          <div className={`p-4 rounded-xl border-2 ${
            health === 'amarelo' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <input
              {...register('health_reason')}
              placeholder="Ex: CRM fora do ar está impactando 30% da capacidade do time"
              className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
                health === 'amarelo' 
                  ? 'border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-100' 
                  : 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
              }`}
            />
            <p className={`text-xs mt-2 ${health === 'amarelo' ? 'text-amber-600' : 'text-rose-600'}`}>
              💡 Descreva o principal motivo do status
            </p>
          </div>
          {errors.health_reason && (
            <p className="text-rose-600 text-sm mt-2 font-bold flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Campo obrigatório para status amarelo/vermelho
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="space-y-3">
        <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
          📝 Resumo do Ciclo <span className="text-rose-500">*</span>
          <span className="text-xs font-normal text-slate-400 ml-2">(mín. 10 caracteres)</span>
        </label>
        
        <div className="relative">
          <textarea
            {...register('summary')}
            rows={4}
            placeholder={autoSummary || 'Resuma os principais acontecimentos deste ciclo...'}
            className={`w-full px-4 py-3 border-2 rounded-xl transition-all resize-none ${
              errors.summary 
                ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100' 
                : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
            }`}
          />
          
          {/* Character counter */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              summary.length >= 10 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {summary.length}/10+
            </span>
          </div>
        </div>
        
        {errors.summary && (
          <p className="text-rose-600 text-sm font-bold flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {String(errors.summary?.message) || 'Resumo é obrigatório'}
          </p>
        )}

        {/* Auto-summary suggestion */}
        {autoSummary && summary !== autoSummary && (
          <button
            type="button"
            onClick={() => {
              // This will be handled by the parent through reset
              const input = document.querySelector('textarea[name="summary"]') as HTMLTextAreaElement;
              if (input) {
                input.value = autoSummary;
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Usar resumo automático
          </button>
        )}
      </div>

      {/* Notes - Optional */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider">
          📎 Notas Adicionais <span className="text-xs font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Qualquer informação adicional relevante que não se encaixa nos outros campos..."
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all resize-none"
        />
      </div>
    </div>
  );
};

export default CheckinStep3Health;
