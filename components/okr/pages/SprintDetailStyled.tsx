import React, { useEffect, useRef, useState } from 'react';
import { useSprintStore } from '../store/sprintStore';
import { useOKRStore } from '../store/okrStore';
import { SprintItemRow } from '../components/sprint/SprintItemRow';
import { SprintItemForm } from '../components/sprint/SprintItemForm';
import { SprintForm } from '../components/sprint/SprintForm';
import { LoadingState } from '../components/shared/LoadingState';
import {
  getSprintItemsByType,
  SprintItemType,
  formatDateRange,
  getSprintScopeLabel,
  getSprintScopeColor,
  getSprintScopeIcon,
  getSprintScopeDescription,
  SprintScope,
  getDecisionTypeLabel,
  getDecisionStatusLabel,
  getDecisionStatusColor,
} from '../types/sprint.types';
import * as sprintService from '../services/sprint.service';
import { exportElementToPDF } from '../utils/exportToPDF';
import { useToast, ToastContainer } from '../components/shared/Toast';
import { KRIndicatorBlock } from '../components/checkin/KRIndicatorBlock';
import { SprintCheckinForm } from '../components/checkin/SprintCheckinForm';
import { SprintCheckinList } from '../components/checkin/SprintCheckinList';

export const SprintDetailStyled: React.FC<{ sprintId: string; onBack?: () => void }> = ({ sprintId, onBack }) => {
  const { selectedSprint, loading, fetchSprintById, finalizeAndCreateNext } = useSprintStore();
  const { okrs, fetchOKRs } = useOKRStore();
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showItemForm, setShowItemForm] = useState<{ type: SprintItemType; show: boolean } | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [isDeletingSprint, setIsDeletingSprint] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);
  const [linkedOkrIds, setLinkedOkrIds] = useState<string[]>([]);
  const printableRef = useRef<HTMLDivElement>(null);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => { 
    fetchSprintById(sprintId); 
  }, [sprintId]);

  useEffect(() => {
    if (okrs.length === 0) {
      fetchOKRs();
    }
  }, [okrs.length, fetchOKRs]);

  useEffect(() => {
    const loadLinkedOkrs = async () => {
      try {
        const ids = await sprintService.getSprintOKRIds(sprintId);
        setLinkedOkrIds(ids);
      } catch {
        setLinkedOkrIds([]);
      }
    };
    loadLinkedOkrs();
  }, [sprintId]);

  // Função otimizada para recarregar sprint (usa cache)
  const refreshSprint = async () => {
    await fetchSprintById(sprintId, true); // skipCache = true
  };

  const handleFinalizeAndRotate = async () => {
    if (updating) return;
    if (!confirm('Finalizar esta sprint e criar a próxima? Itens pendentes serão carregados.')) return;
    
    try {
      setUpdating(true);
      addToast('Finalizando sprint...', 'info');
      
      const next = await finalizeAndCreateNext(sprintId);
      
      if (next?.id) {
        addToast('✅ Sprint finalizada! Próxima sprint criada com sucesso.', 'success');
        setTimeout(async () => {
          await fetchSprintById(next.id, true);
        }, 500);
      } else {
        addToast('❌ Não foi possível criar a próxima sprint. Verifique os logs.', 'error');
      }
    } catch (error: any) {
      console.error('❌ Erro ao finalizar sprint:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      addToast(`❌ Erro ao finalizar sprint: ${errorMessage}`, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await exportElementToPDF(printableRef.current, {
        filename: `Sprint-${selectedSprint?.title || 'Relatorio'}.pdf`,
      });
    } catch (error) {
      console.error('Erro ao exportar PDF', error);
      alert('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  if (loading || isDeletingSprint) {
    return <LoadingState message={isDeletingSprint ? 'Enviando sprint para a lixeira...' : 'Carregando Sprint...'} />;
  }
  if (deletedSuccess) {
    return (
      <>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="max-w-screen-md mx-auto px-6 py-12 text-center space-y-4">
          <p className="text-xl font-black text-emerald-600">Sprint enviada para a lixeira</p>
          <p className="text-sm text-slate-500">
            Você pode restaurar esta sprint dentro de 30 dias. Depois disso, ela poderá ser removida definitivamente.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all"
            >
              Voltar
            </button>
          )}
        </div>
      </>
    );
  }
  if (!selectedSprint) return (
    <div className="max-w-screen-md mx-auto px-6 py-12 text-center space-y-4">
      <p className="text-lg font-bold text-slate-700">Não foi possível carregar a Sprint.</p>
      <p className="text-sm text-slate-500">Verifique permissões ou se a Sprint ainda existe.</p>
      {onBack && (
        <button
          onClick={onBack}
          className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:brightness-110 active:scale-95 transition-all"
        >
          Voltar
        </button>
      )}
    </div>
  );

  const itemsByType = getSprintItemsByType(selectedSprint.items || []);
  const isLocked = selectedSprint.status === 'concluída' || selectedSprint.status === 'cancelada';
  const isGovernance = (selectedSprint as any).scope === SprintScope.GOVERNANCE;
  const okrMap = new Map(okrs.map((okr) => [okr.id, okr]));
  
  // Filtrar iniciativas baseado no toggle
  const visibleInitiatives = showCompletedItems
    ? itemsByType[SprintItemType.INITIATIVE]
    : itemsByType[SprintItemType.INITIATIVE].filter(i => i.status !== 'concluído');

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="max-w-screen-2xl mx-auto px-6 py-10 space-y-10 bg-[#F8FAFC]" ref={printableRef}>
      <div className="flex items-center justify-between">
        <header>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Ritmo de Execução</h1>
          <p className="text-slate-500 text-lg mt-2 font-medium">Gestão de Sprints Semanais, Mensais e Trimestrais.</p>
        </header>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white text-slate-700 px-6 py-3 rounded-2xl font-bold shadow-sm border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-60"
          >
            {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
          </button>
          {onBack && (
            <button onClick={onBack} className="bg-white text-slate-600 px-6 py-3 rounded-2xl font-bold shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
              ← Voltar
            </button>
          )}
        </div>
      </div>

      {/* Header Escuro (conforme print) */}
      <div className="bg-[#1E293B] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="bg-[#5B5FF5] p-5 rounded-3xl shadow-lg shadow-indigo-900/50">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {/* BADGE DE SCOPE - Destaque principal */}
                <span className={`px-4 py-2 text-white text-xs font-black uppercase rounded-full tracking-widest border-2 shadow-lg ${
                  (selectedSprint as any).scope === SprintScope.GOVERNANCE 
                    ? 'bg-purple-600 border-purple-400' 
                    : 'bg-blue-600 border-blue-400'
                }`}>
                  {getSprintScopeIcon((selectedSprint as any).scope)} {getSprintScopeLabel((selectedSprint as any).scope)}
                </span>
                <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-black uppercase rounded-full tracking-widest border border-white/10">
                  {selectedSprint.type}
                </span>
                <span className="text-slate-400 text-xs font-bold tracking-widest uppercase">
                  {formatDateRange(selectedSprint.start_date, selectedSprint.end_date)}
                </span>
              </div>
              <h2 className="text-3xl font-black tracking-tight">{selectedSprint.title}</h2>
              <p className="text-slate-400 mt-2 font-bold uppercase tracking-[0.2em] text-[10px]">
                Departamento: <span className="text-indigo-400">{selectedSprint.department}</span>
                <span className="mx-2">•</span>
                <span className="text-slate-500">{getSprintScopeDescription((selectedSprint as any).scope)}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status do Ciclo</p>
              <button 
                onClick={() => setShowEditForm(true)}
                className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95 text-white/50 hover:text-white"
                title={isLocked ? 'Reabrir sprint' : 'Editar sprint'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full shadow-[0_0_12px_currentColor] ${
                selectedSprint.status === 'concluída' ? 'text-emerald-500 bg-emerald-500' : 
                selectedSprint.status === 'cancelada' ? 'text-rose-500 bg-rose-500' : 
                'text-blue-500 bg-blue-500'
              }`} />
              <span className={`text-lg font-black uppercase tracking-widest ${
                selectedSprint.status === 'concluída' ? 'text-emerald-400' : 
                selectedSprint.status === 'cancelada' ? 'text-rose-400' : 
                'text-blue-400'
              }`}>
                {selectedSprint.status === 'concluída' ? 'Concluída' : selectedSprint.status === 'cancelada' ? 'Cancelada' : 'Ativa'}
              </span>
              {selectedSprint.status !== 'concluída' && selectedSprint.status !== 'cancelada' && (
                <button
                  onClick={handleFinalizeAndRotate}
                  disabled={updating}
                  className="ml-4 px-5 py-2.5 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-60 border-none"
                >
                  {updating ? 'Finalizando...' : 'Finalizar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE CHECK-INS E INDICADORES - CENTRO DA GESTÃO */}
      <div className="space-y-8">
        
        {/* Botão Destaque: Registrar Check-in */}
        <div className="flex justify-center">
          <button
            onClick={() => !isLocked && setShowCheckinForm(true)}
            disabled={isLocked}
            className={`group relative px-12 py-6 rounded-[2rem] shadow-2xl transition-all ${
              isLocked
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-300 hover:shadow-indigo-400 hover:scale-105 active:scale-95'
            }`}
            title={isLocked ? 'Sprint concluída/cancelada: check-in bloqueado' : 'Registrar check-in'}
          >
            <div className="flex items-center gap-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <div className="text-2xl font-black tracking-tight">
                  {isLocked 
                    ? 'Ciclo concluído' 
                    : isGovernance 
                      ? 'Registrar Revisão Estratégica' 
                      : 'Registrar Check-in do Ciclo'}
                </div>
                <div className={`text-sm font-medium ${isLocked ? 'text-slate-400' : 'text-indigo-100'}`}>
                  {isLocked 
                    ? 'Check-ins bloqueados após o fechamento' 
                    : isGovernance 
                      ? 'Documente decisões, aprendizados e ajustes estratégicos' 
                      : 'Documente o progresso desta sprint'}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Grid: KRs + Check-ins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <KRIndicatorBlock sprintId={sprintId} onKRUpdated={refreshSprint} readOnly={isLocked} isGovernance={isGovernance} />
          <SprintCheckinList 
            sprintId={sprintId} 
            onEdit={() => !isLocked && setShowCheckinForm(true)}
            readOnly={isLocked}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Iniciativas */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Barra de Progresso */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                Progresso da Sprint
              </h3>
              <span className="text-2xl font-black text-slate-900">
                {Math.round((itemsByType[SprintItemType.INITIATIVE].filter(i => i.status === 'concluído').length / (itemsByType[SprintItemType.INITIATIVE].length || 1)) * 100)}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${Math.round((itemsByType[SprintItemType.INITIATIVE].filter(i => i.status === 'concluído').length / (itemsByType[SprintItemType.INITIATIVE].length || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>0% Iniciado</span>
              <span>Meta: 100%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <span className="text-indigo-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </span>
                Iniciativas & Entregas
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full ml-2 border border-indigo-100">
                  {itemsByType[SprintItemType.INITIATIVE].filter(i => i.status === 'concluído').length}/{itemsByType[SprintItemType.INITIATIVE].length}
                </span>
              </h3>
              
              {/* Toggle Mostrar Concluídos */}
              {itemsByType[SprintItemType.INITIATIVE].filter(i => i.status === 'concluído').length > 0 && (
                <button
                  onClick={() => setShowCompletedItems(!showCompletedItems)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all"
                  title={showCompletedItems ? 'Ocultar concluídos' : 'Mostrar concluídos'}
                >
                  {showCompletedItems ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      Ocultar
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Mostrar
                    </>
                  )} Concluídos ({itemsByType[SprintItemType.INITIATIVE].filter(i => i.status === 'concluído').length})
                </button>
              )}
            </div>

            <button 
              onClick={() => !isLocked && setShowItemForm({ type: SprintItemType.INITIATIVE, show: true })} 
              disabled={isLocked}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                isLocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
              title={isLocked ? 'Sprint concluída/cancelada: itens bloqueados' : 'Adicionar iniciativa'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Adicionar
            </button>
          </div>

          <div className="space-y-4">
            {visibleInitiatives.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 border-dashed">
                {itemsByType[SprintItemType.INITIATIVE].length === 0 ? (
                  <>
                    <p className="text-slate-400 font-medium">Nenhuma iniciativa cadastrada.</p>
                    <button
                      onClick={() => !isLocked && setShowItemForm({ type: SprintItemType.INITIATIVE, show: true })}
                      disabled={isLocked}
                      className={`text-sm mt-2 font-bold ${
                        isLocked ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-500 hover:underline'
                      }`}
                      title={isLocked ? 'Sprint concluída/cancelada: itens bloqueados' : 'Adicionar iniciativa'}
                    >
                      Comece adicionando uma
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-slate-400 font-medium">Todas as iniciativas estão concluídas! 🎉</p>
                    <button onClick={() => setShowCompletedItems(true)} className="text-indigo-500 font-bold text-sm mt-2 hover:underline">
                      Mostrar {itemsByType[SprintItemType.INITIATIVE].length} concluídas
                    </button>
                  </>
                )}
              </div>
            ) : (
              visibleInitiatives.map((item) => (
                <SprintItemRow 
                  key={item.id} 
                  item={item} 
                  onUpdate={async (id, updates) => {
                    await sprintService.updateSprintItem(id, updates);
                    refreshSprint();
                  }}
                  onDelete={async (id) => {
                    if (confirm('Tem certeza que deseja remover esta iniciativa?')) {
                      await sprintService.deleteSprintItem(id);
                      refreshSprint();
                    }
                  }}
                  onEdit={(item) => {
                    // Implementar edição se necessário
                  }}
                  readOnly={isLocked}
                />
              ))
            )}
          </div>
        </div>

        {/* Coluna Direita: Impedimentos + Decisões */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-rose-50/50 rounded-[2.5rem] p-8 border border-rose-100 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-rose-900 flex items-center gap-3">
                🛡️ Impedimentos
              </h3>
              <button 
                onClick={() => !isLocked && setShowItemForm({ type: SprintItemType.IMPEDIMENT, show: true })} 
                disabled={isLocked}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${
                  isLocked
                    ? 'bg-white text-rose-200 border border-rose-50 cursor-not-allowed'
                    : 'bg-white text-rose-600 hover:bg-rose-50 border border-rose-100'
                }`}
                title={isLocked ? 'Sprint concluída/cancelada: itens bloqueados' : 'Adicionar impedimento'}
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-4">
              {itemsByType[SprintItemType.IMPEDIMENT].length === 0 ? (
                <p className="text-rose-400/60 text-xs font-medium text-center py-4">Nenhum impedimento reportado.</p>
              ) : (
                itemsByType[SprintItemType.IMPEDIMENT].map(item => (
                  <div key={item.id} className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-rose-100 flex items-start gap-4 group hover:shadow-md transition-all relative">
                    {!isLocked && (
                      <button 
                        onClick={async () => {
                          if (confirm('Remover impedimento?')) {
                            await sprintService.deleteSprintItem(item.id!);
                            refreshSprint();
                          }
                        }}
                        className="absolute top-2 right-2 text-rose-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remover impedimento"
                      >
                        ✕
                      </button>
                    )}
                    <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rose-900 leading-tight">{item.title}</p>
                      {item.description && <p className="text-xs text-rose-700/70 mt-1">{item.description}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-indigo-50/50 rounded-[2.5rem] p-8 border border-indigo-100 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-3">
                💬 Decisões do Ciclo
              </h3>
              <button 
                onClick={() => !isLocked && setShowItemForm({ type: SprintItemType.DECISION, show: true })} 
                disabled={isLocked}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-sm ${
                  isLocked
                    ? 'bg-white text-indigo-200 border border-indigo-50 cursor-not-allowed'
                    : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
                }`}
                title={isLocked ? 'Sprint concluída/cancelada: itens bloqueados' : 'Adicionar decisão'}
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-4">
              {itemsByType[SprintItemType.DECISION].length === 0 ? (
                <p className="text-indigo-400/60 text-xs font-medium text-center py-4">Nenhuma decisão registrada.</p>
              ) : (
                itemsByType[SprintItemType.DECISION].map(item => (
                  <div key={item.id} className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-indigo-100 group hover:shadow-md transition-all relative">
                    {!isLocked && (
                      <button 
                        onClick={async () => {
                          if (confirm('Remover decisão?')) {
                            await sprintService.deleteSprintItem(item.id!);
                            refreshSprint();
                          }
                        }}
                        className="absolute top-2 right-2 text-indigo-200 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remover decisão"
                      >
                        ✕
                      </button>
                    )}
                    
                    {/* Badges de Tipo e Status */}
                    <div className="flex items-center gap-2 mb-3">
                      {item.decision_type && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[9px] font-black uppercase rounded-full border border-purple-200">
                          {getDecisionTypeLabel(item.decision_type)}
                        </span>
                      )}
                      <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border ${getDecisionStatusColor(item.decision_status)}`}>
                        {getDecisionStatusLabel(item.decision_status)}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-slate-800 italic leading-relaxed">"{item.title}"</p>
                    
                    {item.decision_impact && (
                      <p className="text-xs text-slate-600 mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <span className="font-bold text-indigo-600">Impacto:</span> {item.decision_impact}
                      </p>
                    )}
                    
                    {item.okr_id && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                          OKR: {okrMap.get(item.okr_id)?.objective || '—'}
                        </p>
                        {item.kr_id && (
                          <p className="text-[10px] font-semibold text-indigo-500">
                            KR: {okrMap.get(item.okr_id)?.key_results?.find((kr) => kr.id === item.kr_id)?.title || '—'}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-4 flex items-center justify-between text-[10px]">
                      {item.responsible && (
                        <p className="font-black text-indigo-400 uppercase tracking-widest">
                          {item.responsible}
                        </p>
                      )}
                      {item.decision_deadline && (
                        <p className="font-bold text-slate-400">
                          Prazo: {new Date(item.decision_deadline).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showItemForm && !isLocked && (
        <SprintItemForm
          sprintId={sprintId}
          type={showItemForm.type}
          okrIds={linkedOkrIds}
          onCancel={() => setShowItemForm(null)}
          onSuccess={async () => {
            await refreshSprint();
            setShowItemForm(null);
          }}
        />
      )}

      {showEditForm && (
        <SprintForm
          sprint={selectedSprint}
          statusOnly={isLocked}
          onClose={() => setShowEditForm(false)}
          onDeleteStart={() => setIsDeletingSprint(true)}
          onDeleteEnd={(success) => {
            setIsDeletingSprint(false);
            if (success) {
              setDeletedSuccess(true);
              addToast('✅ Sprint enviada para a lixeira.', 'success');
            }
          }}
          onSuccess={(result) => {
            if (result?.deleted) {
              setShowEditForm(false);
              return;
            }
            refreshSprint();
            setShowEditForm(false);
          }}
        />
      )}

      {showCheckinForm && !isLocked && (
        <SprintCheckinForm
          sprintId={sprintId}
          sprintItems={selectedSprint.items || []}
          sprintScope={(selectedSprint as any).scope}
          onClose={() => setShowCheckinForm(false)}
          onSuccess={() => {
            refreshSprint();
            setShowCheckinForm(false);
          }}
        />
      )}
    </div>
    </>
  );
};
