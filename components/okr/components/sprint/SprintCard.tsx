import React from 'react';
import { Badge } from '../shared/Badge';
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

interface SprintCardProps {
  sprint: SprintWithItems;
  onClick?: () => void;
}

export const SprintCard: React.FC<SprintCardProps> = ({ sprint, onClick }) => {
  const progress = calculateSprintProgress(sprint);
  const active = isSprintActive(sprint);

  const initiativesCount = sprint.items?.filter((i) => i.type === 'iniciativa').length || 0;
  const impedimentsCount = sprint.items?.filter((i) => i.type === 'impedimento').length || 0;
  const decisionsCount = sprint.items?.filter((i) => i.type === 'decisão').length || 0;
  const completedCount = sprint.items?.filter((i) => i.status === 'concluído').length || 0;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden
        hover:shadow-lg transition-all cursor-pointer group
        ${active ? 'ring-2 ring-[#5B5FF5] ring-offset-2' : ''}
      `}
    >
      {/* Header */}
      <div className="bg-slate-900 px-6 py-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Badge
              label={getSprintTypeLabel(sprint.type)}
              color="bg-white/10 text-white border border-white/20"
            />
            <Badge
              label={getDepartmentLabel(sprint.department)}
              color="bg-white/5 text-slate-300 border border-white/10"
            />
            {active && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ativa</span>
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-indigo-200 transition-colors">
            {sprint.title}
          </h3>
          <p className="text-xs text-slate-400 mt-2 font-medium">{formatDateRange(sprint.start_date, sprint.end_date)}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {sprint.okr_title && (
          <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">🎯 OKR Vinculado</p>
            <p className="text-xs font-bold text-indigo-900 line-clamp-1">{sprint.okr_title}</p>
          </div>
        )}

        {sprint.items && sprint.items.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Progresso</span>
              <span className="text-slate-900">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#5B5FF5] h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-50 rounded-xl px-1.5 py-3 min-w-0">
            <p className="text-2xl font-black text-blue-600 mb-1">{initiativesCount}</p>
            <p className="text-[9px] font-bold text-blue-500 uppercase leading-tight tracking-normal whitespace-normal break-words">
              Iniciativas
            </p>
          </div>
          <div className="bg-rose-50 rounded-xl px-1.5 py-3 min-w-0">
            <p className="text-2xl font-black text-rose-600 mb-1">{impedimentsCount}</p>
            <p className="text-[9px] font-bold text-rose-500 uppercase leading-tight tracking-normal whitespace-normal break-words">
              Impedimentos
            </p>
          </div>
          <div className="bg-violet-50 rounded-xl px-1.5 py-3 min-w-0">
            <p className="text-2xl font-black text-violet-600 mb-1">{decisionsCount}</p>
            <p className="text-[9px] font-bold text-violet-500 uppercase leading-tight tracking-normal whitespace-normal break-words">
              Decisões
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
          <Badge label={sprint.status} color={getSprintStatusColor(sprint.status)} />
        </div>
      </div>
    </div>
  );
};
