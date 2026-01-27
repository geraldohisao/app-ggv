import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { KRWithOKRContext } from '../../services/cockpit.service';
import { getKREvolution, listKRCheckins, type KRCheckin } from '../../services/checkin.service';
import { listKRPeriodTargets, type KRPeriodTargetRow } from '../../services/krTargets.service';
import { parseLocalDate } from '../../utils/date';
import { calculateKeyResultProgress } from '../../types/okr.types';

interface KREvolutionModalProps {
  kr: KRWithOKRContext;
  onClose: () => void;
  initialFocus?: 'evolution' | 'monthly' | 'checkins';
}

type EvolutionPoint = {
  value: number;
  created_at: string;
  progress_pct?: number | null;
};

function formatShortDate(dateIso: string): string {
  try {
    const d = parseLocalDate(dateIso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '—';
  }
}

function formatMonthLabelFromPeriodStart(periodStart: string): string {
  try {
    const d = parseLocalDate(periodStart);
    return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  } catch {
    return periodStart;
  }
}

function formatKRNumber(
  kr: KRWithOKRContext,
  value: number | null | undefined,
  opts?: { isDelta?: boolean }
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  const isDelta = Boolean(opts?.isDelta);
  const sign = isDelta && value > 0 ? '+' : '';

  if (kr.type === 'percentage') {
    return `${sign}${Number(value).toFixed(1)}%`;
  }
  if (kr.type === 'currency') {
    return `${sign}R$ ${Number(value).toLocaleString('pt-BR')}`;
  }
  const unit = kr.unit ? ` ${kr.unit}` : '';
  return `${sign}${Number(value).toLocaleString('pt-BR')}${unit}`;
}

function monthStartKeyFromNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

type MonthlyChartRow = {
  monthStart: string;
  endValue: number;
  delta: number | null;
  target: { kind: string; value: number; max?: number | null } | null;
};

const SimpleLineChart: React.FC<{ points: EvolutionPoint[] }> = ({ points }) => {
  if (!points || points.length === 0) return null;
  const width = 640;
  const height = 220;
  const padding = 20;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const path = points
    .map((p, idx) => {
      const x = padding + idx * step;
      const y = padding + (height - padding * 2) * (1 - (p.value - min) / range);
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-indigo-600" />
      {points.map((p, idx) => {
        const x = padding + idx * step;
        const y = padding + (height - padding * 2) * (1 - (p.value - min) / range);
        return (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r={4}
            className="fill-indigo-600"
          />
        );
      })}
    </svg>
  );
};

const MonthlyTargetChart: React.FC<{
  rows: MonthlyChartRow[];
  defaultKind: 'delta' | 'point';
  mode?: 'period' | 'cumulative';
  startValue?: number | null;
}> = ({ rows, defaultKind }) => {
  if (!rows || rows.length === 0) return null;
  const mode = arguments[0]?.mode || 'period';
  const startValue = arguments[0]?.startValue ?? null;

  // Decide semântica:
  // - Se existir meta cadastrada, usa o kind dela (delta/point/range)
  // - Caso contrário, usa defaultKind (derivado do tipo do KR no editor)
  const kindByRow = rows.map((r) => (r.target?.kind as any) || defaultKind);

  // Série "no período" (delta ou point) e série "acumulada" (quando fizer sentido)
  const actualPeriodSeries = rows.map((r, idx) => {
    const kind = kindByRow[idx];
    if (kind === 'delta') return typeof r.delta === 'number' ? r.delta : 0;
    return r.endValue;
  });

  const actualCumulativeSeries = rows.map((r) => {
    if (startValue === null || startValue === undefined) return r.endValue;
    return r.endValue - startValue;
  });

  const targetPeriodSeries = rows.map((r) => {
    if (!r.target) return null;
    return r.target.value;
  });

  const targetCumulativeSeries = (() => {
    // Só faz sentido acumular se o kind for delta
    let cum = 0;
    return rows.map((r, idx) => {
      const kind = kindByRow[idx];
      if (kind !== 'delta') return null;
      const v = r.target?.value;
      const add = typeof v === 'number' ? v : 0;
      cum += add;
      return cum;
    });
  })();

  const targetMaxSeries = rows.map((r, idx) => {
    const kind = kindByRow[idx];
    if (!r.target) return null;
    if (kind !== 'range') return null;
    return typeof r.target.max === 'number' ? r.target.max : null;
  });

  const seriesActual = mode === 'cumulative' ? actualCumulativeSeries : actualPeriodSeries;
  const seriesTarget =
    mode === 'cumulative'
      ? targetCumulativeSeries
      : targetPeriodSeries;

  const allValues: number[] = [];
  seriesActual.forEach((v) => allValues.push(v));
  seriesTarget.forEach((v) => (typeof v === 'number' ? allValues.push(v) : null));
  targetMaxSeries.forEach((v) => (typeof v === 'number' ? allValues.push(v) : null));

  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 0);
  const range = max - min || 1;

  const width = 720;
  const height = 240;
  const paddingX = 28;
  const paddingY = 22;

  const xStep = rows.length > 1 ? (width - paddingX * 2) / (rows.length - 1) : 0;
  const barWidth = Math.min(34, Math.max(18, xStep * 0.45));

  const yFor = (v: number) => {
    const t = (v - min) / range; // 0..1
    return paddingY + (height - paddingY * 2) * (1 - t);
  };

  const yZero = yFor(0);

  const linePath = seriesTarget
    .map((v, idx) => {
      if (typeof v !== 'number') return null;
      const x = paddingX + idx * xStep;
      const y = yFor(v);
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  const minPath = rows
    .map((r, idx) => {
      const kind = kindByRow[idx];
      if (kind !== 'range') return null;
      const v = r.target?.value;
      if (typeof v !== 'number') return null;
      const x = paddingX + idx * xStep;
      const y = yFor(v);
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  const maxPath = rows
    .map((r, idx) => {
      const kind = kindByRow[idx];
      if (kind !== 'range') return null;
      const v = r.target?.max;
      if (typeof v !== 'number') return null;
      const x = paddingX + idx * xStep;
      const y = yFor(v);
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(' ');

  const isDeltaContext = defaultKind === 'delta';
  const legendKindLabel = (() => {
    if (!isDeltaContext) return 'Valor fim do mês vs Meta fim do mês';
    return mode === 'cumulative'
      ? 'Acumulado vs Meta acumulada'
      : 'Realizado (delta mês) vs Meta (delta mês)';
  })();

  return (
    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-slate-500">Meta x Realizado (mensal)</div>
          <div className="text-[11px] text-slate-500 mt-1">{legendKindLabel}</div>
        </div>
        <div className="text-[11px] text-slate-500 whitespace-nowrap">
          Barras: realizado • Linha: meta
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[240px]">
        {/* eixo zero */}
        <line x1={paddingX} x2={width - paddingX} y1={yZero} y2={yZero} className="stroke-slate-300" strokeWidth={1} />

        {/* barras */}
        {rows.map((r, idx) => {
          const xCenter = paddingX + idx * xStep;
          const v = seriesActual[idx] ?? 0;
          const y = yFor(v);
          const top = Math.min(y, yZero);
          const bottom = Math.max(y, yZero);
          return (
            <rect
              key={r.monthStart}
              x={xCenter - barWidth / 2}
              y={top}
              width={barWidth}
              height={Math.max(1, bottom - top)}
              rx={8}
              className="fill-emerald-500"
              opacity={0.9}
            />
          );
        })}

        {/* linha meta */}
        {linePath && (
          <path d={linePath} fill="none" strokeWidth={3} strokeLinecap="round" className="stroke-indigo-600" />
        )}

        {/* faixa (range): min e max (tracejado) */}
        {minPath && (
          <path d={minPath} fill="none" strokeWidth={2} strokeLinecap="round" className="stroke-indigo-400" strokeDasharray="4 4" />
        )}
        {maxPath && (
          <path d={maxPath} fill="none" strokeWidth={2} strokeLinecap="round" className="stroke-indigo-400" strokeDasharray="4 4" />
        )}

        {/* labels de mês */}
        {rows.map((r, idx) => {
          const x = paddingX + idx * xStep;
          return (
            <text
              key={`${r.monthStart}-label`}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="10"
              fontWeight="700"
            >
              {formatMonthLabelFromPeriodStart(r.monthStart).replace('.', '')}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export const KREvolutionModal: React.FC<KREvolutionModalProps> = ({ kr, onClose, initialFocus = 'evolution' }) => {
  const [loading, setLoading] = useState(true);
  const [evolution, setEvolution] = useState<EvolutionPoint[]>([]);
  const [checkins, setCheckins] = useState<KRCheckin[]>([]);
  const [targets, setTargets] = useState<KRPeriodTargetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const evolutionRef = useRef<HTMLDivElement | null>(null);
  const monthlyRef = useRef<HTMLDivElement | null>(null);
  const checkinsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [evo, full, monthlyTargets] = await Promise.all([
          getKREvolution(kr.id as string, 60),
          listKRCheckins(kr.id as string),
          listKRPeriodTargets(kr.id as string, 'month'),
        ]);

        if (cancelled) return;

        setEvolution(
          (evo || []).map((p: any) => ({
            value: Number(p.value ?? 0),
            created_at: p.created_at,
            progress_pct: p.progress_pct ?? null,
          }))
        );
        setCheckins(full || []);
        setTargets(monthlyTargets || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erro ao carregar evolução do KR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kr.id]);

  // Foco inicial (abrir já na seção desejada)
  useEffect(() => {
    if (loading) return;
    const ref =
      initialFocus === 'monthly'
        ? monthlyRef
        : initialFocus === 'checkins'
          ? checkinsRef
          : evolutionRef;
    // scrollIntoView dentro do modal (suave)
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [initialFocus, loading]);

  const progress = useMemo(() => {
    return calculateKeyResultProgress(kr).percentage;
  }, [kr]);

  const monthlyRollup = useMemo(() => {
    // Baseia em "último valor do mês" (pelo histórico de check-ins)
    const byMonth = new Map<string, EvolutionPoint>();
    for (const p of evolution) {
      const d = parseLocalDate(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      byMonth.set(key, p); // como evolution vem asc, o último overwrite é o último do mês
    }

    const months = Array.from(byMonth.keys()).sort();
    let prev: number | null = kr.start_value ?? null;
    return months.map((monthStart) => {
      const p = byMonth.get(monthStart)!;
      const endValue = p.value;
      const delta = prev === null ? null : endValue - prev;
      prev = endValue;

      const targetRow = targets.find((t) => t.period_start === monthStart);
      return {
        monthStart,
        endValue,
        delta,
        target: targetRow ? { kind: targetRow.target_kind, value: targetRow.target_value, max: targetRow.target_max } : null,
      };
    });
  }, [evolution, kr.start_value, targets]);

  const monthlyDefaultKind = useMemo<'delta' | 'point'>(() => {
    if (kr.type === 'percentage') return 'point';
    const d = (kr.direction || 'increase') as any;
    if ((kr.type === 'currency' || kr.type === 'numeric') && (d === 'increase' || d === 'at_least')) {
      return 'delta';
    }
    return 'point';
  }, [kr.direction, kr.type]);

  const [monthlyChartMode, setMonthlyChartMode] = useState<'period' | 'cumulative'>('period');

  const executive = useMemo(() => {
    if (!monthlyRollup || monthlyRollup.length === 0) return null;

    const nowKey = monthStartKeyFromNow();
    const idx = Math.max(
      0,
      monthlyRollup.findIndex((r) => r.monthStart === nowKey)
    );
    const selected = monthlyRollup.find((r) => r.monthStart === nowKey) || monthlyRollup[monthlyRollup.length - 1];
    const selectedIndex = monthlyRollup.findIndex((r) => r.monthStart === selected.monthStart);

    const direction = (kr.direction || 'increase') as any;
    const betterWhenLower = direction === 'decrease' || direction === 'at_most';

    const pickTarget = (row: any) => row?.target || null;

    const monthActual =
      monthlyDefaultKind === 'delta' ? (typeof selected.delta === 'number' ? selected.delta : null) : selected.endValue;
    const monthTargetRow = pickTarget(selected);
    const monthTargetValue =
      monthTargetRow && monthTargetRow.kind !== 'range' ? monthTargetRow.value : null;

    // Cumulativo (só faz sentido para delta)
    const start = kr.start_value ?? null;
    const cumActual = start === null || start === undefined ? selected.endValue : selected.endValue - start;
    const cumTarget = (() => {
      if (monthlyDefaultKind !== 'delta') return null;
      let sum = 0;
      for (let i = 0; i <= selectedIndex; i++) {
        const t = monthlyRollup[i]?.target;
        if (t && t.kind === 'delta') sum += Number(t.value || 0);
      }
      return sum;
    })();

    const rangeGap = (row: any) => {
      const t = row?.target;
      if (!t || t.kind !== 'range') return null;
      const min = Number(t.value);
      const max = Number(t.max ?? min);
      const v = row.endValue;
      if (v >= min && v <= max) return 0;
      if (v < min) return v - min;
      return v - max;
    };

    const monthGap = (() => {
      if (monthTargetRow?.kind === 'range') return rangeGap(selected);
      if (typeof monthActual !== 'number' || typeof monthTargetValue !== 'number') return null;
      return monthActual - monthTargetValue;
    })();

    const monthIsOk = (() => {
      const t = monthTargetRow;
      if (!t) return null;
      if (t.kind === 'range') return rangeGap(selected) === 0;
      if (typeof monthActual !== 'number') return null;
      if (betterWhenLower) return monthActual <= t.value;
      return monthActual >= t.value;
    })();

    const cumGap =
      monthlyDefaultKind === 'delta' && typeof cumActual === 'number' && typeof cumTarget === 'number'
        ? cumActual - cumTarget
        : null;

    return {
      selected,
      selectedIndex,
      monthActual,
      monthTargetRow,
      monthGap,
      monthIsOk,
      cumActual,
      cumTarget,
      cumGap,
      mode: monthlyChartMode,
      idx,
    };
  }, [kr.direction, kr.start_value, monthlyChartMode, monthlyDefaultKind, monthlyRollup]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-wider text-indigo-500">Evolução do KR</div>
            <div className="text-lg font-bold text-slate-900 truncate">{kr.title}</div>
            <div className="text-xs text-slate-500 mt-1">
              Progresso atual: <span className="font-black text-slate-700">{Math.round(progress)}%</span>
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

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-rose-50 text-rose-700 border border-rose-200 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-48 bg-slate-100 rounded" />
            </div>
          ) : (
            <>
              {/* Resumo executivo */}
              {executive && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Mês referência
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1 capitalize">
                      {formatMonthLabelFromPeriodStart(executive.selected.monthStart)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {monthlyDefaultKind === 'delta'
                        ? executive.mode === 'cumulative'
                          ? 'Acumulado'
                          : 'Mensal'
                        : 'Fim do mês'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Realizado</div>
                    <div className="text-lg font-black text-emerald-600 mt-1">
                      {monthlyDefaultKind === 'delta'
                        ? executive.mode === 'cumulative'
                          ? formatKRNumber(kr, executive.cumActual, { isDelta: true })
                          : formatKRNumber(kr, executive.monthActual, { isDelta: true })
                        : formatKRNumber(kr, executive.monthActual)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Meta</div>
                    <div className="text-lg font-black text-indigo-600 mt-1">
                      {monthlyDefaultKind === 'delta'
                        ? executive.mode === 'cumulative'
                          ? formatKRNumber(kr, executive.cumTarget, { isDelta: true })
                          : formatKRNumber(kr, executive.monthTargetRow?.kind === 'delta' ? executive.monthTargetRow.value : null, { isDelta: true })
                        : executive.monthTargetRow?.kind === 'range'
                          ? `${formatKRNumber(kr, executive.monthTargetRow.value)} – ${formatKRNumber(kr, Number(executive.monthTargetRow.max ?? executive.monthTargetRow.value))}`
                          : formatKRNumber(kr, executive.monthTargetRow?.value)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gap</div>
                    <div className={`text-lg font-black mt-1 ${
                      executive.monthIsOk === null
                        ? 'text-slate-500'
                        : executive.monthIsOk
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                    }`}>
                      {monthlyDefaultKind === 'delta'
                        ? executive.mode === 'cumulative'
                          ? formatKRNumber(kr, executive.cumGap, { isDelta: true })
                          : formatKRNumber(kr, executive.monthGap, { isDelta: true })
                        : executive.monthTargetRow?.kind === 'range' && executive.monthGap === 0
                          ? 'Dentro'
                          : formatKRNumber(kr, executive.monthGap, { isDelta: true })}
                    </div>
                  </div>
                </div>
              )}

              <div ref={evolutionRef} className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">Evolução por atualização</div>
                  <div className="text-xs text-slate-500">{evolution.length} pontos</div>
                </div>
                {evolution.length === 0 ? (
                  <div className="text-sm text-slate-500">Nenhum check-in encontrado para este KR.</div>
                ) : (
                  <div className="text-indigo-600">
                    <SimpleLineChart points={evolution} />
                  </div>
                )}
              </div>

              {monthlyRollup.length > 0 && (
                <div ref={monthlyRef} className="space-y-3">
                  {monthlyDefaultKind === 'delta' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setMonthlyChartMode('period')}
                        className={`px-3 py-1.5 rounded-full text-xs font-black border transition-colors ${
                          monthlyChartMode === 'period'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Mensal
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthlyChartMode('cumulative')}
                        className={`px-3 py-1.5 rounded-full text-xs font-black border transition-colors ${
                          monthlyChartMode === 'cumulative'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Acumulado
                      </button>
                    </div>
                  )}
                  <MonthlyTargetChart
                    rows={monthlyRollup as any}
                    defaultKind={monthlyDefaultKind}
                    mode={monthlyDefaultKind === 'delta' ? monthlyChartMode : 'period'}
                    startValue={kr.start_value ?? null}
                  />
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-500">Metas mensais</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {monthlyDefaultKind === 'delta'
                        ? 'Cada card mostra realizado/meta do mês (delta).'
                        : 'Cada card mostra valor de fim do mês e a meta do mês.'}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{targets.length} metas</div>
                </div>

                {monthlyRollup.length === 0 ? (
                  <div className="text-sm text-slate-500">Sem consolidação mensal (registre check-ins para formar a série).</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {monthlyRollup.map((row, idx) => {
                      const direction = (kr.direction || 'increase') as any;
                      const betterWhenLower = direction === 'decrease' || direction === 'at_most';
                      const actual =
                        monthlyDefaultKind === 'delta' ? (typeof row.delta === 'number' ? row.delta : null) : row.endValue;

                      const target = row.target;
                      const isRange = target?.kind === 'range';
                      const hasTarget = Boolean(target);

                      const gap = (() => {
                        if (!hasTarget) return null;
                        if (isRange) {
                          const min = Number(target!.value);
                          const max = Number(target!.max ?? min);
                          if (row.endValue >= min && row.endValue <= max) return 0;
                          if (row.endValue < min) return row.endValue - min;
                          return row.endValue - max;
                        }
                        if (typeof actual !== 'number') return null;
                        return actual - Number(target!.value);
                      })();

                      const ok = (() => {
                        if (!hasTarget) return null;
                        if (isRange) return gap === 0;
                        if (typeof actual !== 'number') return null;
                        if (betterWhenLower) return actual <= Number(target!.value);
                        return actual >= Number(target!.value);
                      })();

                      const border =
                        ok === null ? 'border-slate-200' : ok ? 'border-emerald-200' : 'border-rose-200';
                      const badge =
                        ok === null ? 'bg-slate-100 text-slate-600' : ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

                      return (
                        <div key={row.monthStart} className={`rounded-2xl border ${border} p-4 bg-white`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mês</div>
                              <div className="text-sm font-black text-slate-900 capitalize truncate">
                                {formatMonthLabelFromPeriodStart(row.monthStart)}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${badge}`}>
                              {ok === null ? 'Sem meta' : ok ? 'Ok' : 'Gap'}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="flex items-baseline justify-between gap-3">
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Realizado</div>
                              <div className="text-sm font-black text-emerald-600">
                                {monthlyDefaultKind === 'delta'
                                  ? formatKRNumber(kr, actual, { isDelta: true })
                                  : formatKRNumber(kr, actual)}
                              </div>
                            </div>

                            <div className="flex items-baseline justify-between gap-3">
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Meta</div>
                              <div className="text-sm font-black text-indigo-600">
                                {target
                                  ? target.kind === 'range'
                                    ? `${formatKRNumber(kr, target.value)} – ${formatKRNumber(kr, Number(target.max ?? target.value))}`
                                    : monthlyDefaultKind === 'delta'
                                      ? formatKRNumber(kr, target.value, { isDelta: true })
                                      : formatKRNumber(kr, target.value)
                                  : '—'}
                              </div>
                            </div>

                            <div className="flex items-baseline justify-between gap-3">
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gap</div>
                              <div className={`text-sm font-black ${ok === null ? 'text-slate-500' : ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {target?.kind === 'range' && gap === 0
                                  ? 'Dentro'
                                  : monthlyDefaultKind === 'delta'
                                    ? formatKRNumber(kr, gap, { isDelta: true })
                                    : formatKRNumber(kr, gap, { isDelta: true })}
                              </div>
                            </div>

                            {monthlyDefaultKind === 'delta' && typeof row.delta === 'number' && (
                              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                                Fim do mês: <span className="font-semibold text-slate-700">{formatKRNumber(kr, row.endValue)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 text-[11px] text-slate-500">
                  Para editar metas mensais, abra o KR no módulo de OKR e use a seção “Metas mensais (opcional)”.
                </div>
              </div>

              <div ref={checkinsRef} className="bg-white rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">Últimos check-ins</div>
                  <div className="text-xs text-slate-500">{checkins.length}</div>
                </div>
                {checkins.length === 0 ? (
                  <div className="text-sm text-slate-500">Nenhum check-in encontrado.</div>
                ) : (
                  <div className="space-y-2">
                    {checkins.slice(0, 8).map((c) => (
                      <div key={c.id || c.created_at} className="flex items-start justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-700">
                            {formatShortDate(c.created_at || '')}
                            <span className="text-slate-300 mx-2">•</span>
                            Valor: <span className="font-black">{Number(c.value ?? 0).toLocaleString('pt-BR')}</span>
                            {typeof c.delta === 'number' && (
                              <>
                                <span className="text-slate-300 mx-2">•</span>
                                Δ {c.delta.toLocaleString('pt-BR')}
                              </>
                            )}
                          </div>
                          {c.comment && (
                            <div className="text-xs text-slate-600 mt-1 line-clamp-2">“{c.comment}”</div>
                          )}
                        </div>
                        {typeof c.progress_pct === 'number' && (
                          <div className="text-xs font-black text-indigo-600">
                            {Math.round(Number(c.progress_pct))}%
                          </div>
                        )}
                      </div>
                    ))}
                    {checkins.length > 8 && (
                      <div className="text-[11px] text-slate-500">
                        Mostrando 8 de {checkins.length}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KREvolutionModal;

