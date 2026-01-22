import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sprintCheckinSchema, calculateMetricsFromItems, getHealthColor } from '../../types/checkin.types';
import { useToast, ToastContainer } from '../shared/Toast';
import * as checkinService from '../../services/checkin.service';
import * as checkinAI from '../../services/checkinAI.service';

interface SprintCheckinFormProps {
  sprintId: string;
  sprintItems: any[];
  sprintScope?: 'execucao' | 'governanca';
  onClose: () => void;
  onSuccess: () => void;
}

export const SprintCheckinForm: React.FC<SprintCheckinFormProps> = ({
  sprintId,
  sprintItems,
  sprintScope = 'execucao',
  onClose,
  onSuccess
}) => {
  const isGovernance = sprintScope === 'governanca';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [createdCheckinId, setCreatedCheckinId] = useState<string | null>(null);
  const [postSaveSuggestions, setPostSaveSuggestions] = useState<any[]>([]);
  const [showPostSaveSuggestions, setShowPostSaveSuggestions] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  // Buscar check-in existente APENAS DE HOJE (mesmo dia)
  useEffect(() => {
    const loadExistingCheckin = async () => {
      try {
        const checkins = await checkinService.listSprintCheckins(sprintId);
        const today = new Date().toISOString().split('T')[0];
        
        // Buscar check-in de HOJE (não de dias anteriores)
        const todayCheckin = checkins.find(c => {
          const checkinDate = c.checkin_date || c.created_at?.split('T')[0];
          return checkinDate === today;
        });
        
        if (todayCheckin) {
          console.log('✏️ Check-in de hoje encontrado. Modo edição ativado.');
          setExistingCheckin(todayCheckin);
          setIsEditMode(true);
        } else {
          console.log('📝 Nenhum check-in de hoje. Modo criação ativado.');
          setIsEditMode(false);
        }
      } catch (error) {
        console.error('Erro ao buscar check-in existente:', error);
      }
    };
    loadExistingCheckin();
  }, [sprintId]);

  // Separar items por tipo e status
  const completedInitiatives = sprintItems.filter(i => i.type === 'iniciativa' && i.status === 'concluído');
  const pendingInitiatives = sprintItems.filter(i => i.type === 'iniciativa' && i.status !== 'concluído');
  const impediments = sprintItems.filter(i => i.type === 'impedimento');
  const decisions = sprintItems.filter(i => i.type === 'decisão');

  // Pré-popular campos baseado nos items
  const initialAchievements = completedInitiatives
    .map(i => `• ${i.title}${i.description ? ` - ${i.description}` : ''}`)
    .join('\n');
  
  const initialBlockers = impediments
    .map(i => `• ${i.title}${i.description ? ` - ${i.description}` : ''}`)
    .join('\n');
  
  const initialDecisions = decisions
    .map(i => `• ${i.title}`)
    .join('\n');

  // Gerar resumo automático
  const autoSummary = `Concluímos ${completedInitiatives.length} de ${completedInitiatives.length + pendingInitiatives.length} iniciativas. ${impediments.length > 0 ? `${impediments.length} impedimento(s) ativo(s).` : 'Sem impedimentos.'} ${decisions.length} decisão(ões) tomada(s).`;

  // Calcular métricas automaticamente
  const metrics = calculateMetricsFromItems(sprintItems);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(sprintCheckinSchema),
    defaultValues: {
      sprint_id: sprintId,
      summary: autoSummary,
      // Campos de Execução
      achievements: initialAchievements,
      blockers: initialBlockers,
      decisions_taken: initialDecisions,
      next_focus: '',
      // Campos de Governança
      learnings: '',
      okr_misalignments: '',
      keep_doing: '',
      stop_doing: '',
      adjust_doing: '',
      strategic_recommendations: '',
      identified_risks: '',
      // Campos comuns
      health: 'verde' as const,
      health_reason: '',
      notes: ''
    }
  });

  // Atualizar form quando check-in existente carregar
  useEffect(() => {
    if (existingCheckin) {
      reset({
        sprint_id: sprintId,
        summary: existingCheckin.summary,
        // Campos de Execução
        achievements: existingCheckin.achievements || initialAchievements,
        blockers: existingCheckin.blockers || initialBlockers,
        decisions_taken: existingCheckin.decisions_taken || initialDecisions,
        next_focus: existingCheckin.next_focus || '',
        // Campos de Governança
        learnings: existingCheckin.learnings || '',
        okr_misalignments: existingCheckin.okr_misalignments || '',
        keep_doing: existingCheckin.keep_doing || '',
        stop_doing: existingCheckin.stop_doing || '',
        adjust_doing: existingCheckin.adjust_doing || '',
        strategic_recommendations: existingCheckin.strategic_recommendations || '',
        identified_risks: existingCheckin.identified_risks || '',
        // Campos comuns
        health: existingCheckin.health,
        health_reason: existingCheckin.health_reason || '',
        notes: existingCheckin.notes || ''
      });
    }
  }, [existingCheckin]);

  const health = watch('health');

  const handleAIAnalysis = async () => {
    if (!transcription || transcription.trim().length < 50) {
      addToast('❌ Cole uma transcrição com pelo menos 50 caracteres', 'error');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await checkinAI.analyzeCheckinTranscription(transcription, isGovernance);
      
      // Preencher formulário com os resultados da IA
      reset({
        sprint_id: sprintId,
        summary: result.summary || autoSummary,
        // Campos de Execução
        achievements: result.achievements || initialAchievements,
        blockers: result.blockers || initialBlockers,
        decisions_taken: result.decisions_taken || initialDecisions,
        next_focus: result.next_focus || '',
        // Campos de Governança
        learnings: result.learnings || '',
        okr_misalignments: result.okr_misalignments || '',
        keep_doing: result.keep_doing || '',
        stop_doing: result.stop_doing || '',
        adjust_doing: result.adjust_doing || '',
        strategic_recommendations: result.strategic_recommendations || '',
        identified_risks: result.identified_risks || '',
        // Campos comuns
        health: result.health,
        health_reason: result.health_reason || '',
        notes: result.notes || ''
      });

      addToast('Transcrição analisada. Revise os campos e edite se necessário.', 'success');
      setShowAIAnalysis(false);
      setTranscription('');
    } catch (error: any) {
      addToast(`❌ Erro ao analisar: ${error.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (data: any) => {
    // Validação adicional antes de enviar
    if (!data.summary || data.summary.trim().length < 10) {
      addToast('❌ Resumo é obrigatório (mínimo 10 caracteres)', 'error');
      return;
    }

    if (data.health !== 'verde' && (!data.health_reason || data.health_reason.trim().length === 0)) {
      addToast('❌ Informe o motivo do status Amarelo ou Vermelho', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && existingCheckin) {
        // SEGURANÇA: Verificar se check-in é realmente de hoje
        const today = new Date().toISOString().split('T')[0];
        const checkinDate = existingCheckin.checkin_date || existingCheckin.created_at?.split('T')[0];
        
        if (checkinDate !== today) {
          addToast('❌ Este check-in não é de hoje e não pode ser editado (histórico imutável)', 'error');
          setIsSubmitting(false);
          return;
        }

        // Modo edição: atualizar check-in (NÃO criar items novamente)
        await checkinService.updateSprintCheckin(existingCheckin.id, data, {
          regenerateSuggestions: true,
          sprintScope
        });
        addToast('✅ Check-in de hoje atualizado com sucesso!', 'success');

        setCreatedCheckinId(existingCheckin.id);
        const suggestions = await checkinService.listSprintItemSuggestionsByCheckin(existingCheckin.id, 'pending');
        setPostSaveSuggestions(suggestions || []);
        if (suggestions && suggestions.length > 0) {
          setShowPostSaveSuggestions(true);
          return;
        }
      } else {
        // Modo criação: criar novo check-in + sugestões automaticamente
        const created = await checkinService.createSprintCheckin(sprintId, data, sprintItems, sprintScope);
        addToast('✅ Check-in registrado com sucesso!', 'success');
        onSuccess();

        if (created?.id) {
          setCreatedCheckinId(created.id);
          const suggestions = await checkinService.listSprintItemSuggestionsByCheckin(created.id, 'pending');
          setPostSaveSuggestions(suggestions || []);
          if (suggestions && suggestions.length > 0) {
            setShowPostSaveSuggestions(true);
            return;
          }
        }
        onClose();
      }
      
      if (isEditMode) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      }
    } catch (error: any) {
      if (error.message?.includes('Já existe um check-in')) {
        addToast('⚠️ Já existe um check-in para hoje. Aguarde até amanhã para criar novo.', 'warning');
      } else {
        addToast(`❌ Erro ao ${isEditMode ? 'atualizar' : 'registrar'} check-in: ${error.message}`, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: any) => {
    await checkinService.acceptSprintItemSuggestion(suggestion);
    setPostSaveSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    onSuccess();
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    await checkinService.rejectSprintItemSuggestion(suggestionId);
    setPostSaveSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-6">
        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <header className="bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  {isEditMode 
                    ? (isGovernance ? '✏️ Editar Revisão Estratégica' : '✏️ Editar Check-in do Ciclo')
                    : (isGovernance ? '🎯 Registrar Revisão Estratégica' : '📝 Registrar Check-in do Ciclo')}
                </h2>
                <p className="text-indigo-100 mt-2 font-medium">
                  {isEditMode 
                    ? 'Atualize o registro de hoje' 
                    : (isGovernance 
                      ? 'Documente aprendizados, decisões e ajustes estratégicos' 
                      : 'Documente o progresso desta sprint')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
              >
                ✕
              </button>
            </div>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-8 max-h-[calc(90vh-140px)] overflow-y-auto">

            {showPostSaveSuggestions && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-purple-900">Sugestões do Check-in</h3>
                    <p className="text-xs text-purple-700">Aprove ou rejeite as sugestões antes de fechar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                  >
                    Fechar
                  </button>
                </div>

                {postSaveSuggestions.length === 0 ? (
                  <p className="text-sm text-purple-700 bg-purple-100 rounded-lg p-3">
                    Nenhuma sugestão pendente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {postSaveSuggestions.map((suggestion: any) => {
                      const typeColor =
                        suggestion.type === 'iniciativa' ? 'blue' :
                        suggestion.type === 'impedimento' ? 'rose' :
                        'purple';

                      return (
                        <div key={suggestion.id} className={`bg-white rounded-xl p-3 border-2 border-${typeColor}-200 flex items-start gap-3`}>
                          <div className={`w-6 h-6 rounded-full bg-${typeColor}-100 flex items-center justify-center flex-shrink-0`}>
                            <span className="text-sm">
                              {suggestion.type === 'iniciativa' ? '🎯' : suggestion.type === 'impedimento' ? '⚠️' : '💬'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-${typeColor}-100 text-${typeColor}-700`}>
                                {suggestion.type}
                              </span>
                              <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                {suggestion.suggested_action === 'update' ? 'ATUALIZAR' : 'CRIAR'}
                              </span>
                              {typeof suggestion.match_confidence === 'number' && suggestion.match_confidence > 0 && (
                                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {suggestion.match_confidence}%
                                </span>
                              )}
                            </div>
                            <p className={`text-sm font-bold text-${typeColor}-900`}>{suggestion.title}</p>
                            {suggestion.suggested_description && (
                              <p className={`text-xs text-${typeColor}-600/70 mt-1 italic`}>{suggestion.suggested_description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => handleAcceptSuggestion(suggestion)}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                              >
                                Aceitar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectSuggestion(suggestion.id)}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition-all"
                              >
                                Rejeitar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* Botão IA - Análise de Transcrição */}
            {!showAIAnalysis && (
              <button
                type="button"
                onClick={() => setShowAIAnalysis(true)}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:shadow-lg hover:scale-105 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                ✨ Analisar Transcrição com IA
              </button>
            )}

            {/* Modal de Análise de IA */}
            {showAIAnalysis && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Análise Inteligente de Transcrição
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAIAnalysis(false);
                      setTranscription('');
                    }}
                    className="text-purple-400 hover:text-purple-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <p className="text-sm text-purple-700 mb-4 leading-relaxed">
                  Cole a transcrição da reunião ou check-in abaixo. A IA irá extrair automaticamente as entregas, bloqueios, decisões e próximos passos.
                </p>

                <textarea
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  placeholder="Cole aqui a transcrição da reunião ou gravação de áudio...&#10;&#10;Exemplo:&#10;'Essa semana conseguimos concluir a integração com o CRM. Tivemos um problema com o servidor que ficou fora do ar por 2 dias, mas já foi resolvido. Decidimos contratar mais um SDR. Para a próxima semana vamos focar em fechar o pipeline de março.'"
                  rows={8}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none"
                />

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || transcription.trim().length < 50}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Analisando...
                      </>
                    ) : (
                      <>
                        ✨ Analisar com IA
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAIAnalysis(false);
                      setTranscription('');
                    }}
                    className="px-6 py-3 text-purple-600 hover:bg-purple-100 rounded-xl font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                </div>

                <p className="text-xs text-purple-600 mt-3 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Após a análise, você poderá revisar e editar todos os campos antes de salvar.
                </p>
              </div>
            )}
            
            {/* Aviso de Pré-população ou Edição */}
            <div className={`border-2 rounded-2xl p-4 flex items-start gap-3 ${
              isEditMode 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <svg className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isEditMode ? 'text-amber-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isEditMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <div>
                <h4 className={`font-bold mb-1 ${isEditMode ? 'text-amber-900' : 'text-blue-900'}`}>
                  {isEditMode ? '✏️ Editando Check-in de Hoje' : '✨ Campos Pré-Preenchidos'}
                </h4>
                <p className={`text-sm leading-relaxed ${isEditMode ? 'text-amber-700' : 'text-blue-700'}`}>
                  {isEditMode ? (
                    <>Editando check-in do dia <strong>{new Date().toLocaleDateString('pt-BR')}</strong> (hoje). 
                    Atualize as informações e salve. 
                    <span className="block mt-1 text-xs opacity-75">
                      ⚠️ Apenas check-ins de hoje podem ser editados.
                    </span></>
                  ) : (
                    <>Campos <strong>pré-preenchidos automaticamente</strong> com base nos items da sprint. 
                    Você pode editar conforme necessário.</>
                  )}
                </p>
              </div>
            </div>
            
            {/* Métricas Automáticas */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider mb-4">📊 Métricas do Ciclo</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-4xl font-black text-indigo-600">
                    {metrics.completion_rate}%
                  </div>
                  <div className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Taxa de Conclusão</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-600">
                    {metrics.initiatives_completed}/{metrics.initiatives_total}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500 uppercase mt-1">Iniciativas</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-rose-600">{metrics.impediments_count}</div>
                  <div className="text-[10px] font-bold text-rose-500 uppercase mt-1">Impedimentos</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-amber-600">{metrics.carry_over_pct}%</div>
                  <div className="text-[10px] font-bold text-amber-500 uppercase mt-1">Carry-over</div>
                  {metrics.carry_over_pct > 30 && (
                    <div className="text-[8px] text-amber-700 mt-1">⚠️ Acima do limite</div>
                  )}
                </div>
              </div>
            </div>

            {/* Resumo Rápido */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">
                Resumo do Ciclo <span className="text-red-500 text-lg">*</span> <span className="text-xs font-normal text-slate-400">(Obrigatório - mín. 10 caracteres)</span>
              </label>
              <textarea
                {...register('summary')}
                rows={3}
                placeholder="Ex: Semana produtiva. Concluímos 3 de 5 iniciativas. CRM fora do ar impactou follow-ups, mas conseguimos contornar."
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 transition-all ${
                  errors.summary 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
                required
              />
              {errors.summary && (
                <p className="text-red-600 text-sm mt-1 font-bold flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.summary.message}
                </p>
              )}
            </div>

            {/* Campos Adaptativos por Scope */}
            {isGovernance ? (
              /* CAMPOS DE GOVERNANÇA: Análise Estratégica */
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border-2 border-purple-200">
                  <h3 className="text-sm font-black text-purple-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span>🎯</span> Análise Estratégica do Ciclo
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* O que aprendemos */}
                    <div>
                      <label className="block text-xs font-black text-indigo-700 mb-2 uppercase tracking-wider">
                        💡 O que aprendemos neste ciclo?
                      </label>
                      <textarea
                        {...register('learnings')}
                        rows={4}
                        placeholder="• Principais insights e descobertas&#10;• Lições aprendidas&#10;• Conhecimento adquirido"
                        className="w-full px-4 py-3 border-2 border-indigo-200 bg-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-sm font-medium text-slate-700"
                      />
                    </div>

                    {/* Desalinhamentos */}
                    <div>
                      <label className="block text-xs font-black text-rose-700 mb-2 uppercase tracking-wider">
                        ⚠️ OKRs desalinhados da realidade?
                      </label>
                      <textarea
                        {...register('okr_misalignments')}
                        rows={4}
                        placeholder="• Metas que não refletem o cenário atual&#10;• OKRs que precisam ajuste&#10;• Desconexões identificadas"
                        className="w-full px-4 py-3 border-2 border-rose-200 bg-white rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-100 transition-all text-sm font-medium text-slate-700"
                      />
                    </div>

                    {/* Manter */}
                    <div>
                      <label className="block text-xs font-black text-emerald-700 mb-2 uppercase tracking-wider">
                        ✅ O que manter?
                      </label>
                      <textarea
                        {...register('keep_doing')}
                        rows={4}
                        placeholder="• Práticas que estão funcionando&#10;• Processos eficazes&#10;• Iniciativas bem-sucedidas"
                        className="w-full px-4 py-3 border-2 border-emerald-200 bg-white rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-sm font-medium text-slate-700"
                      />
                    </div>

                    {/* Parar */}
                    <div>
                      <label className="block text-xs font-black text-amber-700 mb-2 uppercase tracking-wider">
                        ⛔ O que parar?
                      </label>
                      <textarea
                        {...register('stop_doing')}
                        rows={4}
                        placeholder="• Atividades que não geram valor&#10;• Processos ineficazes&#10;• Iniciativas para descontinuar"
                        className="w-full px-4 py-3 border-2 border-amber-200 bg-white rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all text-sm font-medium text-slate-700"
                      />
                    </div>

                    {/* Ajustar */}
                    <div>
                      <label className="block text-xs font-black text-blue-700 mb-2 uppercase tracking-wider">
                        🔧 O que ajustar?
                      </label>
                      <textarea
                        {...register('adjust_doing')}
                        rows={4}
                        placeholder="• Processos que precisam refinamento&#10;• Metas para ajustar&#10;• Abordagens para otimizar"
                        className="w-full px-4 py-3 border-2 border-blue-200 bg-white rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium text-slate-700"
                      />
                    </div>

                    {/* Recomendações */}
                    <div>
                      <label className="block text-xs font-black text-purple-700 mb-2 uppercase tracking-wider">
                        📋 Recomendações próximo ciclo
                      </label>
                      <textarea
                        {...register('strategic_recommendations')}
                        rows={4}
                        placeholder="• Direcionamentos estratégicos&#10;• Mudanças recomendadas&#10;• Próximos passos sugeridos"
                        className="w-full px-4 py-3 border-2 border-purple-200 bg-white rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all text-sm font-medium text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Riscos (full width) */}
                  <div className="mt-6">
                    <label className="block text-xs font-black text-rose-700 mb-2 uppercase tracking-wider">
                      🚨 Riscos Identificados
                    </label>
                    <textarea
                      {...register('identified_risks')}
                      rows={3}
                      placeholder="• Riscos que podem impactar os OKRs&#10;• Ameaças ao cumprimento das metas&#10;• Alertas estratégicos"
                      className="w-full px-4 py-3 border-2 border-rose-200 bg-white rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-100 transition-all text-sm font-medium text-slate-700"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* CAMPOS DE EXECUÇÃO: Operacional */
              <div className="grid grid-cols-2 gap-6">
                
                {/* ✅ O que foi entregue */}
                <div>
                  <label className="block text-sm font-black text-emerald-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>✅</span>
                      <span className="uppercase tracking-wider">O que foi entregue</span>
                    </span>
                    {completedInitiatives.length > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">
                        {completedInitiatives.length} iniciativas concluídas
                      </span>
                    )}
                  </label>
                  <textarea
                    {...register('achievements')}
                    rows={5}
                    placeholder={completedInitiatives.length === 0 ? '• Adicione entregas não registradas como items\n• Ex: Campanha gerou 20 SQLs\n• Ex: Webinar com 50 participantes' : ''}
                    className="w-full px-4 py-3 border-2 border-emerald-200 bg-emerald-50/30 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-medium text-slate-700"
                  />
                  <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                    💡 Editável - Adicione contexto, métricas ou entregas não registradas
                  </p>
                </div>

                {/* ⚠️ O que travou */}
                <div>
                  <label className="block text-sm font-black text-rose-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>⚠️</span>
                      <span className="uppercase tracking-wider">O que travou</span>
                    </span>
                    {impediments.length > 0 && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-bold">
                        {impediments.length} impedimentos ativos
                      </span>
                    )}
                  </label>
                  <textarea
                    {...register('blockers')}
                    rows={5}
                    placeholder={impediments.length === 0 ? '• Adicione bloqueios não registrados\n• Ex: Orçamento não aprovado\n• Ex: Dependência de outro time' : ''}
                    className="w-full px-4 py-3 border-2 border-rose-200 bg-rose-50/30 rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-100 transition-all font-medium text-slate-700"
                  />
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">
                    💡 Editável - Adicione detalhes, duração ou impacto dos bloqueios
                  </p>
                </div>

                {/* 💬 Decisões tomadas */}
                <div>
                  <label className="block text-sm font-black text-purple-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>💬</span>
                      <span className="uppercase tracking-wider">Decisões tomadas</span>
                    </span>
                    {decisions.length > 0 && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                        {decisions.length} decisões registradas
                      </span>
                    )}
                  </label>
                  <textarea
                    {...register('decisions_taken')}
                    rows={5}
                    placeholder={decisions.length === 0 ? '• Adicione decisões importantes\n• Ex: Aprovar desconto 20%\n• Ex: Contratar 1 SDR' : ''}
                    className="w-full px-4 py-3 border-2 border-purple-200 bg-purple-50/30 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all font-medium text-slate-700"
                  />
                  <p className="text-[10px] text-purple-600 mt-1 font-medium">
                    💡 Editável - Adicione contexto, impacto ou decisões não registradas
                  </p>
                </div>

                {/* 🎯 Próximo foco */}
                <div>
                  <label className="block text-sm font-black text-blue-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>🎯</span>
                      <span className="uppercase tracking-wider">Próximo foco</span>
                    </span>
                    {pendingInitiatives.length > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                        {pendingInitiatives.length} pendentes para próximo ciclo
                      </span>
                    )}
                  </label>
                  <textarea
                    {...register('next_focus')}
                    rows={5}
                    placeholder={pendingInitiatives.length > 0 
                      ? `Sugestão baseado em pendentes:\n${pendingInitiatives.slice(0, 3).map(i => `• ${i.title}`).join('\n')}\n• ...`
                      : '• Defina as prioridades para o próximo ciclo\n• Ex: Resolver pendências\n• Ex: Iniciar novas iniciativas'}
                    className="w-full px-4 py-3 border-2 border-blue-200 bg-blue-50/30 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-700"
                  />
                  <p className="text-[10px] text-blue-600 mt-1 font-medium">
                    💡 Defina o foco para o próximo ciclo (serão carry-over automático se pendentes)
                  </p>
                </div>
              </div>
            )}

            {/* Saúde do Ciclo */}
            <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200">
              <label className="block text-sm font-black text-slate-700 mb-4 uppercase tracking-wider">
                🏥 Saúde do Ciclo <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { value: 'verde', label: 'Verde', desc: 'No prazo', emoji: '✅', color: 'emerald' },
                  { value: 'amarelo', label: 'Amarelo', desc: 'Atenção', emoji: '⚠️', color: 'amber' },
                  { value: 'vermelho', label: 'Vermelho', desc: 'Crítico', emoji: '🔴', color: 'rose' }
                ].map(option => (
                  <label key={option.value} className="cursor-pointer group">
                    <input
                      type="radio"
                      {...register('health')}
                      value={option.value}
                      className="peer sr-only"
                    />
                    <div className={`
                      border-2 rounded-2xl p-6 text-center transition-all
                      peer-checked:border-${option.color}-500 peer-checked:bg-${option.color}-50 peer-checked:shadow-lg peer-checked:scale-105
                      border-slate-200 hover:border-${option.color}-300 hover:bg-${option.color}-50/30
                    `}>
                      <div className="text-4xl mb-2">{option.emoji}</div>
                      <div className="font-black text-lg text-slate-800">{option.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {(health === 'amarelo' || health === 'vermelho') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Por que {health === 'amarelo' ? 'amarelo' : 'vermelho'}? <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('health_reason')}
                    placeholder="Ex: CRM fora do ar está impactando 30% da capacidade do time"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    required={health !== 'verde'}
                  />
                </div>
              )}
            </div>

            {/* Notas Adicionais (Opcional) */}
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">
                📝 Notas Adicionais (Opcional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Qualquer informação adicional relevante..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
              />
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between gap-6 pt-6 border-t-2 border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isSubmitting 
                  ? (isEditMode ? 'Atualizando...' : 'Registrando...') 
                  : (isEditMode ? '✏️ Atualizar Check-in' : '✅ Registrar Check-in')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
