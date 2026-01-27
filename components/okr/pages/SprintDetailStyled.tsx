import React, { useEffect, useRef, useState } from 'react';
import { useSprintStore } from '../store/sprintStore';
import { useOKRStore } from '../store/okrStore';
import { SprintItemRow } from '../components/sprint/SprintItemRow';
import { SprintItemForm } from '../components/sprint/SprintItemForm';
import { SprintItemInlineForm } from '../components/sprint/SprintItemInlineForm';
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
import * as checkinService from '../services/checkin.service';
import { exportElementToPDF } from '../utils/exportToPDF';
import { useToast, ToastContainer } from '../components/shared/Toast';
import { KRIndicatorBlock } from '../components/checkin/KRIndicatorBlock';
import { SprintCheckinForm } from '../components/checkin/SprintCheckinForm';
import { SprintCheckinList } from '../components/checkin/SprintCheckinList';
import { SprintAttachments } from '../components/sprint/SprintAttachments';
import { parseLocalDate } from '../utils/date';
import { usePermissions } from '../hooks/usePermissions';
import { getSprintCalendarEvent, type SprintCalendarEvent } from '../../../services/googleCalendarService';

export const SprintDetailStyled: React.FC<{ sprintId: string; onBack?: () => void }> = ({ sprintId, onBack }) => {
  const { selectedSprint, loading, fetchSprintById, refreshSprintById, updateSelectedSprintLocally } = useSprintStore();
  const { okrs, fetchOKRs } = useOKRStore();
  const permissions = usePermissions();
  const [exporting, setExporting] = useState(false);
  const [showItemForm, setShowItemForm] = useState<{ type: SprintItemType; show: boolean } | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  // Estados para edição inline de iniciativas
  const [addingNewInitiative, setAddingNewInitiative] = useState(false);
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);
  // Estados para edição inline de impedimentos
  const [addingNewImpediment, setAddingNewImpediment] = useState(false);
  const [editingImpedimentId, setEditingImpedimentId] = useState<string | null>(null);
  // Estados para edição inline de decisões
  const [addingNewDecision, setAddingNewDecision] = useState(false);
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [showResolvedImpediments, setShowResolvedImpediments] = useState(false);
  const [showCompletedDecisions, setShowCompletedDecisions] = useState(false);
  const [isDeletingSprint, setIsDeletingSprint] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);
  const [linkedOkrIds, setLinkedOkrIds] = useState<string[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<any[]>([]);
  // Estado para seções colapsáveis
  const [collapsedSections, setCollapsedSections] = useState<{
    impedimentos: boolean;
    decisoes: boolean;
    anexos: boolean;
    checkinItems: boolean;
  }>({ impedimentos: false, decisoes: false, anexos: true, checkinItems: false });
  const printableRef = useRef<HTMLDivElement>(null);
  const { toasts, addToast, removeToast } = useToast();
  const sprintResponsible =
    selectedSprint?.responsible ||
    okrs.find((okr) => okr.id === selectedSprint?.okr_id)?.owner ||
    null;

  // Calendar event state
  const [calendarEvent, setCalendarEvent] = useState<SprintCalendarEvent | null>(null);

  useEffect(() => { 
    fetchSprintById(sprintId); 
  }, [sprintId]);

  // Load calendar event
  useEffect(() => {
    if (sprintId) {
      getSprintCalendarEvent(sprintId).then(setCalendarEvent).catch(console.error);
    }
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

  // Carregar sugestões pendentes
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const suggestions = await checkinService.listSprintItemSuggestions(sprintId, 'pending');
        setPendingSuggestions(suggestions || []);
      } catch (error) {
        console.error('Erro ao carregar sugestões:', error);
      }
    };
    loadSuggestions();
  }, [sprintId]);

  // Função otimizada para recarregar sprint (refresh silencioso - sem "piscar" a UI)
  const refreshSprint = async () => {
    await refreshSprintById(sprintId); // Não seta loading=true
  };

  const refreshSuggestions = async () => {
    try {
      const suggestions = await checkinService.listSprintItemSuggestions(sprintId, 'pending');
      setPendingSuggestions(suggestions || []);
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
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

  // Mostrar loading apenas no carregamento inicial (sem sprint carregada) ou ao deletar
  // NÃO mostrar loading durante refreshes (evita "piscar" a UI)
  if (isDeletingSprint) {
    return <LoadingState message="Enviando sprint para a lixeira..." />;
  }
  if (loading && !selectedSprint) {
    return <LoadingState message="Carregando Sprint..." />;
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
  
  // ========================================
  // ORDENAÇÃO DOS ITENS
  // ========================================
  
  // Ordenar Iniciativas: 
  // 1. Não concluídas primeiro
  // 2. Com due_date: mais próximas primeiro
  // 3. Sem due_date: mais antigas (created_at) primeiro
  const sortedInitiatives = [...itemsByType[SprintItemType.INITIATIVE]].sort((a, b) => {
    // Concluídos sempre por último
    if (a.status === 'concluído' && b.status !== 'concluído') return 1;
    if (a.status !== 'concluído' && b.status === 'concluído') return -1;
    
    // Ambos têm due_date: mais próximo primeiro
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    // Só A tem due_date: A vem primeiro
    if (a.due_date && !b.due_date) return -1;
    // Só B tem due_date: B vem primeiro
    if (!a.due_date && b.due_date) return 1;
    
    // Nenhum tem due_date: mais antigo primeiro
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });

  // Ordenar Impedimentos:
  // 1. Por severidade: bloqueado > em_risco > aberto > resolvido
  // 2. Dentro do mesmo status: mais antigos primeiro
  const impedimentPriority: Record<string, number> = {
    'bloqueado': 0,
    'em_risco': 1,
    'aberto': 2,
    'resolvido': 3,
  };
  const sortedImpediments = [...itemsByType[SprintItemType.IMPEDIMENT]].sort((a, b) => {
    const statusA = (a as any).impediment_status || 'aberto';
    const statusB = (b as any).impediment_status || 'aberto';
    const priorityA = impedimentPriority[statusA] ?? 2;
    const priorityB = impedimentPriority[statusB] ?? 2;
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // Mesmo status: mais antigo primeiro
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });

  // Ordenar Decisões:
  // 1. Por urgência: decidido > em_execucao > pausado > concluido/cancelado
  // 2. Dentro do mesmo status: mais antigos primeiro
  const decisionPriority: Record<string, number> = {
    'decidido': 0,
    'em_execucao': 1,
    'pausado': 2,
    'concluido': 3,
    'cancelado': 4,
  };
  const sortedDecisions = [...itemsByType[SprintItemType.DECISION]].sort((a, b) => {
    const statusA = (a as any).decision_status || 'decidido';
    const statusB = (b as any).decision_status || 'decidido';
    const priorityA = decisionPriority[statusA] ?? 0;
    const priorityB = decisionPriority[statusB] ?? 0;
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // Mesmo status: mais antigo primeiro
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });

  // ========================================
  
  // Filtrar iniciativas baseado no toggle (usando lista ordenada)
  const visibleInitiatives = showCompletedItems
    ? sortedInitiatives
    : sortedInitiatives.filter(i => i.status !== 'concluído');
  
  // Filtrar impedimentos baseado no toggle
  const visibleImpediments = showResolvedImpediments
    ? sortedImpediments
    : sortedImpediments.filter(i => (i as any).impediment_status !== 'resolvido');
  
  // Contar resolvidos para mostrar no botão
  const resolvedImpedimentsCount = sortedImpediments.filter(i => (i as any).impediment_status === 'resolvido').length;
  
  // Filtrar decisões baseado no toggle
  const visibleDecisions = showCompletedDecisions
    ? sortedDecisions
    : sortedDecisions.filter(i => {
        const status = (i as any).decision_status;
        return status !== 'concluido' && status !== 'cancelado';
      });
  
  // Contar concluídas/canceladas para mostrar no botão
  const completedDecisionsCount = sortedDecisions.filter(i => {
    const status = (i as any).decision_status;
    return status === 'concluido' || status === 'cancelado';
  }).length;
  
  const checkinSuggestions = pendingSuggestions || [];

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-4 sm:py-10 space-y-4 sm:space-y-10 bg-[#F8FAFC]" ref={printableRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <header>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Ritmo de Execução</h1>
          <p className="text-slate-500 text-sm sm:text-lg mt-1 sm:mt-2 font-medium">Gestão de Sprints</p>
        </header>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white text-slate-700 px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-base font-bold shadow-sm border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-60"
          >
            {exporting ? 'Gerando...' : 'PDF'}
          </button>
          {onBack && (
            <button onClick={onBack} className="bg-white text-slate-600 px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-base font-bold shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
              ← Voltar
            </button>
          )}
        </div>
      </div>

      {/* Header Escuro (conforme print) */}
      <div className="bg-[#1E293B] rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-8 relative z-10">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="bg-[#5B5FF5] p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg shadow-indigo-900/50">
              <svg className="w-6 h-6 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
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
              {sprintResponsible && (
                <p className="text-slate-400 mt-1 font-bold uppercase tracking-[0.2em] text-[10px]">
                  Responsável: <span className="text-emerald-400">{sprintResponsible}</span>
                </p>
              )}
              {/* Google Calendar Event Info */}
              {calendarEvent && calendarEvent.status === 'synced' && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <span>📅</span>
                    Evento Agenda
                  </span>
                  {calendarEvent.meet_link && (
                    <a
                      href={calendarEvent.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-colors"
                    >
                      <span>🎥</span>
                      Google Meet
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              {/* Status */}
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
            </div>
            <div className="flex items-center gap-2">
              {/* Botão Check-in - Destaque */}
              {!isLocked && (
                <button
                  onClick={() => setShowCheckinForm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase tracking-widest"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Check-in
                </button>
              )}
              {/* Botão Editar */}
              <button 
                onClick={() => setShowEditForm(true)}
                data-testid="sprint-edit"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-xs font-bold text-white/80 hover:text-white"
                title="Editar sprint"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE INDICADORES (KRs) E CHECK-INS - GRID 2 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KRs - Coluna Esquerda */}
        <KRIndicatorBlock sprintId={sprintId} onKRUpdated={refreshSprint} readOnly={isLocked} isGovernance={isGovernance} />
        
        {/* Check-ins - Coluna Direita */}
        <SprintCheckinList 
          sprintId={sprintId} 
          onEdit={() => !isLocked && setShowCheckinForm(true)}
          onAddNew={() => !isLocked && setShowCheckinForm(true)}
          onCheckinDeleted={refreshSprint}
          readOnly={isLocked}
          compact={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
        {/* Coluna Esquerda: Iniciativas */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <h3 className="text-base sm:text-xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
                <span className="text-indigo-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </span>
                Iniciativas & Entregas
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full ml-2 border border-indigo-100">
                  {itemsByType[SprintItemType.INITIATIVE].filter(i => i.status === 'concluído').length}/{itemsByType[SprintItemType.INITIATIVE].length}
                </span>
                {/* Tooltip de ajuda */}
                <span className="inline-flex items-center ml-1">
                  <span className="peer cursor-help">
                    <svg className="w-4 h-4 text-slate-300 hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <span className="peer-hover:opacity-100 peer-hover:visible opacity-0 invisible ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md shadow-lg transition-all duration-200 whitespace-nowrap">
                    Tarefas práticas a executar
                  </span>
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
              onClick={() => {
                if (!isLocked && !addingNewInitiative) {
                  setAddingNewInitiative(true);
                  setEditingInitiativeId(null);
                }
              }} 
              disabled={isLocked || addingNewInitiative}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                isLocked || addingNewInitiative
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
            {/* Formulário inline para nova iniciativa */}
            {addingNewInitiative && !isLocked && (
              <SprintItemInlineForm
                sprintId={sprintId}
                type={SprintItemType.INITIATIVE}
                onSave={() => {
                  setAddingNewInitiative(false);
                  refreshSprint();
                }}
                onCancel={() => setAddingNewInitiative(false)}
              />
            )}

            {visibleInitiatives.length === 0 && !addingNewInitiative ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 border-dashed">
                {itemsByType[SprintItemType.INITIATIVE].length === 0 ? (
                  <>
                    <p className="text-slate-400 font-medium">Nenhuma iniciativa cadastrada.</p>
                    <button
                      onClick={() => {
                        if (!isLocked) {
                          setAddingNewInitiative(true);
                        }
                      }}
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
                    <p className="text-slate-400 font-medium">Todas as iniciativas estão concluídas!</p>
                    <button onClick={() => setShowCompletedItems(true)} className="text-indigo-500 font-bold text-sm mt-2 hover:underline">
                      Mostrar {itemsByType[SprintItemType.INITIATIVE].length} concluídas
                    </button>
                  </>
                )}
              </div>
            ) : (
              visibleInitiatives.map((item) => {
                const canEditItem = !isLocked && permissions.sprintItem.canEdit(item);
                return (
                  <SprintItemRow 
                    key={item.id} 
                    item={item}
                    sprintId={sprintId}
                    isEditing={editingInitiativeId === item.id}
                    onUpdate={canEditItem ? async (id, updates) => {
                      await sprintService.updateSprintItem(id, updates);
                      refreshSprint();
                    } : undefined}
                    onDelete={canEditItem ? async (id) => {
                      if (confirm('Tem certeza que deseja remover esta iniciativa?')) {
                        await sprintService.deleteSprintItem(id);
                        refreshSprint();
                      }
                    } : undefined}
                    onEdit={canEditItem ? (item) => {
                      setEditingInitiativeId(item.id || null);
                      setAddingNewInitiative(false);
                    } : undefined}
                    onSave={() => {
                      setEditingInitiativeId(null);
                      refreshSprint();
                    }}
                    onCancelEdit={() => setEditingInitiativeId(null)}
                    readOnly={!canEditItem}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Impedimentos + Decisões */}
        <div className="lg:col-span-4 space-y-6">
          {/* Sugestões do Check-in - Pendentes */}
          {checkinSuggestions.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-purple-100/50 transition-colors"
                onClick={() => setCollapsedSections(s => ({ ...s, checkinItems: !s.checkinItems }))}
              >
                <h3 className="text-base font-bold text-purple-900 flex items-center gap-2">
                  Sugestões do Check-in
                  <span className="text-xs font-bold text-purple-500">({checkinSuggestions.length})</span>
                </h3>
                <svg 
                  className={`w-4 h-4 text-purple-400 transition-transform ${collapsedSections.checkinItems ? '' : 'rotate-180'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {!collapsedSections.checkinItems && (
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-xs text-purple-700 mb-3 bg-purple-100 rounded-lg p-2">
                    Sugestões geradas a partir da transcrição. Aceite ou rejeite para aplicar na Sprint.
                  </p>
                  {checkinSuggestions.map((suggestion: any) => {
                    const typeColor = 
                      suggestion.type === 'iniciativa' ? 'blue' :
                      suggestion.type === 'impedimento' ? 'rose' :
                      'purple';
                    
                    const typeIcon = 
                      suggestion.type === 'iniciativa' ? '🎯' :
                      suggestion.type === 'impedimento' ? '⚠️' :
                      '💬';

                    return (
                      <div key={suggestion.id} className={`bg-white rounded-xl p-3 shadow-sm border-2 border-${typeColor}-200 flex items-start gap-3 group transition-all`}>
                        <div className={`w-6 h-6 rounded-full bg-${typeColor}-100 flex items-center justify-center flex-shrink-0`}>
                          <span className="text-sm">{typeIcon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-${typeColor}-100 text-${typeColor}-700`}>
                              {suggestion.type}
                            </span>
                            {suggestion.status && (
                              <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                suggestion.status === 'concluído' ? 'bg-emerald-100 text-emerald-700' :
                                suggestion.status === 'em andamento' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {suggestion.status}
                              </span>
                            )}
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                              {suggestion.suggested_action === 'update' ? 'ATUALIZAR' : 'CRIAR'}
                            </span>
                            {typeof suggestion.match_confidence === 'number' && suggestion.match_confidence > 0 && (
                              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {suggestion.match_confidence}%
                              </span>
                            )}
                          </div>
                          <p className={`text-sm font-bold text-${typeColor}-900 leading-tight`}>{suggestion.title}</p>
                          {suggestion.suggested_description && (
                            <p className={`text-xs text-${typeColor}-600/70 mt-1 italic`}>{suggestion.suggested_description}</p>
                          )}
                          {suggestion.suggestion_reason && (
                            <p className="text-[10px] text-slate-500 mt-2">{suggestion.suggestion_reason}</p>
                          )}
                          {!isLocked && (
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={async () => {
                                  // 1. Update otimista: remove sugestão da lista imediatamente
                                  setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
                                  
                                  try {
                                    // 2. Chama API para aceitar (retorna o item criado/atualizado)
                                    const appliedItem = await checkinService.acceptSprintItemSuggestion(suggestion);
                                    
                                    // 3. Update otimista: adiciona item à sprint localmente
                                    if (appliedItem) {
                                      updateSelectedSprintLocally((sprint) => ({
                                        ...sprint,
                                        items: suggestion.suggested_action === 'update' && suggestion.existing_item_id
                                          ? (sprint.items || []).map(i => i.id === suggestion.existing_item_id ? { ...i, ...appliedItem } : i)
                                          : [...(sprint.items || []), appliedItem],
                                      }));
                                    }
                                    
                                    // 4. Refresh silencioso em background para garantir consistência
                                    void refreshSprint();
                                  } catch (error) {
                                    // Em caso de erro, recarrega sugestões para reverter
                                    console.error('Erro ao aceitar sugestão:', error);
                                    await refreshSuggestions();
                                  }
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                              >
                                Aceitar
                              </button>
                              <button
                                onClick={async () => {
                                  // 1. Update otimista: remove sugestão da lista imediatamente
                                  setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
                                  
                                  try {
                                    // 2. Chama API para rejeitar
                                    await checkinService.rejectSprintItemSuggestion(suggestion.id);
                                  } catch (error) {
                                    // Em caso de erro, recarrega sugestões para reverter
                                    console.error('Erro ao rejeitar sugestão:', error);
                                    await refreshSuggestions();
                                  }
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition-all"
                              >
                                Rejeitar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Impedimentos - Colapsável */}
          <div className="bg-rose-50/50 rounded-2xl border border-rose-100 overflow-hidden">
            <div 
              className="p-3 sm:p-4 cursor-pointer hover:bg-rose-50/50 transition-colors"
              onClick={() => setCollapsedSections(s => ({ ...s, impedimentos: !s.impedimentos }))}
            >
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm sm:text-base font-bold text-rose-900 flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                  <span className="flex-shrink-0">🛡️</span>
                  <span>Impedimentos</span>
                  <span className="text-[10px] sm:text-xs font-bold text-rose-400 flex-shrink-0">
                    ({visibleImpediments.length}{resolvedImpedimentsCount > 0 ? `/${sortedImpediments.length}` : ''})
                  </span>
                  {/* Tooltip de ajuda - hidden on mobile */}
                  <span className="hidden sm:inline-flex items-center flex-shrink-0">
                    <span className="peer cursor-help">
                      <svg className="w-3.5 h-3.5 text-rose-300 hover:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <span className="peer-hover:opacity-100 peer-hover:visible opacity-0 invisible ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md shadow-lg transition-all duration-200 whitespace-nowrap">
                      Bloqueios que impedem entregas
                    </span>
                  </span>
                </h3>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* Toggle Mostrar Resolvidos */}
                  {resolvedImpedimentsCount > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowResolvedImpediments(!showResolvedImpediments); }}
                      className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap"
                    >
                      {showResolvedImpediments ? '✓ Ocultar' : '✓ Mostrar'} ({resolvedImpedimentsCount})
                    </button>
                  )}
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (!isLocked && !addingNewImpediment) {
                        setAddingNewImpediment(true);
                        setEditingImpedimentId(null);
                      }
                    }} 
                    disabled={isLocked || addingNewImpediment}
                    className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-sm sm:text-base font-bold transition-all flex-shrink-0 ${
                      isLocked || addingNewImpediment
                        ? 'bg-white/50 text-rose-200 cursor-not-allowed'
                        : 'bg-white text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    +
                  </button>
                  <svg 
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 transition-transform flex-shrink-0 ${collapsedSections.impedimentos ? '' : 'rotate-180'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {/* Linha mobile: Botões extras */}
              {resolvedImpedimentsCount > 0 && (
                <div className="sm:hidden mt-2 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowResolvedImpediments(!showResolvedImpediments); }}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition-all"
                  >
                    {showResolvedImpediments ? '✓ Ocultar' : '✓ Mostrar'} resolvidos ({resolvedImpedimentsCount})
                  </button>
                </div>
              )}
            </div>
            {!collapsedSections.impedimentos && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
                {/* Formulário inline para novo impedimento */}
                {addingNewImpediment && !isLocked && (
                  <SprintItemInlineForm
                    sprintId={sprintId}
                    type={SprintItemType.IMPEDIMENT}
                    onSave={() => {
                      setAddingNewImpediment(false);
                      refreshSprint();
                    }}
                    onCancel={() => setAddingNewImpediment(false)}
                  />
                )}

                {visibleImpediments.length === 0 && !addingNewImpediment ? (
                  <p className="text-rose-400/60 text-xs font-medium text-center py-2">
                    {resolvedImpedimentsCount > 0 ? 'Todos os impedimentos foram resolvidos!' : 'Nenhum impedimento.'}
                  </p>
                ) : (
                  visibleImpediments.map(item => {
                    const canEditThisItem = !isLocked && permissions.sprintItem.canEdit(item);
                    
                    // Se está editando este item, mostra o formulário inline
                    if (editingImpedimentId === item.id && canEditThisItem) {
                      return (
                        <SprintItemInlineForm
                          key={item.id}
                          sprintId={sprintId}
                          type={SprintItemType.IMPEDIMENT}
                          item={item}
                          onSave={() => {
                            setEditingImpedimentId(null);
                            refreshSprint();
                          }}
                          onCancel={() => setEditingImpedimentId(null)}
                        />
                      );
                    }

                    const impStatus = (item as any).impediment_status || 'aberto';
                    const isResolved = impStatus === 'resolvido';
                    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                      aberto: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'ABERTO' },
                      bloqueado: { bg: 'bg-red-100', text: 'text-red-800', label: 'BLOQUEADO' },
                      em_risco: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'EM RISCO' },
                      resolvido: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'RESOLVIDO' },
                    };
                    const statusStyle = statusConfig[impStatus] || statusConfig.aberto;

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl p-4 shadow-sm border group hover:shadow-md transition-all relative ${
                          isResolved ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-100'
                        } ${canEditThisItem ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (canEditThisItem) {
                            setEditingImpedimentId(item.id || null);
                            setAddingNewImpediment(false);
                          }
                        }}
                      >
                        {/* Header: Badge de Status + Ações */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          {/* Badge de Status */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text} flex-shrink-0`}>
                              {statusStyle.label}
                            </span>
                          </div>

                          {/* Botões de ação - somente se pode editar */}
                          {canEditThisItem && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingImpedimentId(item.id || null);
                                  setAddingNewImpediment(false);
                                }}
                                type="button"
                                className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded transition-all text-sm"
                                title="Editar"
                              >
                                ✎
                              </button>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm('Remover impedimento?')) {
                                    await sprintService.deleteSprintItem(item.id!);
                                    refreshSprint();
                                  }
                                }}
                                type="button"
                                className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded transition-all text-sm"
                                title="Remover"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Título */}
                        <p className={`text-sm font-bold leading-tight mb-2 ${isResolved ? 'text-slate-400 line-through' : 'text-rose-900'}`}>
                          {item.title}
                        </p>

                        {/* Descrição (se houver) */}
                        {item.description && (
                          <p className={`text-xs ${isResolved ? 'text-slate-400' : 'text-rose-700/70'}`}>
                            {item.description}
                          </p>
                        )}

                        {/* Metadados: Responsável + Data */}
                        {(item.responsible || item.due_date) && (
                          <div className="flex items-center gap-4 mt-2">
                            {item.responsible && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                {item.responsible}
                              </span>
                            )}
                            {item.due_date && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {new Date(item.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Decisões - Colapsável */}
          <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 overflow-hidden">
            <div 
              className="p-3 sm:p-4 cursor-pointer hover:bg-indigo-50/50 transition-colors"
              onClick={() => setCollapsedSections(s => ({ ...s, decisoes: !s.decisoes }))}
            >
              <div className="flex items-center justify-between gap-1">
                <h3 className="text-sm sm:text-base font-bold text-indigo-900 flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                  <span className="flex-shrink-0">💬</span>
                  <span>Decisões</span>
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-400 flex-shrink-0">
                    ({visibleDecisions.length}{completedDecisionsCount > 0 ? `/${sortedDecisions.length}` : ''})
                  </span>
                  {/* Tooltip de ajuda - hidden on mobile */}
                  <span className="hidden sm:inline-flex items-center flex-shrink-0">
                    <span className="peer cursor-help">
                      <svg className="w-3.5 h-3.5 text-indigo-300 hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <span className="peer-hover:opacity-100 peer-hover:visible opacity-0 invisible ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md shadow-lg transition-all duration-200 whitespace-nowrap">
                      Escolhas estratégicas da reunião
                    </span>
                  </span>
                </h3>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* Toggle Mostrar Concluídas */}
                  {completedDecisionsCount > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCompletedDecisions(!showCompletedDecisions); }}
                      className="hidden sm:flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap"
                    >
                      {showCompletedDecisions ? '✓ Ocultar' : '✓ Mostrar'} ({completedDecisionsCount})
                    </button>
                  )}
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (!isLocked && !addingNewDecision) {
                        setAddingNewDecision(true);
                        setEditingDecisionId(null);
                      }
                    }} 
                    disabled={isLocked || addingNewDecision}
                    className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-sm sm:text-base font-bold transition-all flex-shrink-0 ${
                      isLocked || addingNewDecision
                        ? 'bg-white/50 text-indigo-200 cursor-not-allowed'
                        : 'bg-white text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    +
                  </button>
                  <svg 
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 transition-transform flex-shrink-0 ${collapsedSections.decisoes ? '' : 'rotate-180'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {/* Linha mobile: Botões extras */}
              {completedDecisionsCount > 0 && (
                <div className="sm:hidden mt-2 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCompletedDecisions(!showCompletedDecisions); }}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition-all"
                  >
                    {showCompletedDecisions ? '✓ Ocultar' : '✓ Mostrar'} finalizadas ({completedDecisionsCount})
                  </button>
                </div>
              )}
            </div>
            {!collapsedSections.decisoes && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
                {/* Formulário inline para nova decisão */}
                {addingNewDecision && !isLocked && (
                  <SprintItemInlineForm
                    sprintId={sprintId}
                    type={SprintItemType.DECISION}
                    onSave={() => {
                      setAddingNewDecision(false);
                      refreshSprint();
                    }}
                    onCancel={() => setAddingNewDecision(false)}
                  />
                )}

                {visibleDecisions.length === 0 && !addingNewDecision ? (
                  <p className="text-indigo-400/60 text-xs font-medium text-center py-2">
                    {completedDecisionsCount > 0 ? 'Todas as decisões foram finalizadas!' : 'Nenhuma decisão.'}
                  </p>
                ) : (
                  visibleDecisions.map(item => {
                    const canEditThisItem = !isLocked && permissions.sprintItem.canEdit(item);
                    
                    // Se está editando este item, mostra o formulário inline
                    if (editingDecisionId === item.id && canEditThisItem) {
                      return (
                        <SprintItemInlineForm
                          key={item.id}
                          sprintId={sprintId}
                          type={SprintItemType.DECISION}
                          item={item}
                          onSave={() => {
                            setEditingDecisionId(null);
                            refreshSprint();
                          }}
                          onCancel={() => setEditingDecisionId(null)}
                        />
                      );
                    }

                    const decStatus = (item as any).decision_status || 'decidido';
                    const isCompleted = decStatus === 'concluido';
                    const isCancelled = decStatus === 'cancelado';

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl p-4 shadow-sm border group hover:shadow-md transition-all relative ${
                          isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 
                          isCancelled ? 'border-slate-200 bg-slate-50/50' : 'border-indigo-100'
                        } ${canEditThisItem ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (canEditThisItem) {
                            setEditingDecisionId(item.id || null);
                            setAddingNewDecision(false);
                          }
                        }}
                      >
                        {/* Header: Badges + Ações */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          {/* Badges de Status e Tipo */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wide rounded-md ${getDecisionStatusColor(item.decision_status)}`}>
                              {getDecisionStatusLabel(item.decision_status)}
                            </span>
                            {item.decision_type && (
                              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-black uppercase tracking-wide rounded-md">
                                {getDecisionTypeLabel(item.decision_type)}
                              </span>
                            )}
                          </div>

                          {/* Botões de ação - somente se pode editar */}
                          {canEditThisItem && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDecisionId(item.id || null);
                                  setAddingNewDecision(false);
                                }}
                                type="button"
                                className="p-1.5 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-all text-sm"
                                title="Editar"
                              >
                                ✎
                              </button>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm('Remover decisão?')) {
                                    await sprintService.deleteSprintItem(item.id!);
                                    refreshSprint();
                                  }
                                }}
                                type="button"
                                className="p-1.5 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 rounded transition-all text-sm"
                                title="Remover"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Título da decisão */}
                        <p className={`text-sm font-bold leading-tight ${
                          isCompleted ? 'text-slate-400 line-through' : 
                          isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'
                        }`}>
                          "{item.title}"
                        </p>

                        {/* Descrição (se houver) */}
                        {item.description && (
                          <p className={`text-xs mt-1.5 ${isCompleted || isCancelled ? 'text-slate-400' : 'text-slate-600'}`}>
                            {item.description}
                          </p>
                        )}

                        {/* Metadados: Responsável + Data + OKR */}
                        {(item.responsible || (item as any).decision_deadline) && (
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {item.responsible && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                {item.responsible}
                              </span>
                            )}
                            {(item as any).decision_deadline && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {new Date((item as any).decision_deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Anexos */}
      <div className="mt-8">
        <SprintAttachments sprintId={sprintId} readOnly={isLocked} />
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

      {editingItem && !isLocked && (
        <SprintItemForm
          key={editingItem.id || editingItem.title}
          sprintId={sprintId}
          type={editingItem.type}
          item={editingItem}
          okrIds={linkedOkrIds}
          onCancel={() => setEditingItem(null)}
          onSuccess={async () => {
            await refreshSprint();
            setEditingItem(null);
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
              addToast('Sprint enviada para a lixeira.', 'success');
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
            refreshSuggestions();
            setShowCheckinForm(false);
          }}
        />
      )}
    </div>
    </>
  );
};
