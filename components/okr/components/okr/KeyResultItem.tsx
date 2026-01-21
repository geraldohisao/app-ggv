import React from 'react';
import { Badge } from '../shared/Badge';
import type { KeyResult } from '../../types/okr.types';
import { getKeyResultStatusColor } from '../../types/okr.types';
import { calculateKRProgress, formatKRValue, getDirectionLabel, getTypeLabel } from '../../utils/krProgress';

interface KeyResultItemProps {
  keyResult: KeyResult;
  onUpdate?: (id: string, updates: Partial<KeyResult>) => void;
  readOnly?: boolean;
}

export const KeyResultItem: React.FC<KeyResultItemProps> = ({
  keyResult,
  onUpdate,
  readOnly = false,
}) => {
  const percentage = calculateKRProgress(keyResult);

  const handleValueChange = (newValue: number) => {
    if (onUpdate && keyResult.id) {
      onUpdate(keyResult.id, { current_value: newValue });
    }
  };

  const handleStatusChange = (newStatus: typeof keyResult.status) => {
    if (onUpdate && keyResult.id) {
      onUpdate(keyResult.id, { status: newStatus });
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 flex-1">
          {keyResult.title}
        </h4>
        <Badge
          label={keyResult.status}
          color={getKeyResultStatusColor(keyResult.status)}
        />
      </div>

      {/* Tipo e Direção */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-bold">
          {getTypeLabel(keyResult.type)}
        </span>
        {keyResult.direction && (
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-bold">
            {getDirectionLabel(keyResult.direction)}
          </span>
        )}
      </div>

      {/* Valores */}
      {keyResult.type !== 'activity' ? (
        <div className="grid grid-cols-3 gap-3 mb-3">
          {keyResult.start_value !== null && keyResult.start_value !== undefined && (
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                DE
              </label>
              <p className="text-sm font-bold text-gray-700">
                {formatKRValue(keyResult.start_value, keyResult.type, keyResult.unit)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
              ATUAL
            </label>
            {readOnly ? (
              <p className="text-sm font-bold text-gray-900">
                {formatKRValue(keyResult.current_value, keyResult.type, keyResult.unit)}
              </p>
            ) : (
              <input
                type="number"
                step="any"
                value={keyResult.current_value ?? 0}
                onChange={(e) => handleValueChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
              META
            </label>
            <p className="text-sm font-bold text-gray-700">
              {formatKRValue(keyResult.target_value, keyResult.type, keyResult.unit)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={keyResult.activity_done || false}
              onChange={(e) => onUpdate && keyResult.id && onUpdate(keyResult.id, { activity_done: e.target.checked })}
              disabled={readOnly}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Marcar como concluída</span>
          </label>
        </div>
      )}

      {/* Progresso */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              keyResult.status === 'verde'
                ? 'bg-green-500'
                : keyResult.status === 'amarelo'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(0)}% concluído</p>
      </div>

      {/* Status Selector (se não read-only) */}
      {!readOnly && onUpdate && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Atualizar Status
          </label>
          <select
            value={keyResult.status}
            onChange={(e) =>
              handleStatusChange(
                e.target.value as typeof keyResult.status
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="verde">Verde</option>
            <option value="amarelo">Amarelo</option>
            <option value="vermelho">Vermelho</option>
          </select>
        </div>
      )}

      {keyResult.updated_at && (
        <p className="text-xs text-gray-400 mt-2">
          Atualizado em:{' '}
          {new Date(keyResult.updated_at).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
};

