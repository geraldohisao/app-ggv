import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSprintStore } from '../../store/sprintStore';
import { useOKRStore } from '../../store/okrStore';
import {
  SprintType,
  SprintStatus,
  SprintScope,
  type Sprint,
} from '../../types/sprint.types';
import { Department } from '../../types/okr.types';
import { useToast, ToastContainer } from '../shared/Toast';
import { usePermissions } from '../../hooks/usePermissions';
import { checkSprintOkrsAvailability } from '../../services/sprint.service';
import { DateInput } from '../shared/DateInput';
import { SelectInput } from '../shared/SelectInput';

const sprintFormSchema = z.object({
  type: z.enum([
    SprintType.WEEKLY,
    SprintType.MONTHLY,
    SprintType.QUARTERLY,
    SprintType.SEMI_ANNUAL,
    SprintType.ANNUAL
  ]),
  scope: z.enum([SprintScope.EXECUTION, SprintScope.GOVERNANCE]),
  department: z.enum([Department.GENERAL, Department.COMMERCIAL, Department.MARKETING, Department.PROJECTS]),
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  description: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.enum([SprintStatus.PLANNED, SprintStatus.IN_PROGRESS, SprintStatus.COMPLETED, SprintStatus.CANCELLED]),
  okr_ids: z.array(z.string()).max(10, 'Selecione no máximo 10 OKRs'),
});

type SprintFormData = z.infer<typeof sprintFormSchema>;

interface SprintFormProps {
  sprint?: Sprint;
  onClose: () => void;
  onSuccess?: (result?: { deleted?: boolean; sprintId?: string }) => void;
  statusOnly?: boolean;
  onDeleteStart?: () => void;
  onDeleteEnd?: (success: boolean) => void;
}

