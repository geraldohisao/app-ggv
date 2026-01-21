import React, { useState } from 'react';
import { useToast, ToastContainer } from '../shared/Toast';

interface KRCheckinQuickFormProps {
  kr: {
    id: string;
    title: string;
    current_value: number;
    target_value: number;
    unit?: string;
    direction: 'increase' | 'decrease';
  };
  sprintId?: string;
  onSubmit: (value: number, comment: string, confidence: 'baixa' | 'média' | 'alta') => Promise<void>;
  onCancel: () => void;
}

export const KRCheckinQuickForm: React.FC<KRCheckinQuickFormProps> = ({
  kr,
  sprintId,
  onSubmit,
  onCancel
}) => {
  const [value, setValue] = useState(kr.current_value.toString());
  const [comment, setComment] = useState('');
  const [confidence, setConfidence] = useState<'baixa' | 'média' | 'alta'>('média');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const parsedValue = parseFloat(value);
  const isInvalidNumber = Number.isNaN(parsedValue);
  const isNegative = !isInvalidNumber && parsedValue < 0;
  const isUnchanged = !isInvalidNumber && parsedValue === kr.current_value;
  const isBlocked = isInvalidNumber || isNegative || isUnchanged;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isInvalidNumber) {
      addToast('❌ Valor inválido', 'error');
      return;
    }
    if (isNegative) {
      addToast('❌ Valor negativo não é permitido', 'error');
      return;
    }
    if (isUnchanged) {
      addToast('⚠️ O novo valor é igual ao atual. Ajuste antes de salvar.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(parsedValue, comment, confidence);
      addToast('✅ KR atualizado com sucesso!', 'success');
    } catch (error: any) {
      addToast(`❌ Erro: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const delta = (Number.isNaN(parsedValue) ? kr.current_value : parsedValue) - kr.current_value;
  const isIncrease = delta > 0;

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {isBlocked && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-700">
          Corrija o valor para habilitar o salvamento.
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Valor Atual */}
        <div>
          <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">
            Novo Valor {kr.unit && `(${kr.unit})`}
          </label>
          <input
            type="number"
            step="any"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-4 py-2 border border-indigo-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            required
          />
          <div className="mt-1 text-xs flex items-center gap-2">
            <span className="text-slate-400">Atual: {kr.current_value}</span>
            {delta !== 0 && (
              <span className={`font-bold ${isIncrease ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isIncrease ? '↗' : '↘'} {Math.abs(delta).toFixed(2)}
              </span>
            )}
          </div>
          {(isInvalidNumber || isNegative || isUnchanged) && (
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-rose-500">
              {isInvalidNumber && 'Informe um valor numérico válido.'}
              {isNegative && 'O valor não pode ser negativo.'}
              {isUnchanged && 'O valor deve ser diferente do atual.'}
            </p>
          )}
        </div>

        {/* Confiança */}
        <div>
          <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">
            Confiança
          </label>
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as any)}
            className="w-full px-4 py-2 border border-indigo-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="baixa">🔴 Baixa</option>
            <option value="média">🟡 Média</option>
            <option value="alta">🟢 Alta</option>
          </select>
        </div>
      </div>

      {/* Comentário */}
      <div className="mb-4">
        <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2">
          Comentário (Opcional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Ex: Fechamos 3 contratos grandes esta semana: R$ 50k + R$ 60k + R$ 40k"
          className="w-full px-4 py-2 border border-indigo-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Botões */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {isBlocked && (
          <span className="mr-auto text-xs font-semibold text-rose-500">
            Ajuste o valor para habilitar o salvamento.
          </span>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 hover:bg-white rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isBlocked}
          className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 disabled:bg-slate-300 disabled:text-slate-600"
        >
          {isSubmitting ? 'Salvando...' : 'Atualizar KR'}
        </button>
      </div>
    </form>
  );
};
