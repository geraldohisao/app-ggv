import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOKRStore } from '../../store/okrStore';
import { suggestKeyResults } from '../../services/krAIService';
import { useOKRUsers, formatUserLabel } from '../../hooks/useOKRUsers';
import { FormattedNumberInput } from '../../../shared/FormattedNumberInput';
import { PeriodSelector } from '../shared/PeriodSelector';
import { UserSelectCombobox } from '../shared/UserSelectCombobox';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  OKRLevel,
  Department,
  OKRStatus,
  Periodicity,
  KeyResultStatus,
  type OKR,
} from '../../types/okr.types';

import { KeyResultType, KeyResultDirection } from '../../types/okr.types';

// Helper: permite campos numéricos vazios (evita NaN rejeitado pelo Zod)
// Helper: permite campos numéricos vazios
const numberField = z.number().nullable().optional();

const keyResultItemSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3, 'Título é obrigatório'),
  type: z.enum(['numeric', 'percentage', 'currency', 'activity']),
  // Direction: aceita valores válidos ou undefined
  direction: z.enum(['increase', 'decrease', 'at_most', 'at_least', 'in_between']).optional(),
  start_value: numberField,
  current_value: numberField,
  target_value: numberField,
  target_max: numberField, // Para direção "in_between"
  unit: z.string().optional(),
  activity_done: z.boolean().optional(),
  activity_progress: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(['verde', 'amarelo', 'vermelho']),
  description: z.string().nullable().optional(),
  responsible_user_id: z.string().uuid().nullable().optional(),
}).refine(
  (data) => {
    // Para atividades, direção não é obrigatória
    if (data.type === 'activity') return true;
    // Para outros tipos, direção é obrigatória
    if (!data.direction) return false;
    return true;
  },
  { message: 'Direção é obrigatória para indicadores numéricos', path: ['direction'] }
).refine(
  (data) => {
    // Validação 1: Target não pode ser negativo
    if (data.type !== 'activity' && data.target_value !== null && data.target_value < 0) {
      return false;
    }
    return true;
  },
  { message: 'Meta não pode ser negativa', path: ['target_value'] }
).refine(
  (data) => {
    // Validação 2: Current não pode ser negativo
    if (data.type !== 'activity' && data.current_value !== null && data.current_value < 0) {
      return false;
    }
    return true;
  },
  { message: 'Valor atual não pode ser negativo', path: ['current_value'] }
).refine(
  (data) => {
    // Validação 3: Lógica de direção para "increase"
    if (data.type === 'activity') return true;
    if (data.target_value === null || data.current_value === null) return true;
    
    if (data.direction === 'increase' && data.current_value > data.target_value) {
      return false;
    }
    return true;
  },
  { message: 'Para "Aumentar", valor atual deve ser ≤ meta', path: ['current_value'] }
).refine(
  (data) => {
    // Validação 4: Para "in_between", target_max deve ser > target_value
    if (data.direction === 'in_between') {
      if (data.target_max === null || data.target_max === undefined) return false;
      if (data.target_value === null || data.target_value === undefined) return true;
      return data.target_max > data.target_value;
    }
    return true;
  },
  { message: 'Limite máximo deve ser maior que o mínimo', path: ['target_max'] }
);

const okrFormSchema = z.object({
  level: z.enum([OKRLevel.STRATEGIC, OKRLevel.SECTORAL]),
  department: z.enum([Department.GENERAL, Department.COMMERCIAL, Department.MARKETING, Department.PROJECTS]),
  owner: z.string().min(2),
  objective: z.string().min(10),
  start_date: z.string(),
  end_date: z.string(),
  periodicity: z.enum([Periodicity.MONTHLY, Periodicity.QUARTERLY]),
  status: z.enum([OKRStatus.NOT_STARTED, OKRStatus.IN_PROGRESS, OKRStatus.COMPLETED]),
  key_results: z.array(keyResultItemSchema).min(1).max(5),
});

