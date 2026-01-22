import React, { useState, useEffect, useRef } from 'react';
import { SprintItem, SprintItemType, SprintItemStatus, ImpedimentStatus, DecisionType, DecisionStatus } from '../../types/sprint.types';
import { useOKRUsers, formatUserLabel } from '../../hooks/useOKRUsers';
import * as sprintService from '../../services/sprint.service';

interface SprintItemInlineFormProps {
  sprintId: string;
  type: SprintItemType;
  item?: SprintItem; // Para edição
  onSave: () => void;
  onCancel: () => void;
}

// Configurações visuais por tipo
const typeConfig = {
  iniciativa: {
    borderColor: 'border-indigo-200',
    focusBorder: 'focus:border-indigo-400',
    placeholder: 'Título da iniciativa...',
    icon: '📋',
  },
  impedimento: {
    borderColor: 'border-rose-200',
    focusBorder: 'focus:border-rose-400',
    placeholder: 'Descreva o impedimento...',
    icon: '🛡️',
  },
  decisão: {
    borderColor: 'border-violet-200',
    focusBorder: 'focus:border-violet-400',
    placeholder: 'Descreva a decisão...',
    icon: '💬',
  },
  atividade: {
    borderColor: 'border-emerald-200',
    focusBorder: 'focus:border-emerald-400',
    placeholder: 'Título da atividade...',
    icon: '⚡',
  },
  marco: {
    borderColor: 'border-amber-200',
    focusBorder: 'focus:border-amber-400',
    placeholder: 'Título do marco...',
    icon: '🚩',
  },
};

