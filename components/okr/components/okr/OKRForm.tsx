import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOKRStore } from '../../store/okrStore';
import {
  OKRLevel,
  Department,
  OKRStatus,
  Periodicity,
  KeyResultStatus,
  type OKR,
  type KeyResult,
} from '../../types/okr.types';
import { useToast, ToastContainer } from '../shared/Toast';

// Schema do formulário (simplificado para o form)
const okrFormSchema = z.object({
  level: z.enum([OKRLevel.STRATEGIC, OKRLevel.SECTORAL]),
  department: z.enum([
    Department.GENERAL,
    Department.COMMERCIAL,
    Department.MARKETING,
    Department.PROJECTS,
  ]),
  owner: z.string().min(2, 'Nome do responsável é obrigatório'),
  objective: z.string().min(10, 'Objetivo deve ter pelo menos 10 caracteres'),
  start_date: z.string(),
  end_date: z.string(),
  periodicity: z.enum([Periodicity.MONTHLY, Periodicity.QUARTERLY]),
  status: z.enum([
    OKRStatus.NOT_STARTED,
    OKRStatus.IN_PROGRESS,
    OKRStatus.COMPLETED,
  ]),
  notes: z.string().optional(),
  key_results: z
    .array(
      z.object({
        title: z.string().min(3, 'Título é obrigatório'),
        current_value: z.number().default(0),
        target_value: z.number().positive('Meta deve ser positiva'),
        unit: z.string().optional(),
        status: z.enum([
          KeyResultStatus.GREEN,
          KeyResultStatus.YELLOW,
          KeyResultStatus.RED,
        ]),
      })
    )
    .min(1, 'Pelo menos 1 Key Result é obrigatório'),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  {
    message: 'Data de início deve ser anterior à data de término',
    path: ['end_date'],
  }
);

type OKRFormData = z.infer<typeof okrFormSchema>;

interface OKRFormProps {
  okr?: OKR; // Se fornecido, é modo edição
  onClose: () => void;
  onSuccess?: () => void;
}

export const OKRForm: React.FC<OKRFormProps> = ({ okr, onClose, onSuccess }) => {
  const isEditMode = !!okr;
  const { createOKR, updateOKR } = useOKRStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedKRs, setExpandedKRs] = useState<Set<number>>(new Set([0])); // Primeiro KR expandido por padrão
  const { toasts, addToast, removeToast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<OKRFormData>({
    resolver: zodResolver(okrFormSchema),
    defaultValues: isEditMode && okr
      ? {
          level: okr.level,
          department: okr.department,
          owner: okr.owner,
          objective: okr.objective,
          start_date: okr.start_date,
          end_date: okr.end_date,
          periodicity: okr.periodicity,
          status: okr.status,
          notes: okr.notes || '',
          key_results: okr.key_results || [],
        }
      : {
          level: OKRLevel.STRATEGIC,
          department: Department.GENERAL,
          owner: '',
          objective: '',
          start_date: `${new Date().getFullYear()}-01-01`,
          end_date: `${new Date().getFullYear()}-12-31`,
          periodicity: Periodicity.QUARTERLY,
          status: OKRStatus.NOT_STARTED,
          notes: '',
          key_results: [
            {
              title: '',
              current_value: 0,
              target_value: 100,
              unit: '%',
              status: KeyResultStatus.RED,
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'key_results',
  });

  const toggleKR = (index: number) => {
    setExpandedKRs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAllKRs = () => {
    setExpandedKRs(new Set(fields.map((_, i) => i)));
  };

  const collapseAllKRs = () => {
    setExpandedKRs(new Set());
  };

  const onSubmit = async (data: OKRFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && okr?.id) {
        // Editar OKR existente
        const updated = await updateOKR(
          okr.id,
          {
            level: data.level,
            department: data.department,
            owner: data.owner,
            objective: data.objective,
            start_date: data.start_date,
            end_date: data.end_date,
            periodicity: data.periodicity,
            status: data.status,
            notes: data.notes,
          },
          data.key_results
        );

        if (updated) {
          console.log('✅ OKR atualizado:', updated);
          addToast('OKR atualizado com sucesso!', 'success');
          setTimeout(() => {
          onSuccess?.();
          onClose();
          }, 500);
        } else {
          addToast('Erro ao atualizar OKR. Verifique o console.', 'error');
        }
      } else {
        // Criar novo OKR
        const created = await createOKR(
          {
            level: data.level,
            department: data.department,
            owner: data.owner,
            objective: data.objective,
            start_date: data.start_date,
            end_date: data.end_date,
            periodicity: data.periodicity,
            status: data.status,
            notes: data.notes,
          },
          data.key_results
        );

        if (created) {
          console.log('✅ OKR criado:', created);
          addToast('OKR criado com sucesso!', 'success');
          setTimeout(() => {
          onSuccess?.();
          onClose();
          }, 500);
        } else {
          addToast('Erro ao criar OKR. Verifique o console.', 'error');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar OKR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addToast(`Erro ao salvar OKR: ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Editar OKR' : 'Criar Novo OKR'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Grid de Campos Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nível */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nível <span className="text-red-500">*</span>
              </label>
              <select
                {...register('level')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={OKRLevel.STRATEGIC}>Estratégico</option>
                <option value={OKRLevel.SECTORAL}>Setorial</option>
              </select>
              {errors.level && (
                <p className="text-red-600 text-sm mt-1">{errors.level.message}</p>
              )}
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento <span className="text-red-500">*</span>
              </label>
              <select
                {...register('department')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={Department.GENERAL}>Geral</option>
                <option value={Department.COMMERCIAL}>Comercial</option>
                <option value={Department.MARKETING}>Marketing</option>
                <option value={Department.PROJECTS}>Projetos</option>
              </select>
              {errors.department && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.department.message}
                </p>
              )}
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável <span className="text-red-500">*</span>
              </label>
              <input
                {...register('owner')}
                type="text"
                placeholder="Ex: João Silva (CEO)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.owner && (
                <p className="text-red-600 text-sm mt-1">{errors.owner.message}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={OKRStatus.NOT_STARTED}>Não Iniciado</option>
                <option value={OKRStatus.IN_PROGRESS}>Em Andamento</option>
                <option value={OKRStatus.COMPLETED}>Concluído</option>
              </select>
            </div>

            {/* Data Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início <span className="text-red-500">*</span>
              </label>
              <input
                {...register('start_date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.start_date && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.start_date.message}
                </p>
              )}
            </div>

            {/* Data Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim <span className="text-red-500">*</span>
              </label>
              <input
                {...register('end_date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.end_date && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.end_date.message}
                </p>
              )}
            </div>

            {/* Periodicidade */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Periodicidade <span className="text-red-500">*</span>
              </label>
              <select
                {...register('periodicity')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={Periodicity.MONTHLY}>Mensal</option>
                <option value={Periodicity.QUARTERLY}>Trimestral</option>
              </select>
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objetivo <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('objective')}
              rows={3}
              placeholder="Ex: Aumentar receita recorrente em 30% no Q1 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {errors.objective && (
              <p className="text-red-600 text-sm mt-1">
                {errors.objective.message}
              </p>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Observações adicionais (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Key Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Key Results * (mínimo 1)
              </label>
              <div className="flex items-center gap-2">
                {fields.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={expandAllKRs}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100"
                      title="Expandir todos"
                    >
                      Expandir Todos
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllKRs}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100"
                      title="Recolher todos"
                    >
                      Recolher Todos
                    </button>
                  </>
                )}
              <button
                type="button"
                  onClick={() => {
                    const newIndex = fields.length;
                  append({
                    title: '',
                    current_value: 0,
                    target_value: 100,
                    unit: '%',
                    status: KeyResultStatus.RED,
                    });
                    // Expandir automaticamente o novo KR
                    setExpandedKRs(prev => new Set([...prev, newIndex]));
                  }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Adicionar Key Result
              </button>
            </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {fields.map((field, index) => {
                const isExpanded = expandedKRs.has(index);
                const krTitle = watch(`key_results.${index}.title`) || `Key Result #${index + 1}`;
                const hasError = !!errors.key_results?.[index];

                return (
                <div
                  key={field.id}
                    className={`bg-gray-50 rounded-lg border-2 transition-all ${
                      hasError ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                    }`}
                >
                    {/* Header do KR - Sempre visível */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100/50 rounded-t-lg"
                      onClick={() => toggleKR(index)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                          ▶
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">KR #{index + 1}</span>
                            {hasError && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                                Preencha os campos obrigatórios
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-700 mt-0.5 truncate">
                            {krTitle || 'Sem título'}
                          </p>
                        </div>
                      </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                            // Remover do set de expandidos
                            setExpandedKRs(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(index);
                              return newSet;
                            });
                          }}
                          className="text-red-600 hover:text-red-800 text-sm px-3 py-1 rounded hover:bg-red-100"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                    {/* Conteúdo do KR - Colapsável */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-200">
                    {/* Título do KR */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Título *
                          </label>
                      <input
                        {...register(`key_results.${index}.title`)}
                        type="text"
                        placeholder="Ex: Gerar R$ 1M em vendas"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.key_results?.[index]?.title && (
                            <p className="text-red-600 text-xs mt-1">
                          {errors.key_results[index]!.title!.message}
                        </p>
                      )}
                    </div>

                        <div className="grid grid-cols-2 gap-4">
                    {/* Valor Atual */}
                    <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valor Atual
                      </label>
                      <input
                        {...register(`key_results.${index}.current_value`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="any"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Meta */}
                    <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                        Meta *
                      </label>
                      <input
                        {...register(`key_results.${index}.target_value`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="any"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.key_results?.[index]?.target_value && (
                              <p className="text-red-600 text-xs mt-1">
                          {errors.key_results[index]!.target_value!.message}
                        </p>
                      )}
                    </div>

                    {/* Unidade */}
                    <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unidade
                      </label>
                      <input
                        {...register(`key_results.${index}.unit`)}
                        type="text"
                        placeholder="Ex: %, R$, SQL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Status */}
                    <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        {...register(`key_results.${index}.status`)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                              <option value={KeyResultStatus.GREEN}>✅ Verde (No prazo)</option>
                              <option value={KeyResultStatus.YELLOW}>⚠️ Amarelo (Atenção)</option>
                              <option value={KeyResultStatus.RED}>🔴 Vermelho (Atrasado)</option>
                      </select>
                    </div>
                  </div>
                </div>
                    )}
                  </div>
                );
              })}
            </div>

            {errors.key_results && typeof errors.key_results.message === 'string' && (
              <p className="text-red-600 text-sm mt-2 font-medium bg-red-50 px-3 py-2 rounded-md border border-red-200">
                ⚠️ {errors.key_results.message}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Salvando...'
                : isEditMode
                ? 'Atualizar OKR'
                : 'Criar OKR'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

