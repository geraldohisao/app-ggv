import React from 'react';
import type { SprintItem } from '../../types/sprint.types';
import { formatDate } from '../../types/sprint.types';

interface SprintItemRowProps {
  item: SprintItem;
  onUpdate?: (id: string, updates: Partial<SprintItem>) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: SprintItem) => void;
  readOnly?: boolean;
}

export const SprintItemRow: React.FC<SprintItemRowProps> = ({
  item,
  onUpdate,
  onDelete,
  onEdit,
  readOnly = false,
}) => {
  const isCompleted = item.status === 'concluído';

  const toggleStatus = () => {
    if (readOnly || !onUpdate || !item.id) return;
    const newStatus = isCompleted ? 'pendente' : 'concluído';
      onUpdate(item.id, { status: newStatus });
  };

  return (
    <div className={`
      bg-white rounded-3xl p-6 shadow-sm border transition-all duration-300 group
      ${isCompleted ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 hover:shadow-md hover:border-indigo-100'}
    `}>
      <div className="flex items-center justify-between gap-4">
        {/* Checkbox Customizado */}
        <button
          onClick={toggleStatus}
          disabled={readOnly}
          className={`
            w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
            ${isCompleted 
              ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30' 
              : 'border-slate-200 text-transparent hover:border-indigo-400'
            }
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleStatus}>
          <h4 className={`text-lg font-bold transition-all ${isCompleted ? 'text-slate-400 line-through decoration-2' : 'text-slate-800'}`}>
            {item.title}
          </h4>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
            {/* Responsável */}
            {item.responsible ? (
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {item.responsible}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Sem responsável
              </div>
            )}

            {/* Data Limite */}
            {item.due_date && (
              <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                new Date(item.due_date) < new Date() && !isCompleted ? 'text-rose-500' : 'text-slate-400'
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {formatDate(item.due_date)}
              </div>
            )}

            {/* Status Badge (se não for concluído/pendente padrão) */}
            {item.status === 'em andamento' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                Em Andamento
              </span>
            )}
            
            {item.is_carry_over && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span>🔁</span> Carry-over
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        {!readOnly && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
            {onDelete && (
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(item.id!); }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Remover"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

