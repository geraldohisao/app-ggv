import React, { useState } from 'react';
import { ProgressBar } from '../shared/ProgressBar';
import type { OKRWithKeyResults, KeyResultStatus, KeyResult } from '../../types/okr.types';
import { calculateOKRProgress, isOKROverdue } from '../../types/okr.types';
import { calculateKRProgress, formatKRValue } from '../../utils/krProgress';
import * as okrService from '../../services/okr.service';

interface OKRCardProps {
  okr: OKRWithKeyResults;
  onClick?: () => void;
  ownerAvatarUrl?: string | null;
}

export const OKRCard: React.FC<OKRCardProps> = ({ okr, onClick, ownerAvatarUrl }) => {
  const [imgError, setImgError] = useState(false);
  const [localOKR, setLocalOKR] = useState<OKRWithKeyResults>(okr);
  const [editingKR, setEditingKR] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const progress = calculateOKRProgress(localOKR);
  const overdue = isOKROverdue(localOKR);
  const isCycleEnded = okr.end_date && new Date(okr.end_date) < new Date() && okr.status !== 'concluído';

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return 'Período não definido';
    const s = new Date(start).toLocaleDateString('pt-BR');
    const e = new Date(end).toLocaleDateString('pt-BR');
    return `${s} — ${e}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluído':
        return 'bg-emerald-50 text-emerald-600';
      case 'em andamento':
        return 'bg-blue-50 text-blue-600';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  const getKRStatusColor = (status: KeyResultStatus) => {
    switch (status) {
      case 'verde':
        return 'bg-emerald-50 text-emerald-600';
      case 'amarelo':
        return 'bg-amber-50 text-amber-600';
      case 'vermelho':
        return 'bg-rose-50 text-rose-600';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  const summaryColor =
    progress >= 85 ? 'text-emerald-600 bg-emerald-50' :
    progress >= 70 ? 'text-amber-600 bg-amber-50' :
    'text-rose-600 bg-rose-50';

  const setKrLocal = (krId: string, updater: (kr: KeyResult) => KeyResult) => {
    setLocalOKR((prev) => ({
      ...prev,
      key_results: prev.key_results.map((k) => (k.id === krId ? updater(k) : k)),
    }));
  };

  const handleInlineUpdate = async (kr: KeyResult) => {
    if (!tempValue.trim()) {
      alert('Informe um valor');
      return;
    }
    const newValue = Number(tempValue.replace(',', '.'));
    if (Number.isNaN(newValue)) {
      alert('Valor inválido');
      return;
    }
    setSaving(true);
    try {
      const updated = await okrService.updateKeyResult(kr.id!, {
        current_value: newValue,
        updated_at: new Date().toISOString(),
      });
      if (updated) {
        setKrLocal(kr.id!, (k) => ({
          ...k,
          current_value: newValue,
          updated_at: updated.updated_at || new Date().toISOString(),
        }));
        setEditingKR(null);
        setTempValue('');
      } else {
        alert('Não foi possível atualizar o KR.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar o KR.');
    } finally {
      setSaving(false);
    }
  };

  const calcRisk = (kr: KeyResult) => {
    if (!localOKR.start_date || !localOKR.end_date) return '';
    const start = new Date(localOKR.start_date).getTime();
    const end = new Date(localOKR.end_date).getTime();
    const now = Date.now();
    const pctTime = Math.min(1, Math.max(0, (now - start) / (end - start)));
    const pctProgress = calculateKRProgress(kr) / 100;
    if (pctTime > 0.7 && pctProgress < 0.4) return 'Risco: atraso';
    if (pctTime > 1 && pctProgress < 1) return 'Atrasado';
    return '';
  };

  const renderSparkline = (history?: { date: string; value: number }[]) => {
    if (!history || history.length === 0) return null;
    const points = history.slice(-12);
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const step = points.length > 1 ? width / (points.length - 1) : width;
    const path = points
      .map((p, idx) => {
        const x = idx * step;
        const y = height - ((p.value - min) / range) * height;
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-20 h-6 text-indigo-500">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100
        hover:shadow-md transition-all cursor-pointer group
        relative items-start
      `}
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-3">
            <span className="px-3 py-1 bg-indigo-50 text-[#5B5FF5] text-[10px] font-black uppercase rounded-full tracking-widest">
              {okr.level}
            </span>
            <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase rounded-full tracking-widest">
              {okr.department}
            </span>
            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-widest ${getStatusColor(okr.status)}`}>
              {okr.status}
            </span>
            {overdue && (
              <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-full tracking-widest">
                Atrasado
              </span>
            )}
            {isCycleEnded && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-full tracking-widest border border-amber-200">
                Ciclo Encerrado
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-slate-900 leading-tight group-hover:text-[#5B5FF5] transition-colors mb-2">
            {okr.objective}
          </h3>
          {okr.notes && (
            <p className="text-sm text-slate-500 line-clamp-2 mb-3" title={okr.notes}>
              {okr.notes}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
            <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
              {formatDateRange(okr.start_date, okr.end_date)}
            </span>
            <span className={`px-3 py-1 rounded-full border ${summaryColor === 'text-emerald-600 bg-emerald-50' ? 'border-emerald-100' : summaryColor === 'text-amber-600 bg-amber-50' ? 'border-amber-100' : 'border-rose-100'} ${summaryColor}`}>
              Progresso: {progress.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Responsável Compacto */}
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-100 shrink-0">
          <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
            {ownerAvatarUrl && !imgError ? (
              <img 
                src={ownerAvatarUrl} 
                alt={okr.owner} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold text-[10px]">
                {okr.owner.charAt(0).toUpperCase() + (okr.owner.split(' ')[1]?.[0]?.toUpperCase() || '')}
              </div>
            )}
          </div>
          <div className="text-left">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Resp.</p>
            <p className="text-[10px] font-bold text-slate-800 leading-tight truncate max-w-[80px]" title={okr.owner}>{okr.owner}</p>
          </div>
        </div>
      </div>

        {/* Lista de Key Results (Layout em Linha) */}
        <div className="space-y-3 bg-slate-50/50 rounded-3xl p-5 border border-slate-100 overflow-x-auto">
          {localOKR.key_results?.map((kr, i) => {
            const risk = calcRisk(kr);
            const krProgress = calculateKRProgress(kr);
            return (
            <div key={i} className="flex flex-col xl:flex-row xl:items-center gap-4 py-2 border-b border-slate-100 last:border-0 hover:bg-white/80 transition-colors rounded-xl px-2"> {/* Changed to xl:breakpoint and flex-col default */}
              {/* Status e Título */}
              <div className="flex items-center gap-3 flex-1 min-w-0" title={kr.description || kr.title}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  krProgress >= 85 ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 
                  krProgress >= 75 ? 'bg-amber-500 shadow-[0_0_8px_#F59E0B]' : 
                  'bg-rose-500 shadow-[0_0_8px_#F43F5E]'
                }`} />
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-bold text-slate-700 leading-snug truncate">{kr.title}</p>
                  {kr.description && (
                    <p className="text-[10px] text-slate-400 truncate hidden sm:block" title={kr.description}>{kr.description}</p>
                  )}
                  {kr.updated_at && (
                    <p className="text-[10px] text-slate-400 mt-1">Última atualização: {new Date(kr.updated_at).toLocaleDateString('pt-BR')}</p>
                  )}
                  {risk && (
                    <p className="text-[10px] text-amber-600 mt-1 font-semibold">{risk}</p>
                  )}
                </div>
              </div>

              {/* Valores e Progresso */}
              <div className="flex items-center gap-4 w-full xl:w-auto mt-2 xl:mt-0"> {/* w-full on mobile */}
                <div className="flex flex-col items-end min-w-[80px]">
                  <span className="text-sm font-black text-slate-900">
                    {formatKRValue(kr.current_value, kr.type, kr.unit)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Meta: {formatKRValue(kr.target_value, kr.type, kr.unit)}
                  </span>
                  <span className={`mt-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getKRStatusColor(kr.status)}`}>
                    {kr.status}
                  </span>
                  {typeof kr.weight === 'number' && (
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Peso: {kr.weight}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[100px]">
                  <div className="flex-1">
                    <ProgressBar 
                      percentage={krProgress} 
                      color={
                        krProgress >= 85 ? 'green' : 
                        krProgress >= 75 ? 'yellow' : 
                        'red'
                      } 
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 min-w-[35px] text-right">
                    {krProgress.toFixed(0)}%
                  </span>
                  {renderSparkline(kr.history)}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto xl:ml-0"> {/* ml-auto pushes to right on mobile */}
                  {editingKR === kr.id ? (
                    <>
                      <input
                        type="number"
                        className="w-24 bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        placeholder={String(kr.current_value ?? 0)}
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleInlineUpdate(kr)}
                        className="text-xs font-bold text-white bg-indigo-500 px-3 py-2 rounded-xl hover:brightness-110 disabled:opacity-60"
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingKR(null); setTempValue(''); }}
                        className="text-xs font-bold text-slate-400 px-2"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingKR(kr.id || `kr-${i}`); setTempValue(String(kr.current_value ?? '')); }}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Atualizar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )})}
          {(!localOKR.key_results || localOKR.key_results.length === 0) && (
            <p className="text-center text-xs text-slate-400 font-medium py-2">Nenhum Key Result cadastrado.</p>
          )}
        </div>
    </div>
  );
};
