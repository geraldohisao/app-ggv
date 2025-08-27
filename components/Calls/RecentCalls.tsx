import React from 'react';
import { DATE_FORMATTER, TIME_FORMATTER, secondsToHuman } from '../../calls-dashboard/constants';

interface RecentCallsProps {
  items?: Array<any>;
  calls?: Array<any>;
}

export default function RecentCalls({ items, calls }: RecentCallsProps) {
  // Usar calls se disponível, senão usar items
  const data = calls || items || [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-200 font-medium">Chamadas Recentes</div>
      <div className="divide-y">
        {data.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">
            Nenhuma chamada encontrada
          </div>
        ) : (
          data.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-800">{c.company || '-'}</div>
                <div className="text-xs text-slate-500">{c.sdr?.name || c.sdr_name || c.sdr_id || '-'}</div>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-600">
                <div>{secondsToHuman(c.durationSec ?? c.duration ?? 0)}</div>
                <div>{typeof c.score === 'number' ? c.score : 'N/A'}</div>
                <a href={`#/calls/${c.id}/analyze`} className="text-indigo-600 hover:text-indigo-800">Analisar</a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


