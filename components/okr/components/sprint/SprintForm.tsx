import React, { useMemo, useState, useEffect } from 'react';
import { parseLocalDate } from '../../utils/date';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSprintStore } from '../../store/sprintStore';
import { useOKRStore } from '../../store/okrStore';
import { useOKRUsers } from '../../hooks/useOKRUsers';
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
import { UserSelectCombobox } from '../shared/UserSelectCombobox';
import { 
  syncSprintWithCalendar, 
  getSprintCalendarEvent,
  cancelSprintCalendarEvent,
  sprintTypeToRRule,
  type SprintCalendarEvent 
} from '../../../../services/googleCalendarService';

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
  responsible: z.string().optional(),
  responsible_user_id: z.string().uuid().nullable().optional(),
  start_date: z.string(),
  end_date: z.string().nullable().optional(), // Permite sprints sem data fim (contínuas)
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
  const { users: okrUsers, loading: okrUsersLoading } = useOKRUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [multiOkrsEnabled, setMultiOkrsEnabled] = useState(true);
  const [responsibleUserId, setResponsibleUserId] = useState<string | null>(
    (sprint as any)?.responsible_user_id || null
  );
  const { toasts, addToast, removeToast } = useToast();
  const permissions = usePermissions();
  
  // Calendar sync state
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [meetingTime, setMeetingTime] = useState('09:00');
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [existingCalendarEvent, setExistingCalendarEvent] = useState<SprintCalendarEvent | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  useEffect(() => {
    fetchOKRs();
  }, []);

  // Load existing calendar event if editing
  useEffect(() => {
    if (isEditMode && sprint?.id) {
      const loadCalendarEvent = async () => {
        try {
          const event = await getSprintCalendarEvent(sprint.id!);
          if (event) {
            setExistingCalendarEvent(event);
            setCalendarSyncEnabled(event.status === 'synced');
            if (event.start_at) {
              const startDate = new Date(event.start_at);
              setMeetingTime(startDate.toTimeString().slice(0, 5));
            }
            if (event.duration_minutes) {
              setMeetingDuration(event.duration_minutes);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar evento de calendar:', error);
        }
      };
      loadCalendarEvent();
    }
  }, [isEditMode, sprint?.id]);

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
        responsible: (sprint as any)?.responsible || undefined,
        responsible_user_id: (sprint as any)?.responsible_user_id || null,
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
        responsible: undefined,
        responsible_user_id: null,
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

  const selectedPrimaryOkrId = selectedOKRs[0];
  const selectedOkr = selectedPrimaryOkrId
    ? okrs.find((okr) => okr.id === selectedPrimaryOkrId)
    : undefined;
  const resolvedSprintResponsible = selectedOkr?.owner?.trim() || undefined;
  const okrOwnerUser = useMemo(() => {
    if (!resolvedSprintResponsible) return null;
    return (
      okrUsers.find(
        (user) => user.name.toLowerCase() === resolvedSprintResponsible.toLowerCase()
      ) || null
    );
  }, [okrUsers, resolvedSprintResponsible]);
  const selectedResponsibleUser = useMemo(() => {
    if (!responsibleUserId) return null;
    return okrUsers.find((user) => user.id === responsibleUserId) || null;
  }, [okrUsers, responsibleUserId]);

  useEffect(() => {
    if (!allowMultiOkrs && selectedOKRs.length > 1) {
      addToast('⚠️ Apenas 1 OKR por sprint (modo setor/estratégico limitado).', 'warning');
      setValue('okr_ids', [selectedOKRs[0]], { shouldDirty: true });
    }
  }, [allowMultiOkrs, selectedOKRs, setValue, addToast]);

  useEffect(() => {
    if (!isGovernance) return;
    if (responsibleUserId || !sprint?.responsible || okrUsers.length === 0) return;
    const matched = okrUsers.find(
      (user) => user.name.toLowerCase() === sprint.responsible?.toLowerCase()
    );
    if (matched) {
      setResponsibleUserId(matched.id);
    }
  }, [isGovernance, responsibleUserId, sprint?.responsible, okrUsers]);

  const onSubmit = async (data: SprintFormData) => {
    console.log('📝 Submitting Sprint data:', data);
    
    // Validação adicional de campos obrigatórios (ignorar se for apenas status)
    if (!statusOnly) {
      if (!data.title.trim()) {
        addToast('Título é obrigatório', 'error');
        return;
      }

      if (!data.start_date) {
        addToast('Data de início é obrigatória', 'error');
        return;
      }

      // Validar data fim apenas se definida
      if (data.end_date && parseLocalDate(data.start_date) > parseLocalDate(data.end_date)) {
        addToast('Data de início deve ser anterior à data de fim', 'error');
        return;
      }

      if (!isEditMode && (!data.okr_ids || data.okr_ids.length === 0)) {
        addToast('Selecione um OKR para criar a sprint', 'error');
        return;
      }

      if (isGovernance && !responsibleUserId) {
        addToast('Selecione um responsável para a sprint de governança', 'error');
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
            responsible: isGovernance
              ? selectedResponsibleUser?.name || undefined
              : resolvedSprintResponsible || undefined,
            responsible_user_id: isGovernance ? responsibleUserId : okrOwnerUser?.id || null,
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

        const savedSprintId = (result as any).id || sprint?.id!;

        // Gerenciar sincronização com Google Calendar (mesmo em modo statusOnly)
        const shouldManageCalendarSync = !statusOnly || calendarSyncEnabled || !!existingCalendarEvent?.event_id;
        if (shouldManageCalendarSync) {
          // Verificar se o toggle foi DESATIVADO (tinha evento antes e agora está desabilitado)
          if (!calendarSyncEnabled && existingCalendarEvent?.event_id) {
            try {
              console.log('🗑️ CALENDAR - Toggle desativado, cancelando evento...');
              const cancelled = await cancelSprintCalendarEvent(savedSprintId);
              if (cancelled) {
                addToast('📅 Evento removido do Google Calendar', 'info');
              }
            } catch (error) {
              console.error('❌ Erro ao cancelar evento:', error);
            }
          }
          // Sincronizar com Google Calendar se HABILITADO
          else if (calendarSyncEnabled) {
            try {
              if (!data.start_date) {
                addToast('⚠️ Não foi possível sincronizar: data de início inválida.', 'warning');
              } else {
                setIsSyncingCalendar(true);
                console.log('📅 Sincronizando com Google Calendar...');
                
                // Montar data/hora do evento
                const startDate = parseLocalDate(data.start_date);
                const [hours, minutes] = meetingTime.split(':').map(Number);
                startDate.setHours(hours, minutes, 0, 0);
                
                // Obter email do responsável
                const responsibleEmail = selectedResponsibleUser?.email || okrOwnerUser?.email;
                const attendeeEmails = responsibleEmail ? [responsibleEmail] : [];
                
                // Converter tipo de sprint para RRULE
                const recurrenceRule = sprintTypeToRRule(data.type, startDate);
                
                const calendarResult = await syncSprintWithCalendar({
                  sprintId: savedSprintId,
                  title: /^sprint\s*[:\-]?/i.test(data.title) ? data.title : `Sprint: ${data.title}`,
                  description: data.description || undefined,
                  startAt: startDate,
                  durationMinutes: meetingDuration,
                  timezone: 'America/Sao_Paulo',
                  attendeeEmails,
                  recurrenceRule: recurrenceRule || undefined
                });
                
                if (calendarResult?.status === 'synced') {
                  addToast('📅 Evento sincronizado no Google Calendar!', 'success');
                } else if (calendarResult?.status === 'error') {
                  addToast(`⚠️ Erro ao sincronizar: ${calendarResult.last_sync_error || 'Erro desconhecido'}`, 'warning');
                } else {
                  // calendarResult null/undefined - erro silencioso antes
                  addToast('⚠️ Sprint salva, mas a sincronização com o Google Calendar falhou.', 'warning');
                }
              }
            } catch (calendarError) {
              console.error('❌ Erro ao sincronizar Calendar:', calendarError);
              addToast('⚠️ Sprint salva, mas não foi possível sincronizar com Calendar.', 'warning');
            } finally {
              setIsSyncingCalendar(false);
            }
          }
        }

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
      // Cancelar evento do Google Calendar se existir
      if (existingCalendarEvent?.event_id) {
        try {
          console.log('🗑️ CALENDAR - Cancelando evento antes de deletar sprint...');
          await cancelSprintCalendarEvent(sprint.id);
        } catch (error) {
          console.error('❌ Erro ao cancelar evento do Calendar:', error);
          // Continuar com a exclusão mesmo se falhar
        }
      }

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

        <form onSubmit={handleSubmit(onSubmit)} className="p-8" autoComplete="off" data-testid="sprint-form">
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
                  data-testid="sprint-title"
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

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar" data-testid="sprint-okr-list">
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
                        data-testid="sprint-okr-option"
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

              {isGovernance && (
                <div className="bg-emerald-50/60 rounded-3xl p-6 border border-emerald-100">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 block mb-3">
                    Responsável da Sprint *
                  </label>
                  <UserSelectCombobox
                    users={okrUsers}
                    value={responsibleUserId}
                    onChange={(value) => {
                      const nextId = value || null;
                      setResponsibleUserId(nextId);
                      const nextUser = okrUsers.find((user) => user.id === nextId) || null;
                      setValue('responsible_user_id', nextId, { shouldDirty: true });
                      setValue('responsible', nextUser?.name || undefined, { shouldDirty: true });
                    }}
                    loading={okrUsersLoading}
                    placeholder="Selecione o responsável"
                    required
                    disabled={statusOnly}
                  />
                  <p className="text-[10px] text-emerald-600/70 mt-3 font-bold uppercase tracking-wider">
                    Para governança, o responsável pode ser definido manualmente.
                  </p>
                </div>
              )}
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
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Data Fim
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!watch('end_date')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setValue('end_date', null, { shouldDirty: true });
                          } else {
                            // Definir data fim padrão (7 dias após início)
                            const startDate = watch('start_date');
                            const defaultEnd = startDate 
                              ? new Date(new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                            setValue('end_date', defaultEnd, { shouldDirty: true });
                          }
                        }}
                        disabled={statusOnly}
                        data-testid="sprint-continuous-toggle"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Contínua
                      </span>
                    </label>
                  </div>
                  {watch('end_date') ? (
                    <DateInput
                      value={watch('end_date') || ''}
                      onChange={(val) => setValue('end_date', val, { shouldDirty: true })}
                      disabled={statusOnly}
                      min={watch('start_date')}
                    />
                  ) : (
                    <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl px-4 py-3 text-center">
                      <p className="text-sm font-bold text-indigo-600">∞ Sprint Contínua</p>
                      <p className="text-[10px] text-indigo-500 mt-1">Sem data de término definida</p>
                    </div>
                  )}
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

              {/* SEÇÃO: Integração Google Agenda */}
              {(
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📅</span>
                      <div>
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-wider">Google Agenda</h4>
                        <p className="text-[10px] text-blue-600 font-medium">Criar evento com Google Meet</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={calendarSyncEnabled}
                        onChange={(e) => setCalendarSyncEnabled(e.target.checked)}
                        data-testid="sprint-calendar-toggle"
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {statusOnly && (
                    <p className="text-[10px] text-blue-700 font-semibold mb-3">
                      Sprint concluída/cancelada: você pode ajustar o status e a agenda.
                    </p>
                  )}

                  {calendarSyncEnabled && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-blue-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 block mb-2">
                            Horário da Reunião
                          </label>
                          <input
                            type="time"
                            value={meetingTime}
                            onChange={(e) => setMeetingTime(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-blue-200 text-slate-800 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 block mb-2">
                            Duração (minutos)
                          </label>
                          <select
                            value={meetingDuration}
                            onChange={(e) => setMeetingDuration(Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-blue-200 text-slate-800 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          >
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>1 hora</option>
                            <option value={90}>1h 30min</option>
                            <option value={120}>2 horas</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-white/60 rounded-xl p-3 flex items-center gap-3">
                        <span className="text-lg">🔗</span>
                        <div>
                          <p className="text-xs font-bold text-blue-800">
                            {existingCalendarEvent?.meet_link ? (
                              <a href={existingCalendarEvent.meet_link} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">
                                Link do Meet já criado
                              </a>
                            ) : (
                              'Link do Google Meet será criado automaticamente'
                            )}
                          </p>
                          <p className="text-[10px] text-blue-600">
                            Recorrência: {watch('type') === 'semanal' ? 'Semanal' : watch('type') === 'mensal' ? 'Mensal' : watch('type') === 'trimestral' ? 'Trimestral' : watch('type')}
                            {' • '}Convidados: responsável da sprint
                          </p>
                        </div>
                      </div>

                      {existingCalendarEvent?.status === 'error' && (
                        <div className="bg-rose-100 text-rose-700 rounded-xl p-3 text-xs font-bold">
                          ⚠️ Erro na última sincronização: {existingCalendarEvent.last_sync_error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                  data-testid="sprint-delete"
                  className="px-5 py-3 rounded-2xl font-black uppercase tracking-wider text-rose-600 border border-rose-200 hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir Sprint'}
                </button>
              )}
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="sprint-submit"
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