type OKRFormData = z.infer<typeof okrFormSchema>;

// Componente sortable para cada KR
const SortableKRItem: React.FC<{ id: string; index: number; children: React.ReactNode }> = ({ id, index, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style as React.CSSProperties} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
      {/* Handle de drag */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Arraste para reordenar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">KR #{index + 1}</span>
      </div>
      {children}
    </div>
  );
};

export const OKRFormSimple: React.FC<{ okr?: OKR; onClose: () => void; onSuccess?: () => void }> = ({ okr, onClose, onSuccess }) => {
  const isEditMode = !!okr;
  const { createOKR, updateOKR, deleteOKR } = useOKRStore();
  const { users } = useOKRUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingKRs, setIsGeneratingKRs] = useState(false);
  const [isAddingKR, setIsAddingKR] = useState(false);

  // Custom resolver que transforma dados antes da validação
  const customResolver = async (data: any, context: any, options: any) => {
    // Transformar strings vazias em undefined para campos sensíveis
    const transformedData = {
      ...data,
      key_results: (data.key_results || []).map((kr: any) => ({
        ...kr,
        direction: kr.direction === '' ? undefined : kr.direction,
        id: kr.id === '' ? undefined : kr.id,
        responsible_user_id: kr.responsible_user_id === '' ? null : kr.responsible_user_id,
      })),
    };
    return zodResolver(okrFormSchema)(transformedData, context, options);
  };

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isDirty } } = useForm<OKRFormData>({
    resolver: customResolver,
    defaultValues: okr ? {
      ...okr,
      // Ordenar KRs por position ao carregar
      key_results: okr.key_results 
        ? [...okr.key_results].sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
        : []
    } : {
      level: OKRLevel.STRATEGIC,
      department: Department.GENERAL,
      owner: '',
      objective: '',
      start_date: `${new Date().getFullYear()}-01-01`,
      end_date: `${new Date().getFullYear()}-12-31`,
      periodicity: Periodicity.QUARTERLY,
      status: OKRStatus.NOT_STARTED,
      key_results: []
    }
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: 'key_results' });
  const watchKeyResults = watch('key_results');
  const watchObjective = watch('objective');
  const watchOwner = watch('owner');

  // Encontrar o ID do usuário owner do OKR para usar como fallback nos KRs
  const ownerUserId = React.useMemo(() => {
    if (!watchOwner || users.length === 0) return null;
    const ownerUser = users.find(u => 
      u.name.toLowerCase() === watchOwner.toLowerCase() ||
      u.name.toLowerCase().includes(watchOwner.toLowerCase()) ||
      watchOwner.toLowerCase().includes(u.name.toLowerCase())
    );
    return ownerUser?.id || null;
  }, [watchOwner, users]);

  // Scroll para o primeiro erro
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorKR = errors.key_results?.findIndex((kr: any) => kr !== null && kr !== undefined);
      if (firstErrorKR !== undefined && firstErrorKR >= 0) {
        const element = document.querySelector(`[data-kr-index="${firstErrorKR}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [errors]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimento antes de ativar o drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handler para reordenar KRs via drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      move(oldIndex, newIndex);
    }
  };

  // Handler com debounce para prevenir race condition
  const handleAddKR = () => {
    if (isAddingKR || fields.length >= 5) return;
    
    setIsAddingKR(true);
    append({
      title: '',
      type: 'numeric' as any,
      direction: 'increase' as any,
      start_value: null,
      current_value: null,
      target_value: null,
      unit: 'un',
      activity_done: false,
      status: 'vermelho' as any,
      responsible_user_id: null,
    });
    
    // Debounce de 300ms
    setTimeout(() => {
      setIsAddingKR(false);
    }, 300);
  };

  const handleClose = () => {
    if (isDirty) {
      if (confirm('Tem certeza? Dados não salvos serão perdidos.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Corrigir owner ao carregar usuários (match case-insensitive/parcial)
  useEffect(() => {
    if (isEditMode && okr && users.length > 0) {
      console.log('🔍 OKR owner original:', okr.owner);
      console.log('🔍 Usuários disponíveis:', users.map(u => u.name));
      
      const matchedUser = users.find(u => 
        u.name.toLowerCase() === okr.owner?.toLowerCase() ||
        u.name.toLowerCase().includes(okr.owner?.toLowerCase() || '') ||
        okr.owner?.toLowerCase().includes(u.name.toLowerCase())
      );
      
      console.log('🔍 Usuário matched:', matchedUser?.name);
      
      if (matchedUser) {
        // Resetar o formulário com o owner corrigido e KRs ordenados
        const sortedKRs = okr.key_results 
          ? [...okr.key_results].sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
          : [];
        reset({
          ...okr,
          owner: matchedUser.name, // Usar nome exato da lista
          key_results: sortedKRs
        }, { keepDirty: false });
        
        console.log(`✅ Owner corrigido: "${okr.owner}" → "${matchedUser.name}"`);
      }
    }
  }, [users, isEditMode, okr, reset]);

  const handleAISuggestion = async () => {
    if (!watchObjective || watchObjective.length < 10) {
      alert('Por favor, preencha o objetivo primeiro (mínimo 10 caracteres)');
      return;
    }

    if (fields.length > 0) {
      if (!confirm('Esta ação irá substituir os Key Results atuais pelas sugestões da IA. Deseja continuar?')) {
        return;
      }
    }

    setIsGeneratingKRs(true);
    try {
      const suggestions = await suggestKeyResults(watchObjective);

      // Limpar KRs existentes e adicionar sugestões
      remove();
      suggestions.forEach((suggestion: any) => {
        append({
          title: suggestion.title,
          type: suggestion.type as any,
          direction: suggestion.direction as any,
          start_value: suggestion.start_value ?? 0,
          current_value: suggestion.current_value ?? 0,
          target_value: suggestion.target_value ?? 100,
          unit: suggestion.unit || '',
          activity_done: false,
          status: 'vermelho' as any,
          responsible_user_id: null,
        });
      });

      alert(`✅ ${suggestions.length} Key Results sugeridos pela IA!`);
    } catch (error: any) {
      console.error('Erro ao gerar KRs:', error);
      alert(`❌ Erro ao gerar sugestões: ${error.message}`);
    } finally {
      setIsGeneratingKRs(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 overflow-y-auto"
    >
      <div 
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-7xl w-full my-auto max-h-[92vh] overflow-y-auto border border-slate-100"
      >
        <header className="sticky top-0 bg-white px-10 py-6 flex items-center justify-between border-b border-slate-100 rounded-t-[2.5rem] z-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Editar OKR' : 'Novo OKR'}</h2>
          <button
            onClick={handleClose}
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-all"
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </header>

        <form autoComplete="off" onSubmit={handleSubmit(async (data) => {
          console.log('📝 Submitting OKR data:', data);
          setIsSubmitting(true);
          try {
            // Normalizar KRs para evitar falhas de backend (incluindo position para manter ordem)
            const normalizedKRs = (data.key_results || []).map((kr, index) => ({
              ...kr,
              direction: kr.direction || (kr.type === 'activity' ? undefined : 'increase'),
              start_value: kr.start_value ?? null,
              current_value: kr.current_value ?? null,
              target_value: kr.target_value ?? null,
              unit: kr.unit || '',
              position: index + 1, // Salvar posição baseado na ordem do array
            }));

            const payload = { ...data, key_results: normalizedKRs };

            console.log('🚀 Calling createOKR/updateOKR with:', { 
              payload, 
              normalizedKRs,
              krIds: normalizedKRs.map(kr => ({ id: kr.id, title: kr.title }))
            });
            
            const success = okr?.id ? await updateOKR(okr.id, payload, normalizedKRs) : await createOKR(payload, normalizedKRs);
            
            console.log('✅ Result:', success);
            if (success) { onSuccess?.(); onClose(); }
          } catch (err) {
            console.error('❌ Error submitting OKR:', err);
            alert('❌ Erro ao salvar OKR: ' + (err as Error).message);
          } finally {
            setIsSubmitting(false);
          }
        }, (errors) => {
          console.warn('⚠️ Validation errors:', errors);
          // Não mostrar alert - o feedback visual é suficiente
        })} className="p-8">

          {/* Layout em 2 Colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* COLUNA ESQUERDA: Objetivo e Metadados */}
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-slate-700 mb-3">
                  Qual o Objetivo Central?
                </h3>
                <textarea
                  {...register('objective')}
                  placeholder="Ex: Expandir operação de SDRs para o mercado Enterprise..."
                  autoComplete="off"
                  className="w-full bg-slate-50 rounded-2xl p-6 border-none focus:ring-2 focus:ring-[#5B5FF5] text-base font-semibold text-slate-800 placeholder:text-slate-300 min-h-[140px] leading-relaxed"
                />
                {errors.objective && (
                  <p className="text-rose-600 text-sm font-medium mt-2">{errors.objective.message}</p>
                )}
              </div>

              <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-900">Gerar KRs Inteligentes?</p>
                    <p className="text-xs text-indigo-600/80 font-medium">A IA criará sugestões baseadas no seu objetivo.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAISuggestion}
                  disabled={isGeneratingKRs || !watchObjective || watchObjective.length < 10}
                  className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95 border border-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingKRs ? '🤖 Gerando...' : 'Sugerir com IA'}
                </button>
              </div>

            </div>

            {/* COLUNA DIREITA: Key Results */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-700">
                    Key Results
                  </h3>
                  <p className="text-sm font-bold text-slate-400 mt-1">
                    {fields.length}/5 adicionados
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddKR}
                  disabled={fields.length >= 5 || isAddingKR}
                  className="bg-indigo-50 text-[#5B5FF5] px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-indigo-100 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={fields.length >= 5 ? 'Máximo de 5 KRs atingido' : isAddingKR ? 'Adicionando...' : 'Adicionar novo Key Result'}
                >
                  <span className="text-lg">+</span> {isAddingKR ? 'Adicionando...' : 'Adicionar KR'}
                </button>
                {fields.length >= 5 && (
                  <p className="text-xs font-medium text-amber-600">
                    ⚠️ Limite de 5 Key Results atingido
                  </p>
                )}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-5 border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/40 min-h-[400px] max-h-[500px] overflow-y-auto">
                    {fields.map((field, index) => {
                      const krType = watchKeyResults?.[index]?.type || 'numeric';
                      const krDirection = watchKeyResults?.[index]?.direction;
                      const isActivity = krType === 'activity';
                      const krErrors = errors.key_results?.[index] as Record<string, any> | undefined;
                      const krErrorMessages = krErrors
                        ? Object.values(krErrors)
                            .map((err: any) => err?.message)
                            .filter(Boolean)
                        : [];

                      return (
                        <SortableKRItem key={field.id} id={field.id} index={index}>
                          <div data-kr-index={index}>
                          {/* Erro do KR (se houver) */}
                          {errors.key_results?.[index] && (
                            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl px-4 py-3 mb-3 flex items-start gap-2 animate-pulse">
                              <svg className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-rose-700 text-xs font-bold mb-1">
                                  ⚠️ KR #{index + 1} tem campos obrigatórios vazios
                                </p>
                                <p className="text-rose-600 text-xs">
                                  {krErrorMessages.length > 0
                                    ? `Verifique: ${krErrorMessages.join(' • ')}`
                                    : 'Verifique os campos destacados abaixo.'}
                                </p>
                              </div>
                            </div>
                          )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <input
                              {...register(`key_results.${index}.title`)}
                              placeholder={isActivity ? 'Ex: Implantar novo CRM até 31/03' : 'Ex: Taxa de conversão SQL → Won'}
                              className="flex-1 bg-slate-50 rounded-xl px-4 py-3 border-none focus:ring-2 focus:ring-indigo-500 text-base font-bold"
                            />
                            {fields.length > 1 && (
                              <button type="button" onClick={() => remove(index)} className="text-rose-400 hover:text-rose-600 text-xl">🗑️</button>
                            )}
                          </div>

                      {/* Tipo de Indicador */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Tipo de Indicador</label>
                          <select {...register(`key_results.${index}.type`)} className="w-full bg-slate-50 rounded-xl px-4 py-2 border-none text-xs font-bold uppercase tracking-wider">
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
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Direção *</label>
                            <Controller
                              control={control}
                              name={`key_results.${index}.direction`}
                              render={({ field }) => (
                                <select
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className={`w-full bg-slate-50 rounded-xl px-4 py-2 border-none text-xs font-bold uppercase tracking-wider ${
                                    errors.key_results?.[index]?.direction ? 'ring-2 ring-rose-500 bg-rose-50' : ''
                                  }`}
                                >
                                  <option value="">Selecione...</option>
                                  <option value="increase">↑ Aumentar</option>
                                  <option value="decrease">↓ Diminuir</option>
                                  <option value="at_most">↕ No Máximo</option>
                                  <option value="at_least">↕ No Mínimo</option>
                                  <option value="in_between">⇅ Entre (Faixa)</option>
                                </select>
                              )}
                            />
                            {errors.key_results?.[index]?.direction && (
                              <p className="text-rose-600 text-xs mt-2 font-bold flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {errors.key_results[index]!.direction!.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Descrição Opcional */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                          Descrição / Detalhes (Opcional)
                        </label>
                        <input
                          {...register(`key_results.${index}.description`)}
                          placeholder="Ex: Considerar apenas leads com score > 80..."
                          autoComplete="off"
                          className="w-full bg-slate-50 rounded-xl px-4 py-2.5 border-none text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Responsável */}
                      <Controller
                        control={control}
                        name={`key_results.${index}.responsible_user_id`}
                        render={({ field }) => (
                          <UserSelectCombobox
                            users={users}
                            value={field.value || ownerUserId}
                            onChange={(userId) => field.onChange(userId)}
                            label="Responsável (Opcional)"
                            placeholder="Selecione o responsável pelo KR"
                          />
                        )}
                      />

                      {/* Campos numéricos OU checkbox de atividade */}
                      {!isActivity ? (
                        <>
                          <div className="bg-indigo-50/40 rounded-xl p-5 border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                              {krDirection === 'increase' && <><span className="text-lg">↑</span> Aumentar de → para</>}
                              {krDirection === 'decrease' && <><span className="text-lg">↓</span> Reduzir de → para</>}
                              {krDirection === 'at_most' && <><span className="text-lg">↕</span> Manter no máximo</>}
                              {krDirection === 'at_least' && <><span className="text-lg">↕</span> Manter no mínimo</>}
                              {krDirection === 'in_between' && <><span className="text-lg">⇅</span> Manter entre (faixa)</>}
                              {!krDirection && <><span className="text-lg">📊</span> Definir valores</>}
                            </p>
                            <div className={`grid gap-4 ${krDirection === 'in_between' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                              {/* Campo DE (start_value) - ocultar para at_most/at_least */}
                              {!(krDirection === 'at_most' || krDirection === 'at_least') && (
                                <div>
                                  <span className="text-xs font-bold text-slate-500 uppercase block mb-2">
                                    {krDirection === 'in_between' ? 'ATUAL' : 'DE'} {krDirection === 'decrease' ? '*' : ''}
                                  </span>
                                  <Controller
                                    control={control}
                                    name={`key_results.${index}.start_value`}
                                    render={({ field }) => (
                                      <FormattedNumberInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="0"
                                        prefix={krType === 'currency' ? 'R$' : undefined}
                                        suffix={krType === 'percentage' ? '%' : undefined}
                                        className="bg-white rounded-lg px-2 py-2.5 border border-slate-200 w-full font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none tracking-tighter"
                                      />
                                    )}
                                  />
                                  {errors.key_results?.[index]?.start_value && (
                                    <p className="text-rose-600 text-[8px] mt-1">{errors.key_results[index]!.start_value!.message}</p>
                                  )}
                                </div>
                              )}
                              
                              {/* Campo ATUAL (current_value) */}
                              <div>
                                <span className="text-xs font-bold text-indigo-600 uppercase block mb-2">ATUAL</span>
                                <Controller
                                  control={control}
                                  name={`key_results.${index}.current_value`}
                                  render={({ field }) => (
                                    <FormattedNumberInput
                                      value={field.value}
                                      onChange={field.onChange}
                                      placeholder="0"
                                      prefix={krType === 'currency' ? 'R$' : undefined}
                                      suffix={krType === 'percentage' ? '%' : undefined}
                                      className="bg-white rounded-lg px-3 py-3 border border-indigo-200 w-full font-bold text-sm focus:ring-2 focus:ring-indigo-500 text-indigo-900 outline-none tracking-tight"
                                    />
                                  )}
                                />
                              </div>
                              
                              {/* Campo META (target_value) */}
                              <div>
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-2">
                                  {krDirection === 'at_most' ? 'MÁXIMO *' : 
                                   krDirection === 'at_least' ? 'MÍNIMO *' : 
                                   krDirection === 'in_between' ? 'MÍN *' : 'PARA *'}
                                </span>
                                <Controller
                                  control={control}
                                  name={`key_results.${index}.target_value`}
                                  render={({ field }) => (
                                    <FormattedNumberInput
                                      value={field.value}
                                      onChange={field.onChange}
                                      name={field.name}
                                      placeholder="100"
                                      prefix={krType === 'currency' ? 'R$' : undefined}
                                      suffix={krType === 'percentage' ? '%' : undefined}
                                      className="bg-white rounded-lg px-2 py-2.5 border border-slate-200 w-full font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none tracking-tighter"
                                    />
                                  )}
                                />
                                {errors.key_results?.[index]?.target_value && (
                                  <p className="text-rose-600 text-[8px] mt-1">{errors.key_results[index]!.target_value!.message}</p>
                                )}
                              </div>
                              
                              {/* Campo MÁX (target_max) - só para in_between */}
                              {krDirection === 'in_between' && (
                                <div>
                                  <span className="text-xs font-bold text-slate-500 uppercase block mb-2">MÁX *</span>
                                  <Controller
                                    control={control}
                                    name={`key_results.${index}.target_max`}
                                    render={({ field }) => (
                                      <FormattedNumberInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="150"
                                        prefix={krType === 'currency' ? 'R$' : undefined}
                                        suffix={krType === 'percentage' ? '%' : undefined}
                                        className="bg-white rounded-lg px-2 py-2.5 border border-slate-200 w-full font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none tracking-tighter"
                                      />
                                    )}
                                  />
                                  {errors.key_results?.[index]?.target_max && (
                                    <p className="text-rose-600 text-[8px] mt-1">{errors.key_results[index]!.target_max!.message}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Unidade - só para numeric */}
                          {krType === 'numeric' && (
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                                Unidade (Ex: leads, SQL, contratos, MQLs)
                              </label>
                              <input
                                {...register(`key_results.${index}.unit`)}
                                placeholder="Ex: leads"
                                className="w-full bg-slate-50 rounded-xl px-4 py-2.5 border-none text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          )}

                          {/* Auto-preencher unidade para percentage e currency */}
                          {krType === 'percentage' && (
                            <input type="hidden" {...register(`key_results.${index}.unit`)} value="%" />
                          )}
                          {krType === 'currency' && (
                            <input type="hidden" {...register(`key_results.${index}.unit`)} value="R$" />
                          )}
                          {/* Se for currency, podemos usar o prefixo no input, mas a unidade é salva como R$ */}
                        </>
                    ) : (
                      <div className="bg-emerald-50/30 rounded-xl p-6 border border-emerald-100 space-y-4">
                        <div>
                          <label className="text-xs font-bold text-emerald-700 uppercase tracking-wide block mb-3">
                            Progresso da Atividade
                          </label>
                          <Controller
                            control={control}
                            name={`key_results.${index}.activity_progress`}
                            render={({ field }) => (
                              <div className="space-y-2">
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={field.value ?? 0}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                  />
                                  <span className="text-2xl font-black text-emerald-600 min-w-[60px] text-right">
                                    {field.value ?? 0}%
                                  </span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-emerald-600">
                                  <span>Não iniciada</span>
                                  <span>Concluída</span>
                                </div>
                              </div>
                            )}
                          />
                        </div>
                        {/* Manter checkbox para backward compatibility, mas oculto */}
                        <input type="hidden" {...register(`key_results.${index}.activity_done`)} value="false" />
                      </div>
                    )}

                      {/* ID do KR para updates (preserva referência no banco) */}
                      <input type="hidden" {...register(`key_results.${index}.id`)} />
                      {/* Status calculado automaticamente pelo backend */}
                      <input type="hidden" {...register(`key_results.${index}.status`)} value="vermelho" />

                      {!isActivity && (
                        <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Status Visual Automático</p>
                          <p className="text-[10px] text-emerald-600 font-medium">
                            ✨ Calculado automaticamente com base no progresso vs. tempo decorrido e sprints vinculadas.
                          </p>
                          </div>
                        )}
                        </SortableKRItem>
                      );
                    })}
                    {fields.length === 0 && <p className="text-center py-10 text-sm font-bold text-slate-300 uppercase tracking-widest italic">Nenhum KR adicionado</p>}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* FOOTER: Período, Responsável, Departamento */}
          <div className="grid grid-cols-3 gap-4 pt-8 mt-8 border-t border-slate-100">
            {/* Seletor de Período */}
            <PeriodSelector
              startDate={watch('start_date')}
              endDate={watch('end_date')}
              onPeriodChange={(start, end) => {
                setValue('start_date', start);
                setValue('end_date', end);
              }}
            />
            
            <div>
              <Controller
                control={control}
                name="owner"
                render={({ field }) => (
                  <UserSelectCombobox
                    users={users}
                    value={field.value || null}
                    onChange={(value) => field.onChange(value || '')}
                    label="Responsável"
                    placeholder="Selecione o responsável pelo OKR"
                    returnField="name"
                    required
                  />
                )}
              />
              {errors.owner && (
                <p className="text-rose-600 text-xs mt-1">{errors.owner.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Departamento</label>
              <select {...register('department')} className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none font-bold text-sm uppercase tracking-wider">
                <option value="comercial">Comercial</option>
                <option value="marketing">Marketing</option>
                <option value="projetos">Projetos</option>
                <option value="geral">Geral</option>
              </select>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-6 pt-10">
            <div className="flex gap-4">
              {isEditMode && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Tem certeza que deseja excluir este OKR? Esta ação não pode ser desfeita.')) {
                      setIsSubmitting(true);
                      const success = await deleteOKR(okr.id!);
                      if (success) { onSuccess?.(); onClose(); }
                      setIsSubmitting(false);
                    }
                  }}
                  className="text-sm font-bold text-rose-500 uppercase tracking-widest hover:text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
                >
                  Excluir
                </button>
              )}
              <button type="button" onClick={onClose} className="text-sm font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 px-4 py-2">
                Descartar
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || fields.length === 0}
              className="bg-[#5B5FF5] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-100 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Objetivo'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
