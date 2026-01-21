import React, { useEffect, useMemo, useState } from 'react';
import { useSprintStore } from '../store/sprintStore';
import { SprintItemRow } from '../components/sprint/SprintItemRow';
import { SprintItemForm } from '../components/sprint/SprintItemForm';
import { Badge } from '../components/shared/Badge';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import { useOKRStore } from '../store/okrStore';
import {
  getSprintStatusColor,
  getSprintTypeColor,
  getSprintTypeLabel,
  formatDateRange,
  calculateSprintProgress,
  getSprintItemsByType,
  SprintItemType,
  SprintItemStatus,
} from '../types/sprint.types';
import { getDepartmentLabel } from '../types/okr.types';
import * as sprintService from '../services/sprint.service';
import { usePermissions } from '../hooks/usePermissions';

interface SprintDetailProps {
  sprintId: string;
  onBack?: () => void;
}

export const SprintDetail: React.FC<SprintDetailProps> = ({
  sprintId,
  onBack,
}) => {
  const { selectedSprint, loading, fetchSprintById, finalizeAndCreateNext } = useSprintStore();
  const [updating, setUpdating] = useState(false);
  const [newItemType, setNewItemType] = useState<SprintItemType | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const permissions = usePermissions();
  const { okrs: allOKRs, fetchOKRs } = useOKRStore();

  const RITUAL_STEPS = [
    { id: 'numeros', title: 'Números', emoji: '📊', description: 'Check-in dos KRs' },
    { id: 'entregas', title: 'Entregas', emoji: '⚡', description: 'Iniciativas e Marcos' },
    { id: 'impedimentos', title: 'Impedimentos', emoji: '🛡️', description: 'O que está travando?' },
    { id: 'decisoes', title: 'Decisões', emoji: '💬', description: 'Atas e combinados' },
  ];

  useEffect(() => {
    fetchSprintById(sprintId);
    fetchOKRs();
  }, [sprintId]);

  const linkedOKRs = useMemo(() => {
    if (!selectedSprint?.okr_ids) return [];
    return allOKRs.filter(okr => (selectedSprint as any).okr_ids.includes(okr.id));
  }, [selectedSprint?.okr_ids, allOKRs]);

  const handleItemUpdate = async (itemId: string, updates: any) => {
    setUpdating(true);
    try {
      await sprintService.updateSprintItem(itemId, updates);
      // Recarregar sprint
      await fetchSprintById(sprintId);
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleItemDelete = async (itemId: string) => {
    if (!confirm('Deseja realmente remover este item?')) return;

    setUpdating(true);
    try {
      await sprintService.deleteSprintItem(itemId);
      // Recarregar sprint
      await fetchSprintById(sprintId);
    } catch (error) {
      console.error('Erro ao deletar item:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    if (!selectedSprint) return;

    setUpdating(true);
    try {
      await sprintService.updateSprint(selectedSprint.id!, { status: newStatus });
      await fetchSprintById(sprintId);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleFinalizeAndNext = async () => {
    if (!selectedSprint) return;

    if (!confirm('Deseja finalizar este ritual e abrir o próximo automaticamente? Itens não concluídos serão transferidos para o novo ciclo.')) {
      return;
    }

    setUpdating(true);
    try {
      const nextSprint = await finalizeAndCreateNext(selectedSprint.id!);
      if (nextSprint) {
        alert('Ritual concluído! Iniciando o próximo ciclo.');
        fetchSprintById(nextSprint.id!); // Muda para a nova sprint se necessário ou apenas recarrega
      }
    } catch (error) {
      console.error('Erro ao rotacionar ritual:', error);
      alert('Erro ao rotacionar ritual. Verifique o console.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !selectedSprint) {
    return <LoadingState message="Carregando Sprint..." />;
  }

  const canEditThisSprint = permissions.sprint.canEdit(selectedSprint);
  const progress = calculateSprintProgress(selectedSprint);
  const itemsByType = useMemo(
    () => getSprintItemsByType(selectedSprint.items || []),
    [selectedSprint.items]
  );

  const handleKRCheckin = async (krId: string, newValue: number) => {
    if (!selectedSprint) return;
    try {
      setUpdating(true);
      await sprintService.createKRCheckin({
        sprint_id: selectedSprint.id!,
        kr_id: krId,
        value: newValue,
      });
      // Recarregar para atualizar os checkins locais se necessário
      await fetchSprintById(sprintId);
    } catch (error) {
      console.error('Erro no checkin do KR:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Voltar para Sprints
          </button>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge
                label={getSprintTypeLabel(selectedSprint.type)}
                color={getSprintTypeColor(selectedSprint.type)}
              />
              <Badge
                label={getDepartmentLabel(selectedSprint.department)}
                color="bg-gray-100 text-gray-800 border-gray-200"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {selectedSprint.title}
            </h1>
            {selectedSprint.description && (
              <p className="text-gray-600">{selectedSprint.description}</p>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Período</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDateRange(selectedSprint.start_date, selectedSprint.end_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <Badge
                  label={selectedSprint.status}
                  color={getSprintStatusColor(selectedSprint.status)}
                />
                <select
                  value={selectedSprint.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating || !canEditThisSprint}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="planejada">Planejada</option>
                  <option value="em andamento">Em Andamento</option>
                  <option value="concluída">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              {selectedSprint.status !== 'concluída' && canEditThisSprint && (
                <button
                  onClick={handleFinalizeAndNext}
                  disabled={updating}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  ✨ Finalizar e Abrir Próximo
                </button>
              )}
              {selectedSprint.status === 'concluída' && (
                <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Ritual Concluído</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Progresso</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{progress}%</span>
              </div>
            </div>
          </div>

          {/* OKR Vinculado */}
          {linkedOKRs.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {linkedOKRs.map(okr => (
                <div key={okr.id} className="px-3 py-1 bg-purple-50 rounded-full border border-purple-100 flex items-center gap-2">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">OKR em Foco</span>
                  <span className="text-xs font-bold text-purple-900">{okr.objective}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RITUAL STEPPER */}
      <div className="mb-10 lg:sticky lg:top-4 z-20">
        <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-100 shadow-xl p-2 flex items-center justify-between gap-1 overflow-x-auto">
          {RITUAL_STEPS.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`
                  flex-1 min-w-[120px] py-4 px-6 rounded-[2rem] flex flex-col items-center justify-center transition-all relative
                  ${isActive ? 'bg-[#5B5FF5] text-white shadow-lg' : 'hover:bg-slate-50 text-slate-400'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{step.emoji}</span>
                  <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-800'}`}>
                    {step.title}
                  </span>
                </div>
                {isActive && (
                  <span className="text-[9px] font-bold text-white/70 uppercase tracking-tighter mt-1">{step.description}</span>
                )}
                {isCompleted && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white">✓</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT BY STEP */}
      <div className="min-h-[500px]">
        {currentStep === 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Check-in de Indicadores (KRs)</h2>
                <p className="text-sm text-slate-500 font-medium">Atualize os números dos OKRs em foco neste ciclo.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {linkedOKRs.length === 0 ? (
                <EmptyState title="Nenhum OKR vinculado" description="Vincule OKRs a esta Sprint para fazer o check-in dos números." />
              ) : (
                linkedOKRs.map(okr => (
                  <div key={okr.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                    <h3 className="text-sm font-black text-indigo-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {okr.objective}
                    </h3>
                    <div className="space-y-6">
                      {okr.key_results?.map(kr => {
                        const checkin = (selectedSprint as any).checkins?.find((c: any) => c.kr_id === kr.id);
                        return (
                          <div key={kr.id} className="group flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-3xl hover:bg-slate-50/80 transition-all border border-transparent hover:border-slate-100">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-800 mb-2">{kr.title}</h4>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-100 rounded-full h-2">
                                  <div
                                    className="bg-indigo-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, (kr.current_value / kr.target_value) * 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {kr.current_value} / {kr.target_value} {kr.unit}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                defaultValue={kr.current_value}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (val !== kr.current_value) handleKRCheckin(kr.id, val);
                                }}
                                className="w-32 bg-white rounded-xl px-4 py-2 border border-slate-200 focus:ring-2 focus:ring-[#5B5FF5] text-sm font-bold text-slate-800"
                                placeholder="Valor atual"
                              />
                              {checkin && (
                                <Badge label="Check-in hoje ✓" color="bg-emerald-50 text-emerald-600 border-emerald-100" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={() => setCurrentStep(1)}
                className="bg-[#5B5FF5] text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-all"
              >
                Próximo Passo: Entregas
                <span className="text-xl">⚡</span>
              </button>
            </div>
          </section>
        )}

        {currentStep === 1 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header com Ações */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Execução e Entregas</h2>
                <p className="text-sm text-slate-500 font-medium">Revise as iniciativas e marcos definidos para este ciclo.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: SprintItemType.INITIATIVE, label: 'Iniciativa', emoji: '📋', color: 'bg-indigo-600' },
                  { type: SprintItemType.ACTIVITY, label: 'Atividade', emoji: '⚡', color: 'bg-emerald-600' },
                  { type: SprintItemType.MILESTONE, label: 'Marco', emoji: '🚩', color: 'bg-amber-500' },
                ].map((btn) => (
                  <button
                    key={btn.type}
                    onClick={() => {
                      setEditingItemId(null);
                      setEditingItemData(null);
                      setNewItemType(btn.type);
                    }}
                    disabled={updating}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-[1.5rem] shadow-sm text-xs font-black uppercase tracking-wider text-white ${btn.color} hover:brightness-110 active:scale-95 transition-all`}
                  >
                    <span>{btn.emoji}</span>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-12">
              {/* 1. EXECUÇÃO: Iniciativas e Atividades */}
              <section>
                <div className="space-y-4">
                  {[...itemsByType[SprintItemType.INITIATIVE], ...itemsByType[SprintItemType.ACTIVITY]].length === 0 ? (
                    <EmptyState title="Tudo limpo por aqui" description="Adicione as iniciativas e atividades principais para este período." />
                  ) : (
                    [...itemsByType[SprintItemType.INITIATIVE], ...itemsByType[SprintItemType.ACTIVITY]].map((item) => (
                      <SprintItemRow
                        key={item.id}
                        item={item}
                        onUpdate={canEditThisSprint ? handleItemUpdate : undefined}
                        onDelete={canEditThisSprint ? handleItemDelete : undefined}
                        onEdit={(it) => {
                          setEditingItemId(it.id || null);
                          setEditingItemData(it);
                          setNewItemType(null);
                        }}
                      />
                    ))
                  )}
                </div>
              </section>

              {/* 2. CAMINHO CRÍTICO: Marcos */}
              {itemsByType[SprintItemType.MILESTONE].length > 0 && (
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Marcos (Milestones)
                  </h3>
                  <div className="space-y-4">
                    {itemsByType[SprintItemType.MILESTONE].map((item) => (
                      <SprintItemRow
                        key={item.id}
                        item={item}
                        onUpdate={canEditThisSprint ? handleItemUpdate : undefined}
                        onDelete={canEditThisSprint ? handleItemDelete : undefined}
                        onEdit={(it) => {
                          setEditingItemId(it.id || null);
                          setEditingItemData(it);
                          setNewItemType(null);
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="mt-12 flex items-center justify-between">
              <button onClick={() => setCurrentStep(0)} className="text-sm font-bold text-slate-400 uppercase tracking-widest">Voltar para Números</button>
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-[#5B5FF5] text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-all"
              >
                Próximo Passo: Impedimentos
                <span className="text-xl">🛡️</span>
              </button>
            </div>
          </section>
        )}

        {currentStep === 2 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Impedimentos</h2>
                <p className="text-sm text-slate-500 font-medium">Tudo o que está bloqueando ou atrasando o avanço dos OKRs.</p>
              </div>
              <button
                onClick={() => {
                  setEditingItemId(null);
                  setEditingItemData(null);
                  setNewItemType(SprintItemType.IMPEDIMENT);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[1.5rem] shadow-sm text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:brightness-110 transition-all"
              >
                <span>🛡️</span>
                Registrar Impedimento
              </button>
            </div>

            <div className="space-y-4">
              {itemsByType[SprintItemType.IMPEDIMENT].length === 0 ? (
                <EmptyState title="Caminho livre" description="Nenhum impedimento registrado. Se algo travar, anote aqui." />
              ) : (
                itemsByType[SprintItemType.IMPEDIMENT].map((item) => (
                  <SprintItemRow
                    key={item.id}
                    item={item}
                    onUpdate={canEditThisSprint ? handleItemUpdate : undefined}
                    onDelete={canEditThisSprint ? handleItemDelete : undefined}
                    onEdit={(it) => {
                      setEditingItemId(it.id || null);
                      setEditingItemData(it);
                      setNewItemType(null);
                    }}
                  />
                ))
              )}
            </div>

            <div className="mt-12 flex items-center justify-between">
              <button onClick={() => setCurrentStep(1)} className="text-sm font-bold text-slate-400 uppercase tracking-widest">Voltar para Entregas</button>
              <button
                onClick={() => setCurrentStep(3)}
                className="bg-[#5B5FF5] text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-all"
              >
                Próximo Passo: Decisões
                <span className="text-xl">💬</span>
              </button>
            </div>
          </section>
        )}

        {currentStep === 3 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Decisões e Combinados</h2>
                <p className="text-sm text-slate-500 font-medium">Ata da reunião. Registre o que foi decidido para não esquecer.</p>
              </div>
              <button
                onClick={() => {
                  setEditingItemId(null);
                  setEditingItemData(null);
                  setNewItemType(SprintItemType.DECISION);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[1.5rem] shadow-sm text-xs font-black uppercase tracking-wider text-white bg-violet-600 hover:brightness-110 transition-all"
              >
                <span>💬</span>
                Registrar Decisão
              </button>
            </div>

            <div className="space-y-4">
              {itemsByType[SprintItemType.DECISION].length === 0 ? (
                <EmptyState title="Sem atas" description="Nenhuma decisão registrada ainda." />
              ) : (
                itemsByType[SprintItemType.DECISION].map((item) => (
                  <SprintItemRow
                    key={item.id}
                    item={item}
                    onUpdate={canEditThisSprint ? handleItemUpdate : undefined}
                    onDelete={canEditThisSprint ? handleItemDelete : undefined}
                    onEdit={(it) => {
                      setEditingItemId(it.id || null);
                      setEditingItemData(it);
                      setNewItemType(null);
                    }}
                  />
                ))
              )}
            </div>

            <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col items-center text-center shadow-2xl">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-2xl mb-6 shadow-lg shadow-emerald-500/20">✨</div>
              <h3 className="text-xl font-black mb-2 tracking-tight">Ritual Finalizado?</h3>
              <p className="text-slate-400 text-sm max-w-md mb-8">Ao finalizar, os dados deste ciclo serão arquivados e os itens pendentes seguirão para a próxima "estação" de gestão.</p>
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentStep(2)} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Revisar</button>
                <button
                  onClick={handleFinalizeAndNext}
                  className="bg-emerald-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Encerrar Episódio
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* DELETE: Old Sections from here to forms modais */}

      {/* Formulários Modais */}
      {newItemType && canEditThisSprint && (
        <SprintItemForm
          sprintId={selectedSprint.id!}
          type={newItemType}
          onSuccess={async () => {
            setNewItemType(null);
            await fetchSprintById(sprintId);
          }}
          onClose={() => setNewItemType(null)}
        />
      )}

      {editingItemId && editingItemData && canEditThisSprint && (
        <SprintItemForm
          sprintId={selectedSprint.id!}
          type={editingItemData.type}
          item={editingItemData}
          onSuccess={async () => {
            setEditingItemId(null);
            setEditingItemData(null);
            await fetchSprintById(sprintId);
          }}
          onClose={() => {
            setEditingItemId(null);
            setEditingItemData(null);
          }}
        />
      )}
    </div>
  );
};