export const SprintForm: React.FC<SprintFormProps> = ({
  sprint,
  onClose,
  onSuccess,
  statusOnly = false,
  onDeleteStart,
  onDeleteEnd,
}) => {
  const isEditMode = !!sprint;
  const { createSprint, updateSprint, deleteSprint } = useSprintStore();
  const { okrs, fetchOKRs } = useOKRStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [multiOkrsEnabled, setMultiOkrsEnabled] = useState(true);
  const { toasts, addToast, removeToast } = useToast();
  const permissions = usePermissions();

  useEffect(() => {
    fetchOKRs();
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkAvailability = async () => {
      try {
        const stored = window.localStorage.getItem('okr:sprint_okrs_available');
        if (stored === 'false') {
          setMultiOkrsEnabled(false);
        }
      } catch {}

      const available = await checkSprintOkrsAvailability();
      if (mounted) {
        setMultiOkrsEnabled(available);
      }
    };
    checkAvailability();
    return () => {
      mounted = false;
    };
  }, []);

  const defaultValues: SprintFormData = sprint
    ? {
        ...(sprint as SprintFormData),
        scope: (sprint as any)?.scope || SprintScope.EXECUTION,
        okr_ids: (sprint as any)?.okr_ids?.length
          ? (sprint as any).okr_ids
          : (sprint as any)?.okr_id
          ? [(sprint as any).okr_id]
          : [],
      }
    : {
        type: SprintType.WEEKLY,
        scope: SprintScope.EXECUTION,
        department: Department.GENERAL,
        title: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: SprintStatus.PLANNED,
        okr_ids: [],
      };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SprintFormData>({
    resolver: zodResolver(sprintFormSchema),
    defaultValues,
  });

  const selectedDepartment = watch('department');
  const selectedScope = watch('scope');
  const selectedOKRs = watch('okr_ids') || [];
  
  // Regras automáticas baseadas em scope
  const isGovernance = selectedScope === SprintScope.GOVERNANCE;
  const allowMultiOkrs = isGovernance ? true : (multiOkrsEnabled && selectedDepartment === Department.GENERAL);
  const maxOkrs = isGovernance ? 10 : (allowMultiOkrs ? 3 : 1);

  const filteredOKRs =
    selectedDepartment === Department.GENERAL
      ? okrs
      : okrs.filter(okr => okr.department === selectedDepartment || okr.department === Department.GENERAL);

  useEffect(() => {
    if (!allowMultiOkrs && selectedOKRs.length > 1) {
      addToast('⚠️ Apenas 1 OKR por sprint (modo setor/estratégico limitado).', 'warning');
      setValue('okr_ids', [selectedOKRs[0]], { shouldDirty: true });
    }
  }, [allowMultiOkrs, selectedOKRs, setValue, addToast]);

  const onSubmit = async (data: SprintFormData) => {
    console.log('📝 Submitting Sprint data:', data);
    
    // Validação adicional de campos obrigatórios (ignorar se for apenas status)
    if (!statusOnly) {
      if (!data.title.trim()) {
        addToast('Título é obrigatório', 'error');
        return;
      }

      if (!data.start_date || !data.end_date) {
        addToast('Datas de início e fim são obrigatórias', 'error');
        return;
      }

      if (new Date(data.start_date) > new Date(data.end_date)) {
        addToast('Data de início deve ser anterior à data de fim', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let result;
      const { okr_ids, ...sprintData } = data;
      const normalizedOkrIds = allowMultiOkrs ? okr_ids : okr_ids.slice(0, 1);
      if (!allowMultiOkrs && okr_ids.length > 1) {
        addToast('⚠️ Apenas 1 OKR será salvo nesta sprint.', 'warning');
      }
      const okrId = normalizedOkrIds?.[0] || null;
      const sprintPayload = statusOnly
        ? { status: data.status }
        : {
            ...sprintData,
            okr_id: okrId,
          };
      if (isEditMode && sprint?.id) {
        console.log(`🔄 Atualizando sprint ${sprint.id}...`);
        result = await updateSprint(sprint.id, sprintPayload, [], statusOnly ? undefined : normalizedOkrIds);
      } else {
        console.log('🆕 Criando nova sprint...');
        result = await createSprint(sprintPayload, [], normalizedOkrIds);
      }

      if (result) {
        console.log('✅ Sprint salva com sucesso!');
        addToast(`Sprint ${isEditMode ? 'atualizada' : 'criada'} com sucesso!`, 'success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 500);
      } else {
        console.error('❌ Falha ao salvar sprint (result null)');
        addToast('Erro ao salvar sprint. Verifique os campos e tente novamente.', 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar Sprint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addToast(`Erro ao salvar sprint: ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
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

  const handleDelete = async () => {
    if (!sprint?.id) return;
    if (!permissions.isCEO) {
      addToast('Apenas Super Admin pode excluir sprints.', 'error');
      return;
    }
    const confirmed = confirm(
      'Tem certeza que deseja excluir esta sprint? Ela irá para a lixeira por 30 dias.'
    );
    if (!confirmed) return;
    setIsDeleting(true);
    onDeleteStart?.();
    try {
      const success = await deleteSprint(sprint.id);
      if (success) {
        addToast('Sprint enviada para a lixeira.', 'success');
        setTimeout(() => {
          onSuccess?.({ deleted: true, sprintId: sprint.id });
          onClose();
        }, 400);
        onDeleteEnd?.(true);
      } else {
        addToast('Erro ao excluir sprint. Tente novamente.', 'error');
        onDeleteEnd?.(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addToast(`Erro ao excluir sprint: ${errorMessage}`, 'error');
      onDeleteEnd?.(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 overflow-y-auto"
      >
      <div
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-6xl w-full my-auto max-h-[92vh] overflow-y-auto border border-slate-100"
      >
        <header className="sticky top-0 bg-white px-10 py-6 flex items-center justify-between border-b border-slate-100 rounded-t-[2.5rem] z-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isEditMode ? 'Editar Sprint' : 'Nova Sprint'}
          </h2>
          <button
            onClick={handleClose}
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-all"
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8" autoComplete="off">
          {statusOnly && (
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm font-semibold text-amber-800">
              Esta sprint está concluída/cancelada. Para reabrir, altere apenas o status e salve.
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* COLUNA ESQUERDA: Identificação */}
            <div className="space-y-8">
              {/* SCOPE SELECTOR - Destaque */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-6 border-2 border-indigo-100">
                <label className="text-xs font-black uppercase tracking-wider text-indigo-600 block mb-4 flex items-center gap-2">
                  <span>Tipo de Sprint</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: SprintScope.EXECUTION, label: 'Execução', emoji: '⚡', desc: 'Foco em entregas' },
                    { val: SprintScope.GOVERNANCE, label: 'Governança', emoji: '🎯', desc: 'Revisão estratégica' },
                  ].map((s) => (
                    <label key={s.val} className="cursor-pointer group relative">
                      <input
                        type="radio"
                        {...register('scope')}
                        value={s.val}
                        disabled={statusOnly}
                        className="peer sr-only"
                      />
                      <div className={`
                        w-full p-4 rounded-2xl border-2 border-transparent transition-all text-center
                        ${statusOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white hover:border-indigo-200'}
                        peer-checked:border-indigo-500 peer-checked:ring-2 peer-checked:ring-indigo-100 peer-checked:shadow-lg peer-checked:scale-105
                      `}>
                        <div className="text-2xl mb-2">{s.emoji}</div>
                        <div className="font-black text-sm uppercase tracking-wider text-slate-800 mb-1">{s.label}</div>
                        <div className="text-[9px] text-slate-500 font-semibold">{s.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-[9px] text-indigo-600/70 mt-3 font-bold uppercase tracking-wider text-center">
                  {isGovernance ? 'Sprint de revisão e decisões estratégicas' : 'Sprint de execução e entregas'}
                </p>
              </div>

              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-slate-700 mb-3">
                  {isGovernance ? 'Título da Revisão Estratégica' : 'O que vamos focar nesta Sprint?'} <span className="text-red-500">*</span>
                </h3>
                <input
                  {...register('title')}
                  disabled={statusOnly}
                  placeholder="Ex: Sprint Comercial W2 - Jan 2026"
                  className={`w-full rounded-2xl px-6 py-4 border-none text-lg font-bold shadow-sm ${
                    statusOnly
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-[#5B5FF5]'
                  }`}
                />
                {errors.title && (
                  <p className="text-rose-600 text-sm font-medium mt-2">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                  Descrição dos Objetivos
                </label>
                <textarea
                  {...register('description')}
                  disabled={statusOnly}
                  rows={4}
                  placeholder="Breve descrição dos objetivos da sprint..."
                  className={`w-full rounded-2xl px-6 py-4 border-none text-base font-semibold shadow-sm ${
                    statusOnly
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-[#5B5FF5]'
                  }`}
                />
              </div>

              <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                    {isGovernance ? 'OKRs em Revisão' : 'OKRs em Foco'} (Máx {maxOkrs}) *
                  </label>
                  <span className="text-[10px] font-black text-indigo-400 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                    {selectedOKRs.length} / {maxOkrs}
                  </span>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredOKRs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">Nenhum OKR disponível para este departamento.</p>
                  ) : (
                    filteredOKRs.map((okr) => {
                      const isSelected = selectedOKRs.includes(okr.id);
                      return (
                        <label
                          key={okr.id}
                          className={`
                            flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border-2
                            ${isSelected
                              ? 'bg-white border-indigo-500 shadow-sm'
                              : 'bg-white/50 border-transparent hover:bg-white hover:border-indigo-100'}
                          `}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            disabled={statusOnly || (!isSelected && selectedOKRs.length >= maxOkrs)}
                            onChange={() => {
                              if (statusOnly) return;
                              if (isSelected) {
                                setValue('okr_ids', selectedOKRs.filter(id => id !== okr.id), { shouldDirty: true });
                              } else if (selectedOKRs.length < maxOkrs) {
                                setValue('okr_ids', [...selectedOKRs, okr.id], { shouldDirty: true });
                              } else if (!multiOkrsEnabled) {
                                addToast('⚠️ Apenas 1 OKR por sprint (sprint_okrs não ativo).', 'warning');
                              }
                            }}
                          />
                          <div className={`
                            w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                            ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-200'}
                          `}>
                            {isSelected && <span className="text-[10px]">✓</span>}
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                            {okr.objective}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                {errors.okr_ids && (
                  <p className="text-rose-600 text-xs font-medium mt-3">{errors.okr_ids.message}</p>
                )}
                <p className="text-[10px] text-indigo-600/60 mt-4 font-bold uppercase tracking-wider">
                  {isGovernance 
                    ? '🎯 Revisão estratégica pode abranger múltiplos OKRs para análise qualitativa e decisões.' 
                    : '💡 Concentrar o ritual em poucos OKRs garante maior profundidade na execução.'}
                  {!isGovernance && selectedDepartment !== Department.GENERAL && ' (setor: 1 OKR)'}
                  {!isGovernance && selectedDepartment === Department.GENERAL && !multiOkrsEnabled && ' (estratégico: 1 OKR - sprint_okrs não ativo)'}
                  {!isGovernance && selectedDepartment === Department.GENERAL && multiOkrsEnabled && ' (estratégico: até 3 OKRs)'}
                </p>
              </div>
            </div>

            {/* COLUNA DIREITA: Configurações */}
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                    Frequência da Sprint
                  </label>
                  <SelectInput
                    value={watch('type')}
                    onChange={(val) => setValue('type', val as any, { shouldDirty: true })}
                    disabled={statusOnly}
                    options={[
                      { value: SprintType.WEEKLY, label: 'Semanal', description: 'Ciclo de 7 dias' },
                      { value: SprintType.MONTHLY, label: 'Mensal', description: 'Ciclo de 30 dias' },
                      { value: SprintType.QUARTERLY, label: 'Trimestral', description: 'Ciclo de 90 dias' },
                      { value: SprintType.SEMI_ANNUAL, label: 'Semestral', description: 'Ciclo de 6 meses' },
                      { value: SprintType.ANNUAL, label: 'Anual', description: 'Ciclo de 12 meses' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                    Departamento
                  </label>
                  <SelectInput
                    value={watch('department')}
                    onChange={(val) => setValue('department', val as any, { shouldDirty: true })}
                    disabled={statusOnly}
                    options={[
                      { value: Department.GENERAL, label: 'Geral', description: 'Multi-setorial / Empresa' },
                      { value: Department.COMMERCIAL, label: 'Comercial', description: 'Vendas e relacionamento' },
                      { value: Department.MARKETING, label: 'Marketing', description: 'Comunicação e marca' },
                      { value: Department.PROJECTS, label: 'Projetos', description: 'Desenvolvimento e entrega' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                    Data Início <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    value={watch('start_date')}
                    onChange={(val) => setValue('start_date', val, { shouldDirty: true })}
                    disabled={statusOnly}
                    required
                  />
                  {errors.start_date && (
                    <p className="text-rose-600 text-xs mt-2 font-medium">{errors.start_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                    Data Fim <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    value={watch('end_date')}
                    onChange={(val) => setValue('end_date', val, { shouldDirty: true })}
                    disabled={statusOnly}
                    required
                    min={watch('start_date')}
                  />
                  {errors.end_date && (
                    <p className="text-rose-600 text-xs mt-2 font-medium">{errors.end_date.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                  Status Atual
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: SprintStatus.PLANNED, label: 'Planejada', color: 'bg-slate-100 text-slate-600' },
                    { val: SprintStatus.IN_PROGRESS, label: 'Em Andamento', color: 'bg-blue-50 text-blue-600' },
                    { val: SprintStatus.COMPLETED, label: 'Concluída', color: 'bg-emerald-50 text-emerald-600' },
                    { val: SprintStatus.CANCELLED, label: 'Cancelada', color: 'bg-rose-50 text-rose-600' },
                  ].map((s) => (
                    <label key={s.val} className="cursor-pointer group relative">
                      <input
                        type="radio"
                        {...register('status')}
                        value={s.val}
                        className="peer sr-only"
                      />
                      <div className={`
                        w-full py-4 px-4 rounded-2xl border-2 border-transparent transition-all text-center font-bold text-xs uppercase tracking-widest
                        ${s.color} peer-checked:border-indigo-500 peer-checked:ring-2 peer-checked:ring-indigo-100 peer-checked:shadow-md
                        hover:brightness-95 active:scale-95
                      `}>
                        {s.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-6 pt-10 mt-10 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Descartar
            </button>
            <div className="flex flex-wrap items-center gap-3">
              {isEditMode && permissions.isCEO && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-5 py-3 rounded-2xl font-black uppercase tracking-wider text-rose-600 border border-rose-200 hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir Sprint'}
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#5B5FF5] text-white px-12 py-4 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-100 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Salvando...' : isEditMode ? 'Atualizar Sprint' : 'Criar Sprint'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
    </>
  );
};
