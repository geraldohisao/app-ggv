import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sprintCheckinSchema, calculateMetricsFromItems, getHealthColor, getHealthEmoji } from '../../types/checkin.types';
import { useToast, ToastContainer } from '../shared/Toast';
import * as checkinService from '../../services/checkin.service';
import * as checkinAI from '../../services/checkinAI.service';
import {
  CheckinStepIndicator,
  CheckinStep1Input,
  CheckinStep2Content,
} from './steps';

interface SprintCheckinFormProps {
  sprintId: string;
  sprintItems: any[];
  sprintScope?: 'execucao' | 'governanca';
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 1 | 2;

const healthOptions = [
  { value: 'verde', label: 'Verde', desc: 'No prazo', emoji: '✅', color: 'emerald' },
  { value: 'amarelo', label: 'Amarelo', desc: 'Atenção', emoji: '⚠️', color: 'amber' },
  { value: 'vermelho', label: 'Vermelho', desc: 'Crítico', emoji: '🔴', color: 'rose' },
];

export const SprintCheckinForm: React.FC<SprintCheckinFormProps> = ({
  sprintId,
  sprintItems,
  sprintScope = 'execucao',
  onClose,
  onSuccess
}) => {
  const isGovernance = sprintScope === 'governanca';
  
  // Wizard state - Now only 2 steps
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [inputMethod, setInputMethod] = useState<'ai' | 'manual' | null>(null);
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  // Load existing check-in for today (edit mode)
  useEffect(() => {
    const loadExistingCheckin = async () => {
      try {
        const checkins = await checkinService.listSprintCheckins(sprintId);
        const today = new Date().toISOString().split('T')[0];
        
        const todayCheckin = checkins.find(c => {
          const checkinDate = c.checkin_date || c.created_at?.split('T')[0];
          return checkinDate === today;
        });
        
        if (todayCheckin) {
          console.log('✏️ Check-in de hoje encontrado. Modo edição ativado.');
          setExistingCheckin(todayCheckin);
          setIsEditMode(true);
          // Skip to step 2 in edit mode
          setCurrentStep(2);
          setInputMethod('manual');
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

  // Separate items by type and status
  const completedInitiatives = sprintItems.filter(i => i.type === 'iniciativa' && i.status === 'concluído');
  const pendingInitiatives = sprintItems.filter(i => i.type === 'iniciativa' && i.status !== 'concluído');
  const impediments = sprintItems.filter(i => i.type === 'impedimento');
  const decisions = sprintItems.filter(i => i.type === 'decisão');

  // Pre-populate fields based on items
  const initialAchievements = completedInitiatives
    .map(i => `• ${i.title}${i.description ? ` - ${i.description}` : ''}`)
    .join('\n');
  
  const initialBlockers = impediments
    .map(i => `• ${i.title}${i.description ? ` - ${i.description}` : ''}`)
    .join('\n');
  
  const initialDecisions = decisions
    .map(i => `• ${i.title}`)
    .join('\n');

  // Generate automatic summary
  const autoSummary = `Concluímos ${completedInitiatives.length} de ${completedInitiatives.length + pendingInitiatives.length} iniciativas. ${impediments.length > 0 ? `${impediments.length} impedimento(s) ativo(s).` : 'Sem impedimentos.'} ${decisions.length} decisão(ões) tomada(s).`;

  // Calculate metrics automatically
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
      // Execution fields
      achievements: initialAchievements,
      blockers: initialBlockers,
      decisions_taken: initialDecisions,
      next_focus: '',
      // Governance fields
      learnings: '',
      okr_misalignments: '',
      keep_doing: '',
      stop_doing: '',
      adjust_doing: '',
      strategic_recommendations: '',
      identified_risks: '',
      // Common fields
      health: 'verde' as const,
      health_reason: '',
      notes: ''
    }
  });

  // Update form when existing check-in loads
  useEffect(() => {
    if (existingCheckin) {
      reset({
        sprint_id: sprintId,
        summary: existingCheckin.summary,
        achievements: existingCheckin.achievements || initialAchievements,
        blockers: existingCheckin.blockers || initialBlockers,
        decisions_taken: existingCheckin.decisions_taken || initialDecisions,
        next_focus: existingCheckin.next_focus || '',
        learnings: existingCheckin.learnings || '',
        okr_misalignments: existingCheckin.okr_misalignments || '',
        keep_doing: existingCheckin.keep_doing || '',
        stop_doing: existingCheckin.stop_doing || '',
        adjust_doing: existingCheckin.adjust_doing || '',
        strategic_recommendations: existingCheckin.strategic_recommendations || '',
        identified_risks: existingCheckin.identified_risks || '',
        health: existingCheckin.health,
        health_reason: existingCheckin.health_reason || '',
        notes: existingCheckin.notes || ''
      });
    }
  }, [existingCheckin]);

  const health = watch('health');
  const summary = watch('summary') || '';

  // Navigation functions
  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const goNext = () => {
    if (currentStep < 2) {
      setCurrentStep(2);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(1);
    }
  };

  // Step 1 handlers
  const handleSelectManual = () => {
    setInputMethod('manual');
    goNext();
  };

  const handleAIAnalysisStart = () => {
    setIsAnalyzing(true);
  };

  const handleAIAnalysisError = () => {
    console.log('❌ Análise com IA falhou, mantendo no Step 1');
    setIsAnalyzing(false);
    // Ensure we stay on step 1 if there was an error
    if (currentStep !== 2) {
      setCurrentStep(1);
    }
  };

  const handleAIAnalysisComplete = (result: any) => {
    try {
      setIsAnalyzing(false);
      setInputMethod('ai');
      
      // Validate health value - default to 'verde' if invalid
      const validHealth = ['verde', 'amarelo', 'vermelho'].includes(result?.health) 
        ? result.health 
        : 'verde';
      
      // Fill form with AI results
      reset({
        sprint_id: sprintId,
        summary: result?.summary || autoSummary,
        achievements: result?.achievements || initialAchievements,
        blockers: result?.blockers || initialBlockers,
        decisions_taken: result?.decisions_taken || initialDecisions,
        next_focus: result?.next_focus || '',
        learnings: result?.learnings || '',
        okr_misalignments: result?.okr_misalignments || '',
        keep_doing: result?.keep_doing || '',
        stop_doing: result?.stop_doing || '',
        adjust_doing: result?.adjust_doing || '',
        strategic_recommendations: result?.strategic_recommendations || '',
        identified_risks: result?.identified_risks || '',
        health: validHealth,
        health_reason: result?.health_reason || '',
        notes: result?.notes || ''
      });
      
      // Navigate to step 2
      setCurrentStep(2);
    } catch (error) {
      console.error('Erro ao processar resultado da IA:', error);
      addToast('Erro ao processar análise. Tente novamente.', 'error');
      setIsAnalyzing(false);
    }
  };

  const analyzeTranscription = async (transcription: string) => {
    return await checkinAI.analyzeCheckinTranscription(transcription, isGovernance);
  };

  // Submit handler
  const onSubmit = async (data: any) => {
    if (!data.summary || data.summary.trim().length < 10) {
      addToast('Resumo é obrigatório (mínimo 10 caracteres)', 'error');
      return;
    }

    if (data.health !== 'verde' && (!data.health_reason || data.health_reason.trim().length === 0)) {
      addToast('Informe o motivo do status Amarelo ou Vermelho', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && existingCheckin) {
        const today = new Date().toISOString().split('T')[0];
        const checkinDate = existingCheckin.checkin_date || existingCheckin.created_at?.split('T')[0];
        
        if (checkinDate !== today) {
          addToast('Este check-in não é de hoje e não pode ser editado (histórico imutável)', 'error');
          setIsSubmitting(false);
          return;
        }

        await checkinService.updateSprintCheckin(existingCheckin.id, data, {
          regenerateSuggestions: true,
          sprintScope,
          regenerateSuggestionsMode: 'sync'
        });
        addToast('Check-in atualizado com sucesso!', 'success');
        onSuccess();
        onClose();
        return;
      } else {
        await checkinService.createSprintCheckin(sprintId, data, sprintItems, sprintScope, {
          // Run suggestions generation synchronously so they appear immediately in the sprint page
          suggestionsMode: 'sync',
        });
        addToast('Check-in registrado com sucesso!', 'success');
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      if (error.message?.includes('Já existe um check-in')) {
        addToast('Já existe um check-in para hoje. Aguarde até amanhã para criar novo.', 'warning');
      } else {
        addToast(`Erro ao ${isEditMode ? 'atualizar' : 'registrar'} check-in: ${error.message}`, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 sm:p-6">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          
          {/* Header - Clean dark style matching system */}
          <header className="bg-slate-900 px-6 sm:px-8 py-5 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {isEditMode 
                      ? (isGovernance ? 'Editar Revisão' : 'Editar Check-in')
                      : (isGovernance ? 'Revisão Estratégica' : 'Check-in do Ciclo')}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {isEditMode 
                      ? 'Atualize o registro de hoje' 
                      : 'Documente o progresso desta sprint'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          {/* Step Indicator - Only 2 steps now */}
          <div className="border-b border-slate-100 bg-white flex-shrink-0">
            <CheckinStepIndicator 
              currentStep={currentStep} 
              onStepClick={goToStep}
              isGovernance={isGovernance}
            />
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50">
            <form onSubmit={handleSubmit(onSubmit)}>
              
              {/* Step 1: Input Method */}
              {currentStep === 1 && (
                <CheckinStep1Input
                  onSelectManual={handleSelectManual}
                  onAnalyzeComplete={handleAIAnalysisComplete}
                  onAnalyzeStart={handleAIAnalysisStart}
                  onAnalyzeError={handleAIAnalysisError}
                  analyzeTranscription={analyzeTranscription}
                  isAnalyzing={isAnalyzing}
                  sprintId={sprintId}
                  addToast={addToast}
                />
              )}

              {/* Step 2: Combined Content + Health + Summary */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  {/* Content Section */}
                  <CheckinStep2Content
                    register={register}
                    watch={watch}
                    metrics={metrics}
                    completedInitiatives={completedInitiatives}
                    pendingInitiatives={pendingInitiatives}
                    impediments={impediments}
                    decisions={decisions}
                    isGovernance={isGovernance}
                  />

                  {/* Divider */}
                  <div className="border-t border-slate-200 pt-5">
                    {/* Health + Summary Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      
                      {/* Health Picker */}
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-sm">🏥</span>
                          Status de Saúde
                        </label>
                        <div className="flex gap-2">
                          {healthOptions.map((option) => {
                            const isSelected = health === option.value;
                            return (
                              <label 
                                key={option.value} 
                                className="flex-1 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  {...register('health')}
                                  value={option.value}
                                  className="peer sr-only"
                                />
                                <div 
                                  className={`
                                    p-3 rounded-xl border-2 text-center transition-all
                                    ${isSelected 
                                      ? `border-${option.color}-500 bg-${option.color}-50 shadow-sm` 
                                      : `border-slate-200 hover:border-${option.color}-200 bg-slate-50`
                                    }
                                  `}
                                >
                                  <div className="text-2xl mb-1">{option.emoji}</div>
                                  <div className={`text-xs font-bold ${isSelected ? `text-${option.color}-700` : 'text-slate-600'}`}>
                                    {option.label}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        
                        {/* Health Reason - Conditional */}
                        {(health === 'amarelo' || health === 'vermelho') && (
                          <div className="mt-3">
                            <input
                              {...register('health_reason')}
                              placeholder={`Por que ${health}? Ex: CRM fora do ar impactando entregas`}
                              className={`w-full px-3 py-2 border rounded-lg text-sm transition-all ${
                                health === 'amarelo' 
                                  ? 'border-amber-200 bg-amber-50 focus:border-amber-400 focus:ring-2 focus:ring-amber-100' 
                                  : 'border-rose-200 bg-rose-50 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-sm">📝</span>
                          Resumo do Ciclo
                          <span className="text-slate-400 font-normal">(mín. 10 caracteres)</span>
                        </label>
                        <textarea
                          {...register('summary')}
                          rows={3}
                          placeholder={autoSummary}
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all text-sm resize-none"
                        />
                        <div className="flex justify-between items-center mt-1.5">
                          <span className={`text-[10px] ${summary.length >= 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {summary.length}/10+ caracteres
                          </span>
                          {autoSummary && summary !== autoSummary && (
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.querySelector('textarea[name="summary"]') as HTMLTextAreaElement;
                                if (input) {
                                  input.value = autoSummary;
                                  input.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Usar automático
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes - Optional */}
                    <div className="mt-4 bg-white rounded-xl p-4 border border-slate-200">
                      <label className="block text-xs font-bold text-slate-600 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-sm">📎</span>
                        Notas Adicionais
                        <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <textarea
                        {...register('notes')}
                        rows={2}
                        placeholder="Informações adicionais relevantes..."
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-slate-200 bg-white px-5 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
            {currentStep === 1 ? (
              <div /> // Empty div for spacing
            ) : (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    {isEditMode ? 'Atualizando...' : 'Salvando...'}
                  </>
                ) : (
                  <>
                    {isEditMode ? 'Atualizar Check-in' : 'Salvar Check-in'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Info notice - only on step 2 */}
          {currentStep === 2 && (
            <div className="px-5 sm:px-6 pb-4 bg-white">
              <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[11px] text-blue-700">
                  {isEditMode 
                    ? 'Você está editando o check-in de hoje. Após meia-noite, ele se torna imutável.'
                    : 'Após salvar, você pode editar o check-in apenas durante o dia de hoje.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
