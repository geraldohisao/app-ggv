import React, { useState, useEffect } from 'react';
import { getHealthColor, getHealthEmoji, formatCheckinDate } from '../../types/checkin.types';
import type { SprintCheckin } from '../../types/checkin.types';
import * as checkinService from '../../services/checkin.service';

interface SprintCheckinListProps {
  sprintId: string;
  onEdit?: () => void; // Callback para abrir modal de edição
  readOnly?: boolean;
}

export const SprintCheckinList: React.FC<SprintCheckinListProps> = ({ sprintId, onEdit, readOnly = false }) => {
  const [checkins, setCheckins] = useState<SprintCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null);

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
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-lg font-bold text-slate-700 mb-2">Nenhum check-in registrado</p>
        <p className="text-sm text-slate-400">
          Registre o primeiro check-in para documentar o progresso desta sprint.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Check-ins do Ciclo
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {checkins.length} {checkins.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
        
        {/* Aviso sobre edição */}
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Check-ins podem ser editados apenas no mesmo dia. Histórico anterior é imutável.
        </p>
      </div>

      <div className="space-y-4">
        {checkins.map((checkin, index) => {
          const isExpanded = expandedCheckin === checkin.id;
          const healthColorClass = getHealthColor(checkin.health);
          const healthEmoji = getHealthEmoji(checkin.health);
          
          // Verificar se é check-in de hoje (editável)
          // IMPORTANTE: Usar data atual do sistema
          const now = new Date();
          const today = now.toISOString().split('T')[0];
          const checkinDate = checkin.checkin_date || checkin.created_at?.split('T')[0];
          const isToday = checkinDate === today;
          const isImmutable = !isToday;
          
          // Debug
          console.log('🔍 Check-in:', {
            id: checkin.id,
            checkinDate,
            today,
            isToday,
            canEdit: isToday && onEdit && !readOnly
          });

          return (
            <div
              key={checkin.id}
              className="border-2 border-slate-100 rounded-2xl overflow-hidden hover:border-indigo-200 transition-all"
            >
              {/* Header do Check-in */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedCheckin(isExpanded ? null : checkin.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${healthColorClass}`}>
                    {healthEmoji}
                  </div>
                  <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Check-in #{checkins.length - index}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {formatCheckinDate(checkin.created_at || checkin.checkin_date || '')}
                    </span>
                  </div>
                    <p className="font-bold text-slate-800 line-clamp-1">{checkin.summary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Métricas Rápidas */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold">
                      {checkin.initiatives_completed}/{checkin.initiatives_total}
                    </span>
                    {checkin.carry_over_pct! > 30 && (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold">
                        ⚠️ {checkin.carry_over_pct}%
                      </span>
                    )}
                  </div>

                  {/* Botão Editar - SÓ APARECE SE FOR DE HOJE */}
                  {isToday && onEdit && !readOnly ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                      title={`Editar check-in de hoje (${today})`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                  ) : readOnly ? (
                    <div 
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs font-medium cursor-help"
                      title="Sprint concluída/cancelada: check-ins bloqueados."
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Encerrado
                    </div>
                  ) : isImmutable ? (
                    // Ícone de cadeado com tooltip explicativo
                    <div 
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs font-medium cursor-help"
                      title={`Check-in de ${checkinDate} é imutável. Apenas check-ins de hoje (${today}) podem ser editados.`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Imutável
                    </div>
                  ) : null}

                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Conteúdo Expandido */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t-2 border-slate-100 bg-slate-50/50">
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
