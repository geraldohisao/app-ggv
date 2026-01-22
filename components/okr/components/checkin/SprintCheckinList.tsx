import React, { useState, useEffect } from 'react';
import { getHealthColor, getHealthEmoji, formatCheckinDate } from '../../types/checkin.types';
import type { SprintCheckin } from '../../types/checkin.types';
import * as checkinService from '../../services/checkin.service';
import { usePermissions } from '../../hooks/usePermissions';

interface SprintCheckinListProps {
  sprintId: string;
  onEdit?: () => void; // Callback para abrir modal de edição
  onAddNew?: () => void; // Callback para adicionar novo check-in
  readOnly?: boolean;
  compact?: boolean; // Modo compacto para sidebar
  onCheckinDeleted?: () => void; // Callback quando check-in é deletado
}

export const SprintCheckinList: React.FC<SprintCheckinListProps> = ({ 
  sprintId, 
  onEdit, 
  onAddNew, 
  readOnly = false, 
  compact = false,
  onCheckinDeleted 
}) => {
  const [checkins, setCheckins] = useState<SprintCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null);
  const { isCEO } = usePermissions();

  useEffect(() => {
    loadCheckins();
  }, [sprintId]);

  const loadCheckins = async () => {
    setLoading(true);
    try {
      const data = await checkinService.listSprintCheckins(sprintId);
      setCheckins(data);
    } catch (error) {
      console.error('Erro ao carregar check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCheckin = async (checkinId: string, checkinDate: string) => {
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Você está prestes a deletar o check-in de ${formatCheckinDate(checkinDate)}.\n\n` +
      `Items vinculados a este check-in NÃO serão deletados, mas perderão a vinculação.\n\n` +
      `Esta ação NÃO pode ser desfeita. Deseja continuar?`
    );

    if (!confirmed) return;

    try {
      await checkinService.deleteSprintCheckin(checkinId);
      await loadCheckins(); // Recarregar lista
      if (onCheckinDeleted) {
        onCheckinDeleted(); // Notificar componente pai
      }
      alert('✅ Check-in deletado com sucesso!');
    } catch (error: any) {
      alert(`❌ Erro ao deletar check-in: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 ${compact ? 'p-5' : 'p-8'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold text-slate-800 flex items-center gap-2 ${compact ? 'text-base' : 'text-xl'}`}>
            <svg className={`text-purple-500 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Check-ins
          </h3>
          {onAddNew && !readOnly && (
            <button
              onClick={onAddNew}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Registrar
            </button>
          )}
        </div>
        <p className="text-sm text-slate-400 text-center py-4">
          Nenhum check-in registrado.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 ${compact ? 'p-5' : 'p-8'}`}>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-bold text-slate-800 flex items-center gap-2 ${compact ? 'text-base' : 'text-xl'}`}>
            <svg className={`text-purple-500 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Check-ins
            <span className="text-xs font-bold text-slate-400 ml-1">({checkins.length})</span>
          </h3>
          {onAddNew && !readOnly && (
            <button
              onClick={onAddNew}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Registrar
            </button>
          )}
        </div>
        
        {/* Aviso sobre edição - só mostra em modo não compacto */}
        {!compact && (
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Check-ins podem ser editados apenas no mesmo dia.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {checkins.map((checkin, index) => {
          const isExpanded = expandedCheckin === checkin.id;
          const healthColorClass = getHealthColor(checkin.health);
          const healthEmoji = getHealthEmoji(checkin.health);
          
          // Verificar se é check-in de hoje (editável)
          // IMPORTANTE: Comparar apenas a parte da data (YYYY-MM-DD)
          const now = new Date();
          const today = now.toISOString().split('T')[0]; // "2025-01-22"
          
          // Normalizar a data do check-in para YYYY-MM-DD
          let checkinDate = '';
          if (checkin.checkin_date) {
            // checkin_date pode ser "2025-01-22" ou "2025-01-22T00:00:00.000Z"
            checkinDate = checkin.checkin_date.split('T')[0];
          } else if (checkin.created_at) {
            checkinDate = checkin.created_at.split('T')[0];
          }
          
          const isToday = checkinDate === today;
          const isImmutable = !isToday;

          return (
            <div
              key={checkin.id}
              className="border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              {/* Header do Check-in - Layout otimizado */}
              <div
                className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedCheckin(isExpanded ? null : checkin.id)}
              >
                {/* Linha 1: Metadata + Ações */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${healthColorClass}`}>
                      {healthEmoji}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      #{checkins.length - index}
                    </span>
                    <span className="text-[11px] text-slate-400">•</span>
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      {formatCheckinDate(checkin.created_at || checkin.checkin_date || '')}
                    </span>
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold whitespace-nowrap">
                      {checkin.initiatives_completed}/{checkin.initiatives_total}
                    </span>
                    {checkin.carry_over_pct! > 30 && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold whitespace-nowrap">
                        ⚠️ {checkin.carry_over_pct}%
                      </span>
                    )}
                  </div>

                  {/* Ações compactas */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Botão Editar - SÓ APARECE SE FOR DE HOJE */}
                    {isToday && onEdit && !readOnly ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit();
                        }}
                        className="p-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-lg transition-all"
                        title={`Editar check-in de hoje`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    ) : readOnly ? (
                      <div 
                        className="p-1.5 bg-slate-100 text-slate-400 rounded-lg cursor-help"
                        title="Sprint encerrada"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    ) : isImmutable ? (
                      <div 
                        className="p-1.5 bg-slate-100 text-slate-400 rounded-lg cursor-help"
                        title={`Imutável - apenas check-ins de hoje podem ser editados`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    ) : null}
                    
                    {/* Botão Deletar - SÓ PARA SUPER ADMIN */}
                    {isCEO && !readOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCheckin(checkin.id!, checkinDate || '');
                        }}
                        className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-all"
                        title="Deletar check-in"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    {/* Expand/Collapse */}
                    <div className="p-1.5 text-slate-400">
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Linha 2: Título completo */}
                <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug pl-10">
                  {checkin.summary}
                </p>
              </div>

              {/* Conteúdo Expandido */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/30">
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    
                    {/* Entregas */}
                    {checkin.achievements && (
                      <div>
                        <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <span>✅</span> Entregas
                        </h4>
                        <div className="bg-white rounded-xl p-4 border border-emerald-100">
                          <p className="text-sm text-slate-700 whitespace-pre-line font-medium">
                            {checkin.achievements}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Bloqueios */}
                    {checkin.blockers && (
                      <div>
                        <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <span>⚠️</span> Bloqueios
                        </h4>
                        <div className="bg-white rounded-xl p-4 border border-rose-100">
                          <p className="text-sm text-slate-700 whitespace-pre-line font-medium">
                            {checkin.blockers}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Decisões */}
                    {checkin.decisions_taken && (
                      <div>
                        <h4 className="text-xs font-black text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <span>💬</span> Decisões
                        </h4>
                        <div className="bg-white rounded-xl p-4 border border-purple-100">
                          <p className="text-sm text-slate-700 whitespace-pre-line font-medium">
                            {checkin.decisions_taken}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Próximo Foco */}
                    {checkin.next_focus && (
                      <div>
                        <h4 className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <span>🎯</span> Próximo Foco
                        </h4>
                        <div className="bg-white rounded-xl p-4 border border-blue-100">
                          <p className="text-sm text-slate-700 whitespace-pre-line font-medium">
                            {checkin.next_focus}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Saúde */}
                  {checkin.health_reason && (
                    <div className="mt-6">
                      <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                        🏥 Motivo do Status {healthEmoji}
                      </h4>
                      <div className={`rounded-xl p-4 border-2 ${healthColorClass}`}>
                        <p className="text-sm font-bold">{checkin.health_reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {checkin.notes && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notas</h4>
                      <p className="text-sm text-slate-600 italic">{checkin.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
