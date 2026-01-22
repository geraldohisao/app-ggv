import React from 'react';
import { Badge } from '../shared/Badge';
import { MiniAvatar } from '../shared/MiniAvatar';
import type { SprintWithItems } from '../../types/sprint.types';
import {
  calculateSprintProgress,
  isSprintActive,
  getSprintStatusColor,
  getSprintTypeColor,
  getSprintTypeLabel,
  formatDateRange,
} from '../../types/sprint.types';
import { getDepartmentLabel } from '../../types/okr.types';
import type { OKRUser } from '../../hooks/useOKRUsers';

interface SprintCardProps {
  sprint: SprintWithItems;
  responsibleUser?: OKRUser | null;
  responsibleName?: string | null;
  onClick?: () => void;
}

export const SprintCard: React.FC<SprintCardProps> = ({
  sprint,
  responsibleUser,
  responsibleName,
  onClick,
}) => {
  const progress = calculateSprintProgress(sprint);
  const active = isSprintActive(sprint);
  const displayResponsibleName = responsibleUser?.name || responsibleName || null;
  const avatarUser: OKRUser | null = displayResponsibleName
    ? responsibleUser || {
        id: 'responsible',
        name: displayResponsibleName,
        email: '',
        cargo: null,
        department: null,
        role: '',
        avatar_url: null,
      }
    : null;

  // Calcular urgência
  const now = new Date();
  const endDate = sprint.end_date ? new Date(sprint.end_date) : null;
  const daysRemaining = endDate 
    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  const isOverdue = active && daysRemaining !== null && daysRemaining < 0;
  const isUrgent = active && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;
  const isNearDeadline = active && daysRemaining !== null && daysRemaining > 3 && daysRemaining <= 7;

  const initiativesCount = sprint.items?.filter((i) => i.type === 'iniciativa').length || 0;
  const impedimentsCount = sprint.items?.filter((i) => i.type === 'impedimento').length || 0;
  const decisionsCount = sprint.items?.filter((i) => i.type === 'decisão').length || 0;
  const completedCount = sprint.items?.filter((i) => i.status === 'concluído').length || 0;

  // Determinar estilo do card baseado na urgência
  const getCardRingStyle = () => {
    if (isOverdue) return 'ring-2 ring-rose-500 ring-offset-2';
    if (isUrgent) return 'ring-2 ring-amber-400 ring-offset-2';
    if (active) return 'ring-2 ring-[#5B5FF5] ring-offset-2';
    return '';
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden
        hover:shadow-lg transition-all cursor-pointer group h-full flex flex-col
        ${getCardRingStyle()}
      `}
    >
      {/* Header - altura fixa */}
      <div className="bg-slate-900 px-4 sm:px-6 py-4 sm:py-5 relative overflow-hidden min-h-[120px] sm:min-h-[140px] flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10 flex flex-col h-full">
          {/* Badges + Responsável */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge
              label={getSprintTypeLabel(sprint.type)}
              color="bg-white/10 text-white border border-white/20"
            />
            <Badge
              label={getDepartmentLabel(sprint.department)}
              color="bg-white/5 text-slate-300 border border-white/10"
            />
            {isOverdue && (
              <div className="flex items-center gap-1 bg-rose-500/20 px-1.5 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse shadow-[0_0_8px_#F43F5E]" />
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-400">Atrasada</span>
              </div>
            )}
            {isUrgent && !isOverdue && (
              <div className="flex items-center gap-1 bg-amber-500/20 px-1.5 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_#F59E0B]" />
                <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">Urgente</span>
              </div>
            )}
            {active && !isOverdue && !isUrgent && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Ativa</span>
              </div>
            )}
          </div>
          {/* Título - altura fixa com truncate */}
          <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 group-hover:text-indigo-200 transition-colors flex-1 flex items-center" title={sprint.title}>
            {sprint.title}
          </h3>
          {/* Data */}
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{formatDateRange(sprint.start_date, sprint.end_date)}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col">
        {/* OKR Vinculado - altura fixa se existir */}
        {sprint.okr_title ? (
          <div className="bg-indigo-50/50 rounded-xl p-2 sm:p-3 border border-indigo-100 h-[52px] sm:h-[60px] flex flex-col justify-center">
            <p className="text-[8px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">🎯 OKR Vinculado</p>
            <p className="text-[10px] sm:text-xs font-bold text-indigo-900 line-clamp-1">{sprint.okr_title}</p>
          </div>
        ) : (
          <div className="h-[52px] sm:h-[60px]" /> 
        )}

        {displayResponsibleName && (
          <div className="flex items-center gap-2">
            <MiniAvatar user={avatarUser} size="sm" />
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</p>
              <p className="text-[10px] sm:text-xs font-bold text-slate-700 truncate">{displayResponsibleName}</p>
            </div>
          </div>
        )}

        {/* Progresso - altura fixa */}
        <div className="space-y-2 h-[36px] sm:h-[40px]">
          <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Progresso</span>
            <span className="text-slate-900">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 sm:h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#5B5FF5] h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
          <div className="bg-blue-50 rounded-lg sm:rounded-xl px-1 sm:px-1.5 py-2 sm:py-3 min-w-0">
            <p className="text-lg sm:text-2xl font-black text-blue-600 mb-0.5">{initiativesCount}</p>
            <p className="text-[7px] sm:text-[9px] font-bold text-blue-500 uppercase leading-tight">Iniciativas</p>
          </div>
          <div className="bg-rose-50 rounded-lg sm:rounded-xl px-1 sm:px-1.5 py-2 sm:py-3 min-w-0">
            <p className="text-lg sm:text-2xl font-black text-rose-600 mb-0.5">{impedimentsCount}</p>
            <p className="text-[7px] sm:text-[9px] font-bold text-rose-500 uppercase leading-tight">Impedimentos</p>
          </div>
          <div className="bg-violet-50 rounded-lg sm:rounded-xl px-1 sm:px-1.5 py-2 sm:py-3 min-w-0">
            <p className="text-lg sm:text-2xl font-black text-violet-600 mb-0.5">{decisionsCount}</p>
            <p className="text-[7px] sm:text-[9px] font-bold text-violet-500 uppercase leading-tight">Decisões</p>
          </div>
        </div>

        {/* Status - sempre no final */}
        <div className="pt-2 sm:pt-3 border-t border-slate-100 flex justify-end items-center mt-auto">
          <Badge label={sprint.status} color={getSprintStatusColor(sprint.status)} />
        </div>
      </div>
    </div>
  );
};
