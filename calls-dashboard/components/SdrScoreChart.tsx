import React from 'react';
import { CALLS, SDRS } from '../constants';

export default function SdrScoreChart() {
  const averageBySdr = SDRS.map((s) => {
    const calls = CALLS.filter((c) => c.sdr.id === s.id && typeof c.score === 'number');
    const avg = calls.length ? Math.round(calls.reduce((a, c) => a + (c.score || 0), 0) / calls.length) : 0;
    return { s, avg, total: calls.length };
  }).sort((a, b) => b.avg - a.avg);

  const max = Math.max(100, ...averageBySdr.map((x) => x.avg));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="font-semibold text-slate-800 mb-3">Performance por SDR</h3>
      <div className="space-y-3">
        {averageBySdr.map(({ s, avg, total }) => (
          <div key={s.id} className="flex items-center gap-3">
            <img src={s.avatarUrl} className="w-8 h-8 rounded-full" alt="avatar" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{s.name}</span>
                <span className="text-slate-500">{avg} <span className="text-xs">Nota Média</span></span>
              </div>
              <div className="h-2 bg-slate-100 rounded">
                <div className="h-2 bg-indigo-600 rounded" style={{ width: `${(avg / max) * 100}%` }} />
              </div>
              <div className="text-xs text-slate-500">{total} chamadas</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


