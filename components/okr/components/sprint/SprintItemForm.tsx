import React, { useState, useEffect } from 'react';
import { SprintItemType, SprintItemStatus, DecisionType, DecisionStatus, ImpedimentStatus } from '../../types/sprint.types';
import * as sprintService from '../../services/sprint.service';
import { projectService } from '../../services/project.service';
import { Project } from '../../types/sprint.types';
import { useOKRUsers, formatUserLabel } from '../../hooks/useOKRUsers';
import { useOKRStore } from '../../store/okrStore';
import { ResponsibleSelect } from '../shared/ResponsibleSelect';
import { useToast, ToastContainer } from '../shared/Toast';

interface SprintItemFormProps {
  sprintId: string;
  type: SprintItemType;
  item?: any; // Para edição
  okrIds?: string[];
  onClose?: () => void;
  onCancel?: () => void;
  onSuccess: () => void;
}

export const SprintItemForm: React.FC<SprintItemFormProps> = ({
  sprintId,
  type,
  item,
  okrIds,
  onClose,
  onCancel,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    title: item?.title || '',
    description: item?.description || '',
    responsible: item?.responsible || '',
    responsible_user_id: item?.responsible_user_id || '',
    status: item?.status || SprintItemStatus.PENDING,
    due_date: item?.due_date || '',
    project_id: item?.project_id || '',
    okr_id: item?.okr_id || (okrIds?.length === 1 ? okrIds[0] : ''),
    kr_id: item?.kr_id || '',
    decision_type: item?.decision_type || '',
    decision_status: item?.decision_status || DecisionStatus.DECIDED,
    decision_impact: item?.decision_impact || '',
    decision_deadline: item?.decision_deadline || '',
    impediment_status: item?.impediment_status || ImpedimentStatus.OPEN,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const { users, loading: loadingUsers } = useOKRUsers();
  const { okrs, fetchOKRs } = useOKRStore();
  const { toasts, addToast, removeToast } = useToast();
  const initialMode: 'none' | 'internal' | 'external' = item?.responsible_user_id
    ? 'internal'
    : item?.responsible
      ? 'external'
      : 'none';
  const [responsibleMode, setResponsibleMode] = useState<'none' | 'internal' | 'external'>(initialMode);
  const [selectedUserId, setSelectedUserId] = useState<string>(item?.responsible_user_id || '');

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const data = await projectService.listProjects();
        setProjects(data);
      } catch (error) {
        console.warn('⚠️ Projetos não disponíveis (ignorando):', error);
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (type !== 'decisão') return;
    if (okrs.length === 0) {
      fetchOKRs();
    }
  }, [type, okrs.length, fetchOKRs]);

  useEffect(() => {
    if (responsibleMode === 'none') {
      setFormData((prev) => ({ ...prev, responsible: '', responsible_user_id: '' }));
      return;
    }

    if (responsibleMode === 'internal') {
      const selected = users.find((u) => u.id === selectedUserId);
      setFormData((prev) => ({
        ...prev,
        responsible: selected ? formatUserLabel(selected) : '',
        responsible_user_id: selected ? selected.id : '',
      }));
      return;
    }
    // external: mantém o texto digitado
  }, [responsibleMode, selectedUserId, users]);

  const linkedOKRs = (okrIds?.length ? okrs.filter((okr) => okrIds.includes(okr.id)) : []).sort(
    (a, b) => a.objective.localeCompare(b.objective)
  );
  const selectedOKR = linkedOKRs.find((okr) => okr.id === formData.okr_id);
  const availableKRs = selectedOKR?.key_results || [];

  useEffect(() => {
    if (type !== 'decisão') return;
    if (okrIds?.length === 1 && !formData.okr_id) {
      setFormData((prev) => ({ ...prev, okr_id: okrIds[0] }));
    }
  }, [type, okrIds, formData.okr_id]);

  useEffect(() => {
    if (type !== 'decisão') return;
    if (formData.kr_id && !availableKRs.find((kr) => kr.id === formData.kr_id)) {
      setFormData((prev) => ({ ...prev, kr_id: '' }));
    }
  }, [type, formData.kr_id, availableKRs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    if (!formData.title.trim()) {
      addToast('❌ Título é obrigatório', 'error');
      return;
    }

    if (formData.title.trim().length < 3) {
      addToast('❌ Título deve ter pelo menos 3 caracteres', 'error');
      return;
    }

    if (!sprintId) {
      addToast('❌ ID da sprint não encontrado. Recarregue a página.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔍 Dados sendo enviados:', {
        sprint_id: sprintId,
        type,
        title: formData.title,
        description: formData.description,
        responsible: formData.responsible,
        responsible_user_id: formData.responsible_user_id,
        status: formData.status,
        due_date: formData.due_date,
        project_id: formData.project_id,
      });

      let result;
      if (item?.id) {
        result = await sprintService.updateSprintItem(item.id, {
          ...formData,
        });
      } else {
        result = await sprintService.createSprintItem({
          sprint_id: sprintId,
          type,
          title: formData.title.trim(),
          description: formData.description?.trim() || '',
          responsible: formData.responsible || null,
          responsible_user_id: formData.responsible_user_id || null,
          status: formData.status,
          due_date: formData.due_date || null,
          project_id: formData.project_id || null,
          okr_id: type === 'decisão' ? formData.okr_id || null : null,
          kr_id: type === 'decisão' ? formData.kr_id || null : null,
          decision_type: type === 'decisão' ? formData.decision_type || null : null,
          decision_status: type === 'decisão' ? formData.decision_status || DecisionStatus.DECIDED : null,
          decision_impact: type === 'decisão' ? formData.decision_impact?.trim() || null : null,
          decision_deadline: type === 'decisão' ? formData.decision_deadline || null : null,
          impediment_status: type === 'impedimento' ? formData.impediment_status || ImpedimentStatus.OPEN : null,
        });
      }

      if (!result) {
        throw new Error('Item não foi salvo. Resposta vazia do servidor.');
      }

      console.log('✅ Item salvo com sucesso:', result);
      addToast(`✅ ${typeLabels[type].title.replace('Nov', 'Item salv')}o com sucesso!`, 'success');
      setTimeout(() => {
      onSuccess();
      }, 500);
    } catch (error: any) {
      console.error('❌ Erro detalhado ao salvar item:', error);
      
      // Extrair mensagem específica do erro do Supabase
      let errorMessage = 'Erro ao salvar item';
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.code) {
        console.error('Código do erro:', error.code);
        
        // Mensagens amigáveis para códigos comuns do Supabase/PostgreSQL
        switch (error.code) {
          case '23502': // not_null_violation
            errorMessage = 'Um campo obrigatório está faltando no banco de dados';
            break;
          case '23503': // foreign_key_violation
            errorMessage = 'Sprint não encontrada. Recarregue a página';
            break;
          case '23505': // unique_violation
            errorMessage = 'Este item já existe';
            break;
          case '42501': // insufficient_privilege
            errorMessage = 'Sem permissão para criar item. Verifique seu login';
            break;
          case 'PGRST116': // Row Level Security
            errorMessage = 'Sem permissão para acessar esta sprint';
            break;
          default:
            if (error.code.startsWith('23')) {
              errorMessage = `Erro de validação no banco: ${error.message}`;
            }
        }
      }
      
      if (error?.details) {
        console.error('Detalhes do erro:', error.details);
        errorMessage += ` (Detalhes: ${error.details})`;
      }
      
      if (error?.hint) {
        console.error('Dica:', error.hint);
      }
      
      addToast(`❌ ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabels = {
    iniciativa: { title: 'Nova Iniciativa', emoji: '📋', color: 'indigo' },
    impedimento: { title: 'Novo Impedimento', emoji: '🛡️', color: 'rose' },
    decisão: { title: 'Nova Decisão', emoji: '💬', color: 'violet' },
    atividade: { title: 'Nova Atividade', emoji: '⚡', color: 'emerald' },
    marco: { title: 'Novo Marco', emoji: '🚩', color: 'amber' },
  };

  const config = typeLabels[type];

  const handleClose = () => {
    const closeFn = onClose || onCancel;
    if (!closeFn) return;
    if (!formData.title.trim() || confirm('Fechar sem salvar? Dados serão perdidos.')) {
      closeFn();
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-6"
    >
      <div
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-3xl w-full border border-slate-100 overflow-hidden"
      >
        <header className="bg-white px-8 py-6 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 bg-${config.color}-100 rounded-2xl flex items-center justify-center text-2xl`}>
              {config.emoji}
            </div>
            <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {config.title}
            </h2>
              {item?.is_carry_over && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-full border border-amber-200 mt-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Carry-over da sprint anterior
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={`Ex: ${type === 'iniciativa' ? 'Campanha de cold email' : type === 'atividade' ? 'Configurar GA4' : type === 'impedimento' ? 'CRM fora do ar' : 'Aprovar desconto para Enterprise'}`}
              className="w-full bg-slate-50 rounded-2xl px-6 py-4 border-none focus:ring-2 focus:ring-[#5B5FF5] text-base font-bold text-slate-800 placeholder:text-slate-300"
              required
            />
          </div>

          {type === 'decisão' && (
            <>
              {/* Bloco 1: Classificação da Decisão */}
              <div className="bg-purple-50/60 rounded-2xl p-5 border border-purple-200 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 mb-3">
                  📋 Classificação da Decisão
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 block mb-3">
                      Tipo de Decisão <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.decision_type}
                      onChange={(e) => setFormData({ ...formData, decision_type: e.target.value })}
                      className="w-full bg-white rounded-2xl px-4 py-3 border border-purple-100 focus:ring-2 focus:ring-purple-500 text-sm font-bold text-slate-700"
                      required
                    >
                      <option value="">Selecione o tipo</option>
                      <option value={DecisionType.OKR_ADJUSTMENT}>🎯 Ajuste de OKR</option>
                      <option value={DecisionType.PRIORITIZATION}>⭐ Priorização</option>
                      <option value={DecisionType.RESOURCE_ALLOCATION}>💰 Alocação de Recursos</option>
                      <option value={DecisionType.CANCELLATION}>🔄 Cancelamento/Pivot</option>
                      <option value={DecisionType.STRATEGIC}>🏛️ Estratégica</option>
                      <option value={DecisionType.TACTICAL}>⚡ Tática</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 block mb-3">
                      Status de Execução
                    </label>
                    <select
                      value={formData.decision_status}
                      onChange={(e) => setFormData({ ...formData, decision_status: e.target.value as any })}
                      className="w-full bg-white rounded-2xl px-4 py-3 border border-purple-100 focus:ring-2 focus:ring-purple-500 text-sm font-bold text-slate-700"
                    >
                      <option value={DecisionStatus.DECIDED}>📝 Decidido</option>
                      <option value={DecisionStatus.IN_EXECUTION}>⚙️ Em Execução</option>
                      <option value={DecisionStatus.COMPLETED}>✅ Concluído</option>
                      <option value={DecisionStatus.CANCELLED}>❌ Cancelado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Impacto Estratégico */}
              <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 mb-3">
                  🎯 Impacto Estratégico
                </h4>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 block mb-3">
                    OKR Impactado
                  </label>
                  <select
                    value={formData.okr_id}
                    onChange={(e) => setFormData({ ...formData, okr_id: e.target.value, kr_id: '' })}
                    className="w-full bg-white rounded-2xl px-6 py-3 border border-indigo-100 focus:ring-2 focus:ring-[#5B5FF5] text-sm font-bold text-slate-700"
                  >
                    <option value="">Sem vínculo direto</option>
                    {linkedOKRs.map((okr) => (
                      <option key={okr.id} value={okr.id}>
                        {okr.objective}
                      </option>
                    ))}
                  </select>
                  {okrIds?.length === 0 && (
                    <p className="text-[10px] text-indigo-500/70 mt-2 font-bold uppercase tracking-wider">
                      Nenhum OKR vinculado à sprint. Vincule OKRs na sprint para associar decisões.
                    </p>
                  )}
                </div>

                {formData.okr_id && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-3">
                      KR Específico (Opcional)
                    </label>
                    <select
                      value={formData.kr_id}
                      onChange={(e) => setFormData({ ...formData, kr_id: e.target.value })}
                      className="w-full bg-white rounded-2xl px-6 py-3 border border-indigo-100 focus:ring-2 focus:ring-[#5B5FF5] text-sm font-bold text-slate-700"
                    >
                      <option value="">Sem KR específico</option>
                      {availableKRs.map((kr) => (
                        <option key={kr.id} value={kr.id}>
                          {kr.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 block mb-3">
                    Descrição do Impacto
                  </label>
                  <textarea
                    value={formData.decision_impact}
                    onChange={(e) => setFormData({ ...formData, decision_impact: e.target.value })}
                    rows={3}
                    placeholder="Ex: Liberará 2 desenvolvedores para focar no KR crítico de crescimento..."
                    className="w-full bg-white rounded-2xl px-6 py-4 border border-indigo-100 focus:ring-2 focus:ring-[#5B5FF5] text-sm font-medium text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 block mb-3">
                    Prazo para Execução
                  </label>
                  <input
                    type="date"
                    value={formData.decision_deadline}
                    onChange={(e) => setFormData({ ...formData, decision_deadline: e.target.value })}
                    className="w-full bg-white rounded-2xl px-6 py-3 border border-indigo-100 focus:ring-2 focus:ring-[#5B5FF5] text-sm font-bold text-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
              Vincular a Projeto (Opcional)
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full bg-slate-50 rounded-2xl px-6 py-4 border-none focus:ring-2 focus:ring-[#5B5FF5] text-sm font-bold text-slate-700"
            >
              <option value="">Nenhum Projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {type !== 'decisão' && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                Descrição (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Detalhes adicionais..."
                className="w-full bg-slate-50 rounded-2xl px-6 py-4 border-none focus:ring-2 focus:ring-[#5B5FF5] text-sm font-medium text-slate-700 placeholder:text-slate-300"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                Responsável (Opcional)
              </label>
              <ResponsibleSelect
                mode={responsibleMode}
                onModeChange={setResponsibleMode}
                selectedUserId={selectedUserId}
                onUserSelect={setSelectedUserId}
                externalName={formData.responsible}
                onExternalNameChange={(name) => setFormData(prev => ({ ...prev, responsible: name }))}
                users={users}
                loading={loadingUsers}
              />
              <p className="text-[10px] text-slate-500 mt-2">
                💡 Escolha: Nenhum, Interno (usuário do sistema) ou Externo (nome livre)
              </p>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
                Data Limite (Opcional)
              </label>
              <div className="relative">
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full bg-slate-50 rounded-2xl px-6 py-3 border-none focus:ring-2 focus:ring-[#5B5FF5] text-sm font-bold text-slate-700 cursor-pointer"
                  style={{ colorScheme: 'light' }}
                />
                {formData.due_date && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, due_date: '' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                    title="Limpar data"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                💡 Clique no campo para abrir o seletor de data
              </p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">
              Status Inicial
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as SprintItemStatus })}
              className="w-full bg-slate-50 rounded-2xl px-6 py-3 border-none focus:ring-2 focus:ring-[#5B5FF5] text-sm font-bold text-slate-700 uppercase tracking-wider"
            >
              <option value={SprintItemStatus.PENDING}>Pendente</option>
              <option value={SprintItemStatus.IN_PROGRESS}>Em Andamento</option>
              <option value={SprintItemStatus.COMPLETED}>Concluído</option>
            </select>
          </div>

          {type === 'impedimento' && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 block mb-3">
                Status do Impedimento
              </label>
              <select
                value={formData.impediment_status}
                onChange={(e) => setFormData({ ...formData, impediment_status: e.target.value as ImpedimentStatus })}
                className="w-full bg-rose-50 rounded-2xl px-6 py-3 border border-rose-100 focus:ring-2 focus:ring-rose-400 text-sm font-bold text-slate-700 uppercase tracking-wider"
              >
                <option value={ImpedimentStatus.OPEN}>🔴 Aberto</option>
                <option value={ImpedimentStatus.BLOCKED}>🚫 Bloqueado</option>
                <option value={ImpedimentStatus.AT_RISK}>⚠️ Em Risco</option>
                <option value={ImpedimentStatus.RESOLVED}>✅ Resolvido</option>
              </select>
              <p className="text-[10px] text-rose-600 mt-2 font-bold">
                💡 Impedimentos marcados como "Resolvido" não serão carregados para a próxima sprint
              </p>
            </div>
          )}

          <footer className="flex items-center justify-between gap-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="bg-[#5B5FF5] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-200 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : item?.id ? 'Salvar Alterações' : 'Adicionar Item'}
            </button>
          </footer>
        </form>
      </div>
    </div>
    </>
  );
};
