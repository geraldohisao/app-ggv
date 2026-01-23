import React, { useState, useEffect } from 'react';
import { KREditModal } from '../okr/KREditModal';
import { ProgressBar } from '../shared/ProgressBar';
import * as checkinService from '../../services/checkin.service';
import * as okrService from '../../services/okr.service';
import { calculateKRProgress, formatKRValue } from '../../utils/krProgress';
import { useToast } from '../shared/Toast';
import { useOKRUsers } from '../../hooks/useOKRUsers';
import { MiniAvatar } from '../shared/MiniAvatar';
import type { KeyResult } from '../../types/okr.types';

interface KRIndicatorBlockProps {
  sprintId: string;
  onKRUpdated?: () => void;
  readOnly?: boolean;
  isGovernance?: boolean;
}

export const KRIndicatorBlock: React.FC<KRIndicatorBlockProps> = ({ sprintId, onKRUpdated, readOnly = false, isGovernance = false }) => {
  const [krs, setKrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKR, setEditingKR] = useState<KeyResult | null>(null);
  const { addToast } = useToast();
  const { users } = useOKRUsers();

  useEffect(() => {
    loadKRs();
  }, [sprintId]);

  const loadKRs = async () => {
    setLoading(true);
    try {
      const krsData = await checkinService.getSprintKRs(sprintId);
      setKrs(krsData);
    } catch (error) {
      console.error('Erro ao carregar KRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKR = async (updatedKR: KeyResult) => {
    // IMPORTANTE:
    // O KR já é salvo no banco dentro do `KREditModal` (ele chama okrService.updateKeyResult).
    // Aqui nós só precisamos refletir na UI (sem salvar de novo, evitando enviar campos extras como `okrs`).
    if (!updatedKR?.id) return;

    setKrs((prev) =>
      (prev || []).map((kr) => (kr?.id === updatedKR.id ? { ...kr, ...updatedKR } : kr))
    );

    addToast('✅ KR atualizado com sucesso!', 'success');
    setEditingKR(null);
    onKRUpdated?.();

    // Recarregar para garantir consistência (e.g. cálculo de status no backend)
    await loadKRs();
  };

  const handleDeleteKR = async (deletedKrId: string) => {
    if (!deletedKrId) return;
    setKrs((prev) => (prev || []).filter((kr: any) => kr?.id !== deletedKrId));
    addToast('🗑️ KR excluído com sucesso!', 'success');
    setEditingKR(null);
    onKRUpdated?.();
    await loadKRs();
  };

  // Helper para cor do status
  const getKRStatusColor = (status: string) => {
    switch (status) {
      case 'verde': return 'bg-emerald-100 text-emerald-700';
      case 'amarelo': return 'bg-amber-100 text-amber-700';
      case 'vermelho': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-20 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (krs.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
        <p className="text-slate-400 font-medium">Nenhum KR vinculado a esta sprint.</p>
        <p className="text-xs text-slate-300 mt-1">Vincule OKRs à sprint para acompanhar indicadores.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {isGovernance ? 'Indicadores em Revisão' : 'Indicadores do Ciclo'}
        </h3>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {krs.length} {krs.length === 1 ? 'KR' : 'KRs'}
        </span>
      </div>

      {isGovernance && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs font-semibold text-purple-800">
          🎯 <strong>Sprint de Governança:</strong> Indicadores em modo de visualização para análise qualitativa.
        </div>
      )}

      {/* Lista de KRs - Mesmo estilo do OKRCard */}
      <div className="space-y-3 bg-slate-50/50 rounded-3xl p-5 border border-slate-100">
        {krs.map((kr, i) => {
          const krProgress = calculateKRProgress(kr);
          
          // Determinar responsável do KR
          const krResponsible = kr.responsible_user_id 
            ? users.find(u => u.id === kr.responsible_user_id) 
            : null;
          
          // Se não tem responsável próprio, buscar o owner do OKR (via any para evitar erro de tipo)
          const okrData = (kr as any).okrs;
          const okrOwner = okrData?.owner ? users.find(u => u.name === okrData.owner) : null;
          const displayUser = krResponsible || okrOwner;
          const isInherited = !krResponsible && !!okrOwner;
          
          return (
            <div 
              key={kr.id || i}
              className="flex flex-col xl:flex-row xl:items-center gap-4 py-3 border-b border-slate-100 last:border-0 hover:bg-white/80 transition-colors rounded-xl px-3 cursor-pointer group/kr"
              onClick={() => !readOnly && !isGovernance && setEditingKR(kr)}
              title={readOnly ? 'Sprint encerrada' : isGovernance ? 'Apenas visualização' : 'Clique para editar este KR'}
            >
              {/* Avatar + Status indicator + Título */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar do responsável - sempre existe (KR ou OKR) */}
                {displayUser && <MiniAvatar user={displayUser} size="sm" isInherited={isInherited} />}
                
                {/* Status indicator */}
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  krProgress >= 85 ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 
                  krProgress >= 75 ? 'bg-amber-500 shadow-[0_0_8px_#F59E0B]' : 
                  'bg-rose-500 shadow-[0_0_8px_#F43F5E]'
                }`} />
                
                <div className="flex flex-col min-w-0">
                  {okrData?.objective && (
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400 truncate">
                      {okrData.objective}
                    </p>
                  )}
                  <p className="text-sm font-bold text-slate-700 leading-snug truncate">{kr.title}</p>
                  {kr.description && (
                    <p className="text-[10px] text-slate-400 truncate hidden sm:block">{kr.description}</p>
                  )}
                </div>
              </div>

              {/* Valores e Progresso */}
              <div className="flex items-center gap-4 w-full xl:w-auto xl:ml-auto mt-2 xl:mt-0">
                <div className="flex flex-col items-end min-w-[90px]">
                  <span className="text-sm font-black text-slate-900">
                    {formatKRValue(kr.current_value, kr.type, kr.unit)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Meta: {formatKRValue(kr.target_value, kr.type, kr.unit)}
                  </span>
                  <span className={`mt-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getKRStatusColor(kr.status)}`}>
                    {kr.status || 'vermelho'}
                  </span>
                </div>
                
                {/* Progresso: menor para priorizar título */}
                <div className="flex items-center gap-2 w-full xl:w-[140px] justify-end">
                  <div className="w-full xl:w-[90px]">
                    <ProgressBar 
                      percentage={krProgress} 
                      color={krProgress >= 85 ? 'green' : krProgress >= 75 ? 'yellow' : 'red'} 
                    />
                  </div>
                  {/* % no lugar do antigo botão "Editar" (deixa mais espaço pro título) */}
                  <span className="text-[10px] font-bold text-slate-500 min-w-[40px] text-right">
                    {krProgress.toFixed(0)}%
                  </span>
                </div>

                {isGovernance && (
                  <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-200">
                    Visualização
                  </span>
                )}

                {readOnly && !isGovernance && (
                  <span className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400">
                    Encerrado
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Edição de KR */}
      {editingKR && (
        <KREditModal
          kr={editingKR}
          defaultResponsibleUserId={
            editingKR.responsible_user_id || 
            (editingKR.okrs?.owner ? users.find(u => u.name === editingKR.okrs.owner)?.id : undefined)
          }
          onClose={() => setEditingKR(null)}
          onSave={handleSaveKR}
          onDelete={handleDeleteKR}
        />
      )}
    </div>
  );
};
