import React, { useEffect, useMemo, useState } from 'react';
import type { KeyResult } from '../../types/okr.types';
import { KeyResultType, KeyResultDirection } from '../../types/okr.types';
import * as okrService from '../../services/okr.service';
import { FormattedNumberInput } from '../../../shared/FormattedNumberInput';
import { useOKRUsers } from '../../hooks/useOKRUsers';
import { UserSelectCombobox } from '../shared/UserSelectCombobox';
import { parseLocalDate } from '../../utils/date';
import { listKRPeriodTargets, syncKRPeriodTargets, type KRTargetKind } from '../../services/krTargets.service';

interface KREditModalProps {
  kr: KeyResult;
  onClose: () => void;
  onSave: (updatedKR: KeyResult) => void;
  onDelete?: (deletedKrId: string) => void;
  /** ID do responsável padrão (herdado do OKR) quando o KR não tem responsável próprio */
  defaultResponsibleUserId?: string | null;
  /** Período do OKR (para metas mensais). Se ausente, não exibe editor mensal. */
  okrStartDate?: string;
  okrEndDate?: string;
}

export const KREditModal: React.FC<KREditModalProps> = ({
  kr,
  onClose,
  onSave,
  onDelete,
  defaultResponsibleUserId,
  okrStartDate,
  okrEndDate,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { users, loading: loadingUsers } = useOKRUsers();
  
  // Form state - usar responsável do KR ou fallback do OKR
  const [title, setTitle] = useState(kr.title || '');
  const [description, setDescription] = useState(kr.description || '');
  const [type, setType] = useState<KeyResultType>(kr.type || 'numeric');
  const [direction, setDirection] = useState<KeyResultDirection | undefined>(kr.direction);
  const [startValue, setStartValue] = useState<number | null>(kr.start_value ?? null);
  const [currentValue, setCurrentValue] = useState<number | null>(kr.current_value ?? null);
  const [targetValue, setTargetValue] = useState<number | null>(kr.target_value ?? null);
  const [targetMax, setTargetMax] = useState<number | null>(kr.target_max ?? null);
  const [unit, setUnit] = useState(kr.unit || '');
  const [status, setStatus] = useState(kr.status || 'vermelho');
  const [activityDone, setActivityDone] = useState(kr.activity_done || false);
  const [responsibleUserId, setResponsibleUserId] = useState<string>(
    kr.responsible_user_id || defaultResponsibleUserId || ''
  );
  const [showInCockpit, setShowInCockpit] = useState(kr.show_in_cockpit || false);

  const isActivity = type === 'activity';

  // ============================================
  // Metas mensais (opcionais)
  // Regras:
  // - currency/numeric + increase/at_least => delta (acumulativo)
  // - percentage => point (fim do mês; não soma)
  // - direções especiais => point por padrão
  // ============================================

  const effectiveOKRStartDate = useMemo(() => {
    return okrStartDate || (kr as any)?.okrs?.start_date || undefined;
  }, [kr, okrStartDate]);

  const effectiveOKREndDate = useMemo(() => {
    return okrEndDate || (kr as any)?.okrs?.end_date || undefined;
  }, [kr, okrEndDate]);

  const monthsInCycle = useMemo(() => {
    if (!effectiveOKRStartDate || !effectiveOKREndDate) return [];
    try {
      const start = parseLocalDate(effectiveOKRStartDate);
      const end = parseLocalDate(effectiveOKREndDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      const months: Date[] = [];

      while (cur.getTime() <= last.getTime()) {
        months.push(new Date(cur));
        cur.setMonth(cur.getMonth() + 1);
      }
      return months;
    } catch {
      return [];
    }
  }, [effectiveOKRStartDate, effectiveOKREndDate]);

  const monthlyTargetKind: KRTargetKind | null = useMemo(() => {
    if (isActivity) return null;
    if (type === 'percentage') return 'point';

    const d = (direction || 'increase') as any;
    if ((type === 'currency' || type === 'numeric') && (d === 'increase' || d === 'at_least')) {
      return 'delta';
    }
    // defaults seguros (evita “somar %”, e evita semânticas confusas em direções especiais)
    return 'point';
  }, [direction, isActivity, type]);

  const canEditMonthlyTargets =
    !isActivity &&
    Boolean(kr?.id) &&
    monthsInCycle.length > 0 &&
    Boolean(monthlyTargetKind);

  const [monthlyTargetsOpen, setMonthlyTargetsOpen] = useState(false);
  const [monthlyTargetsLoading, setMonthlyTargetsLoading] = useState(false);
  const [monthlyTargetsSaving, setMonthlyTargetsSaving] = useState(false);
  const [monthlyTargetsError, setMonthlyTargetsError] = useState<string | null>(null);
  const [monthlyTargetsSavedMsg, setMonthlyTargetsSavedMsg] = useState<string | null>(null);
  const [monthlyTargetMap, setMonthlyTargetMap] = useState<Record<string, string>>({});
  const [autoUpdateKRTargetFromMonthly, setAutoUpdateKRTargetFromMonthly] = useState(true);

  const monthKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  };

  const parsePtNumber = (raw: string): number | null => {
    const s = (raw || '').trim().replace(/\s/g, '');
    if (!s) return null;

    // Aceitar formatos:
    // - 100000
    // - 100000.50
    // - 100.000
    // - 100.000,50
    // - 1.000.000
    let normalized = s;
    if (normalized.includes(',')) {
      // vírgula como decimal => remove milhares (.) e troca , por .
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      const dots = normalized.match(/\./g)?.length || 0;
      if (dots > 1) {
        // vários pontos => tratar como milhares
        normalized = normalized.replace(/\./g, '');
      }
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  };

  const formatMonthLabel = (d: Date): string => {
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    if (!monthlyTargetsOpen) return;
    if (!canEditMonthlyTargets) return;

    let cancelled = false;
    setMonthlyTargetsLoading(true);
    setMonthlyTargetsError(null);
    setMonthlyTargetsSavedMsg(null);

    void (async () => {
      const rows = await listKRPeriodTargets(kr.id as string, 'month');
      if (cancelled) return;

      const nextMap: Record<string, string> = {};
      for (const m of monthsInCycle) {
        nextMap[monthKey(m)] = '';
      }
      rows.forEach((row) => {
        const key = row.period_start;
        // Não forçar kind: mostramos valor e, ao salvar, usamos a semântica padrão do KR (delta/point)
        nextMap[key] = String(row.target_value ?? '');
      });

      setMonthlyTargetMap(nextMap);
      setMonthlyTargetsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [canEditMonthlyTargets, kr.id, monthsInCycle, monthlyTargetsOpen]);

  const monthlyTargetsPreview = useMemo(() => {
    if (!canEditMonthlyTargets) return null;
    if (!monthlyTargetKind) return null;

    const parsed = monthsInCycle.map((m) => {
      const key = monthKey(m);
      const raw = (monthlyTargetMap[key] || '').trim();
      const num = parsePtNumber(raw);
      return { key, month: m, value: typeof num === 'number' ? num : null };
    });

    if (monthlyTargetKind === 'delta') {
      let cum = 0;
      return parsed.map((p) => {
        if (typeof p.value === 'number') cum += p.value;
        return { ...p, cumulative: cum };
      });
    }

    return parsed.map((p) => ({ ...p, cumulative: null }));
  }, [canEditMonthlyTargets, monthlyTargetKind, monthlyTargetMap, monthsInCycle]);

  const monthlyDeltaSum = useMemo(() => {
    if (!canEditMonthlyTargets) return null;
    if (monthlyTargetKind !== 'delta') return null;
    const last = (monthlyTargetsPreview || []).slice(-1)[0] as any;
    const sum = typeof last?.cumulative === 'number' ? last.cumulative : 0;
    return sum;
  }, [canEditMonthlyTargets, monthlyTargetKind, monthlyTargetsPreview]);

  const computedKRTotalTarget = useMemo(() => {
    if (monthlyTargetKind !== 'delta') return null;
    if (typeof monthlyDeltaSum !== 'number') return null;
    // Para metas acumulativas, a meta final do KR deve ser baseline + Σ(deltas)
    const baseline = startValue ?? 0;
    return baseline + monthlyDeltaSum;
  }, [monthlyDeltaSum, monthlyTargetKind, startValue]);

  // Validação
  const validate = (): string | null => {
    if (!title.trim() || title.length < 3) {
      return 'Título deve ter pelo menos 3 caracteres';
    }
    if (!isActivity) {
      if (targetValue !== null && targetValue < 0) {
        return 'Meta não pode ser negativa';
      }
      if (currentValue !== null && currentValue < 0) {
        return 'Valor atual não pode ser negativo';
      }
      if (direction === 'increase' && currentValue !== null && targetValue !== null && currentValue > targetValue) {
        return 'Para direção "Aumentar", valor atual deve ser menor que a meta';
      }
      if (direction === 'decrease' && currentValue !== null && targetValue !== null && currentValue < targetValue) {
        return 'Para direção "Diminuir", valor atual deve ser maior que a meta';
      }
      if (direction === 'in_between' && targetMax !== null && targetValue !== null && targetMax <= targetValue) {
        return 'Limite máximo deve ser maior que o mínimo';
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updates: Partial<KeyResult> = {
        title,
        description: description || null,
        type,
        direction: isActivity ? undefined : direction,
        start_value: isActivity ? null : startValue,
        current_value: isActivity ? null : currentValue,
        target_value: isActivity ? null : targetValue,
        target_max: direction === 'in_between' ? targetMax : null,
        unit: isActivity ? null : unit,
        status,
        activity_done: isActivity ? activityDone : false,
        responsible_user_id: responsibleUserId || null,
        show_in_cockpit: showInCockpit,
        updated_at: new Date().toISOString(),
      };

      const updated = await okrService.updateKeyResult(kr.id!, updates);
      
      if (updated) {
        onSave({ ...kr, ...updates, ...updated });
        onClose();
      } else {
        setError('Não foi possível salvar as alterações');
      }
    } catch (err) {
      console.error('Erro ao salvar KR:', err);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!kr?.id) return;
    const ok = confirm('Tem certeza que deseja excluir este Key Result? Esta ação não pode ser desfeita.');
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const success = await okrService.deleteKeyResult(kr.id);
      if (!success) {
        setError('Não foi possível excluir o KR. Tente novamente.');
        return;
      }
      onDelete?.(kr.id);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir KR:', err);
      setError('Erro ao excluir. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Editar Key Result</h3>
              <p className="text-xs text-slate-400">Atualize os dados do indicador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              Título do KR *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Aumentar taxa de conversão"
              className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes sobre como medir este indicador..."
              rows={2}
              className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Responsável */}
          <UserSelectCombobox
            users={users}
            value={responsibleUserId || null}
            onChange={(userId) => setResponsibleUserId(userId || '')}
            loading={loadingUsers}
            label="Responsável (opcional)"
            placeholder="Selecione o responsável pelo KR"
          />

          {/* Tipo e Direção */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                Tipo de Indicador
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as KeyResultType)}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="numeric">Quantidade</option>
                <option value="percentage">Percentual (%)</option>
                <option value="currency">Valor em R$</option>
                {isActivity && (
                  <option value="activity" disabled>
                    Atividade (desativado)
                  </option>
                )}
              </select>
            </div>

            {!isActivity && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Direção
                </label>
                <select
                  value={direction || ''}
                  onChange={e => setDirection(e.target.value as KeyResultDirection)}
                  className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="increase">↑ Aumentar</option>
                  <option value="decrease">↓ Diminuir</option>
                  <option value="at_most">↕ No Máximo</option>
                  <option value="at_least">↕ No Mínimo</option>
                  <option value="in_between">⇅ Entre (Faixa)</option>
                </select>
              </div>
            )}
          </div>

          {/* Valores (para não-atividade) */}
          {!isActivity && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                    Início
                  </label>
                  <FormattedNumberInput
                    value={startValue}
                    onChange={setStartValue}
                    placeholder="0"
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                    Atual
                  </label>
                  <FormattedNumberInput
                    value={currentValue}
                    onChange={setCurrentValue}
                    placeholder="0"
                    className="w-full bg-indigo-50 rounded-xl px-4 py-3 border-2 border-indigo-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                    Meta
                  </label>
                  <FormattedNumberInput
                    value={targetValue}
                    onChange={setTargetValue}
                    placeholder="100"
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Meta máxima (para in_between) */}
              {direction === 'in_between' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                    Limite Máximo (Faixa)
                  </label>
                  <FormattedNumberInput
                    value={targetMax}
                    onChange={setTargetMax}
                    placeholder="Valor máximo da faixa"
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}

              {/* Unidade */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Unidade
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="Ex: clientes, %, R$, leads..."
                  className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </>
          )}

          {/* Atividade (para tipo activity) */}
          {isActivity && (
            <div className="bg-slate-50 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activityDone}
                  onChange={e => setActivityDone(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Atividade concluída
                </span>
              </label>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              Status
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStatus('verde')}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                  status === 'verde' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                🟢 Verde
              </button>
              <button
                type="button"
                onClick={() => setStatus('amarelo')}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                  status === 'amarelo' 
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                }`}
              >
                🟡 Amarelo
              </button>
              <button
                type="button"
                onClick={() => setStatus('vermelho')}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                  status === 'vermelho' 
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' 
                    : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                }`}
              >
                🔴 Vermelho
              </button>
            </div>
          </div>

          {/* Exibir no Cockpit */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Exibir no Cockpit
                  </span>
                  <span className="text-xs text-slate-500">
                    KRs marcados aparecem no dashboard estrategico
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInCockpit(!showInCockpit)}
                className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                  showInCockpit ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    showInCockpit ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Metas mensais (opcional) */}
          {canEditMonthlyTargets && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setMonthlyTargetsOpen((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-800">Metas mensais (opcional)</div>
                  <div className="text-[11px] text-slate-500">
                    {monthlyTargetKind === 'delta'
                      ? 'Para valores acumulativos (ex.: faturamento): informe a meta de cada mês (delta).'
                      : 'Para % e direções especiais: informe a meta desejada no fim de cada mês (ponto).'}
                  </div>
                </div>
                <div className="text-slate-400">
                  {monthlyTargetsOpen ? '▲' : '▼'}
                </div>
              </button>

              {monthlyTargetsOpen && (
                <div className="px-4 pb-4">
                  {monthlyTargetsLoading ? (
                    <div className="py-3 text-xs text-slate-500">Carregando metas mensais...</div>
                  ) : (
                    <>
                      {monthlyTargetsError && (
                        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                          {monthlyTargetsError}
                        </div>
                      )}
                      {monthlyTargetsSavedMsg && (
                        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                          {monthlyTargetsSavedMsg}
                        </div>
                      )}

                      <div className="space-y-2">
                        {monthsInCycle.map((m) => {
                          const key = monthKey(m);
                          const raw = monthlyTargetMap[key] ?? '';
                          const preview = monthlyTargetsPreview?.find((p: any) => p.key === key);

                          return (
                            <div key={key} className="flex items-center gap-3">
                              <div className="w-28 text-xs font-bold text-slate-600 capitalize">
                                {formatMonthLabel(m)}
                              </div>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={raw}
                                onChange={(e) => {
                                  setMonthlyTargetMap((prev) => ({ ...prev, [key]: e.target.value }));
                                  setMonthlyTargetsError(null);
                                  setMonthlyTargetsSavedMsg(null);
                                }}
                                placeholder={monthlyTargetKind === 'delta' ? 'Ex: 150000 ou 150.000' : 'Ex: 3,5'}
                                className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-sm font-semibold border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                              {monthlyTargetKind === 'delta' && (
                                <div className="w-24 text-right text-[11px] font-bold text-slate-500">
                                  {typeof preview?.cumulative === 'number' ? `Σ ${preview.cumulative}` : '—'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {monthlyTargetKind === 'delta' && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                              Meta total (Σ meses)
                            </div>
                            <div className="text-sm font-black text-slate-800">
                              {typeof monthlyDeltaSum === 'number' ? `Σ ${monthlyDeltaSum.toLocaleString('pt-BR')}` : '—'}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px] text-slate-500">
                              Meta final do KR (baseline + Σ)
                            </div>
                            <div className="text-sm font-black text-indigo-700">
                              {typeof computedKRTotalTarget === 'number' ? computedKRTotalTarget.toLocaleString('pt-BR') : '—'}
                            </div>
                          </div>
                          <label className="mt-3 flex items-center gap-2 text-[11px] text-slate-600 font-semibold">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              checked={autoUpdateKRTargetFromMonthly}
                              onChange={(e) => {
                                setAutoUpdateKRTargetFromMonthly(e.target.checked);
                                setMonthlyTargetsError(null);
                                setMonthlyTargetsSavedMsg(null);
                              }}
                            />
                            Atualizar automaticamente a “Meta” do KR ao salvar (recomendado)
                          </label>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-500">
                          Deixe em branco para não usar meta mensal (o KR seguirá apenas a meta do período).
                        </div>
                        <button
                          type="button"
                          disabled={monthlyTargetsSaving}
                          onClick={async () => {
                            if (!kr?.id) return;
                            if (!monthlyTargetKind) return;

                            setMonthlyTargetsSaving(true);
                            setMonthlyTargetsError(null);
                            setMonthlyTargetsSavedMsg(null);

                            try {
                              const inputs = monthsInCycle
                                .map((m) => {
                                  const key = monthKey(m);
                                  const raw = (monthlyTargetMap[key] || '').trim();
                                  if (!raw) return null;
                                  const n = parsePtNumber(raw);
                                  if (typeof n !== 'number' || n < 0) return { key, invalid: true };
                                  return {
                                    period_start: key,
                                    target_kind: monthlyTargetKind,
                                    target_value: n,
                                  };
                                })
                                .filter(Boolean) as any[];

                              const hasInvalid = inputs.some((x) => x?.invalid);
                              if (hasInvalid) {
                                setMonthlyTargetsError('Existem valores inválidos. Corrija antes de salvar.');
                                return;
                              }

                              const ok = await syncKRPeriodTargets(kr.id, 'month', inputs);
                              if (!ok) {
                                setMonthlyTargetsError('Não foi possível salvar (verifique se a migration do banco foi executada).');
                                return;
                              }

                              // Se for delta (acumulativo), opcionalmente atualizar target_value do KR
                              if (
                                monthlyTargetKind === 'delta' &&
                                autoUpdateKRTargetFromMonthly &&
                                typeof computedKRTotalTarget === 'number'
                              ) {
                                const updatedKR = await okrService.updateKeyResult(kr.id, {
                                  target_value: computedKRTotalTarget,
                                  updated_at: new Date().toISOString(),
                                });
                                if (updatedKR) {
                                  setTargetValue(updatedKR.target_value ?? computedKRTotalTarget);
                                  setMonthlyTargetsSavedMsg(`✅ Metas mensais salvas e meta do KR atualizada para ${computedKRTotalTarget.toLocaleString('pt-BR')}.`);
                                } else {
                                  setMonthlyTargetsSavedMsg('✅ Metas mensais salvas. (Meta do KR não pôde ser atualizada automaticamente)');
                                }
                              } else {
                                setMonthlyTargetsSavedMsg('✅ Metas mensais salvas.');
                              }
                            } catch (e) {
                              console.error(e);
                              setMonthlyTargetsError('Erro ao salvar metas mensais.');
                            } finally {
                              setMonthlyTargetsSaving(false);
                            }
                          }}
                          className="px-4 py-2 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {monthlyTargetsSaving ? 'Salvando...' : 'Salvar metas mensais'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Excluir Key Result"
          >
            Excluir KR
          </button>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