export const SprintItemInlineForm: React.FC<SprintItemInlineFormProps> = ({
  sprintId,
  type,
  item,
  onSave,
  onCancel,
}) => {
  const isEdit = !!item?.id;
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const { users, loading: loadingUsers } = useOKRUsers();
  const config = typeConfig[type] || typeConfig.iniciativa;
  
  const [formData, setFormData] = useState({
    title: item?.title || '',
    description: item?.description || '',
    responsible: item?.responsible || '',
    responsible_user_id: item?.responsible_user_id || '',
    status: item?.status || SprintItemStatus.PENDING,
    due_date: item?.due_date || '',
    // Campos específicos de impedimentos
    impediment_status: (item as any)?.impediment_status || ImpedimentStatus.OPEN,
    // Campos específicos de decisões
    decision_type: (item as any)?.decision_type || '',
    decision_status: (item as any)?.decision_status || DecisionStatus.DECIDED,
  });
  
  const [saving, setSaving] = useState(false);
  const [showResponsibleDropdown, setShowResponsibleDropdown] = useState(false);
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const responsibleRef = useRef<HTMLDivElement>(null);

  // Auto-focus no título ao montar e selecionar todo o texto para fácil edição
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      // Selecionar todo o texto para facilitar edição
      titleRef.current.select();
      // Auto-resize inicial
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, []);

  // Auto-resize do textarea ao digitar
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, title: e.target.value });
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (responsibleRef.current && !responsibleRef.current.contains(event.target as Node)) {
        setShowResponsibleDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler para teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Enter sem Shift salva, Enter com Shift quebra linha
    if (e.key === 'Enter' && !e.shiftKey && e.target === titleRef.current) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      titleRef.current?.focus();
      return;
    }
    
    setSaving(true);
    try {
      const baseData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        responsible: formData.responsible || null,
        responsible_user_id: formData.responsible_user_id || null,
        status: formData.status,
        due_date: formData.due_date || null,
      };

      // Adicionar campos específicos por tipo
      const typeSpecificData: any = {};
      if (type === 'impedimento') {
        typeSpecificData.impediment_status = formData.impediment_status;
      }
      if (type === 'decisão') {
        typeSpecificData.decision_type = formData.decision_type || null;
        typeSpecificData.decision_status = formData.decision_status;
      }

      if (isEdit && item?.id) {
        await sprintService.updateSprintItem(item.id, {
          ...baseData,
          ...typeSpecificData,
        });
      } else {
        await sprintService.createSprintItem({
          sprint_id: sprintId,
          type,
          ...baseData,
          ...typeSpecificData,
        });
      }
      onSave();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectUser = (user: { id: string; name: string; cargo?: string }) => {
    setFormData({
      ...formData,
      responsible: formatUserLabel(user as any),
      responsible_user_id: user.id,
    });
    setShowResponsibleDropdown(false);
    setResponsibleSearch('');
  };

  const clearResponsible = () => {
    setFormData({
      ...formData,
      responsible: '',
      responsible_user_id: '',
    });
  };

  const filteredUsers = users.filter(user => {
    const label = formatUserLabel(user).toLowerCase();
    return label.includes(responsibleSearch.toLowerCase());
  });

  const selectedUser = users.find(u => u.id === formData.responsible_user_id);

  return (
    <div 
      className={`bg-white rounded-xl p-4 shadow-sm border ${config.borderColor} transition-all duration-200`}
      onKeyDown={handleKeyDown}
    >
      {/* Linha principal: Ícone + Título + Ações */}
      <div className="flex items-center gap-3">
        {/* Ícone do tipo */}
        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm">
          {config.icon}
        </div>

        {/* Campo Título */}
        <textarea
          ref={titleRef}
          value={formData.title}
          onChange={handleTitleChange}
          placeholder={config.placeholder}
          rows={1}
          className={`flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-300 p-0 resize-none overflow-hidden leading-tight`}
          style={{ minHeight: '20px' }}
        />

        {/* Botões de ação */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !formData.title.trim()}
            className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Salvar (Enter)"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-all"
            title="Cancelar (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Segunda linha: Descrição */}
      <div className="mt-3 ml-9">
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição opcional..."
          rows={1}
          className="w-full bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 focus:border-indigo-400 focus:ring-0 text-xs text-slate-600 placeholder:text-slate-300 resize-none transition-all"
        />
      </div>

      {/* Terceira linha: Campos adicionais */}
      <div className="mt-3 ml-9 flex flex-wrap items-center gap-2">
        {/* Responsável */}
        <div className="relative" ref={responsibleRef}>
          <button
            type="button"
            onClick={() => setShowResponsibleDropdown(!showResponsibleDropdown)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              formData.responsible_user_id 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {selectedUser ? (
              <>
                <span className="truncate max-w-[80px]">{selectedUser.name}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); clearResponsible(); }}
                  className="hover:text-rose-500"
                >
                  ×
                </span>
              </>
            ) : (
              <span>Responsável</span>
            )}
          </button>

          {showResponsibleDropdown && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                value={responsibleSearch}
                onChange={(e) => setResponsibleSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-slate-50 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 border-none focus:ring-2 focus:ring-indigo-400 mb-2"
                autoFocus
              />
              <div className="max-h-[180px] overflow-y-auto space-y-1">
                {loadingUsers ? (
                  <div className="p-3 text-center text-xs text-slate-400">Carregando...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">Nenhum usuário encontrado</div>
                ) : (
                  filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors text-xs ${
                        formData.responsible_user_id === user.id 
                          ? 'bg-indigo-50 text-indigo-900' 
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        formData.responsible_user_id === user.id ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{user.name}</p>
                        {user.cargo && <p className="text-[10px] text-slate-400 truncate">{user.cargo}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Data Limite */}
        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
          formData.due_date 
            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
            : 'bg-slate-100 text-slate-500'
        }`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="bg-transparent border-none focus:ring-0 text-[10px] font-bold p-0 w-[90px] cursor-pointer"
            style={{ colorScheme: 'light' }}
          />
          {formData.due_date && (
            <span
              onClick={() => setFormData({ ...formData, due_date: '' })}
              className="cursor-pointer hover:text-rose-500"
            >
              ×
            </span>
          )}
        </div>

        {/* Status - só para iniciativas/atividades */}
        {(type === 'iniciativa' || type === 'atividade' || type === 'marco') && (
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
              formData.status === 'concluído' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : formData.status === 'em andamento'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <option value="pendente">Pendente</option>
            <option value="em andamento">Em Andamento</option>
            <option value="concluído">Concluído</option>
          </select>
        )}

        {/* Status do Impedimento */}
        {type === 'impedimento' && (
          <select
            value={formData.impediment_status}
            onChange={(e) => setFormData({ ...formData, impediment_status: e.target.value as any })}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
              formData.impediment_status === 'resolvido'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : formData.impediment_status === 'bloqueado'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : formData.impediment_status === 'em_risco'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <option value="aberto">Aberto</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="em_risco">Em Risco</option>
            <option value="resolvido">Resolvido</option>
          </select>
        )}

        {/* Campos de Decisão */}
        {type === 'decisão' && (
          <>
            <select
              value={formData.decision_type}
              onChange={(e) => setFormData({ ...formData, decision_type: e.target.value as any })}
              className="px-2 py-1.5 rounded-lg text-[10px] font-bold border border-violet-200 bg-violet-50 text-violet-700 transition-all cursor-pointer"
            >
              <option value="">Tipo...</option>
              <option value="ajuste_okr">Ajuste OKR</option>
              <option value="priorizacao">Priorização</option>
              <option value="alocacao_recursos">Recursos</option>
              <option value="cancelamento_pivot">Cancelamento</option>
              <option value="estrategica">Estratégica</option>
              <option value="tatica">Tática</option>
            </select>
            <select
              value={formData.decision_status}
              onChange={(e) => setFormData({ ...formData, decision_status: e.target.value as any })}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                formData.decision_status === 'concluido'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : formData.decision_status === 'em_execucao'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : formData.decision_status === 'pausado'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : formData.decision_status === 'cancelado'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              <option value="decidido">Decidido</option>
              <option value="em_execucao">Em Execução</option>
              <option value="pausado">Pausado</option>
              <option value="cancelado">Cancelado</option>
              <option value="concluido">Concluído</option>
            </select>
          </>
        )}
      </div>
    </div>
  );
};
