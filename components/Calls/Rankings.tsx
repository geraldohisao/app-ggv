import React from 'react';

interface User { id: string; name: string; avatarUrl?: string }

export function RankingScore({ items }: { items: Array<{ user: User; calls: number; avgScore: number | null }> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-200 font-medium">Ranking de SDRs (Nota)</div>
      <div className="divide-y">
        {items.map((it, idx) => (
          <a key={it.user.id} href={`#/calls?sdr=${encodeURIComponent(it.user.id)}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-6 text-slate-500">{idx + 1}</div>
              <img className="w-8 h-8 rounded-full" src={it.user.avatarUrl} alt="avatar" />
              <div>
                <div className="text-sm font-medium text-slate-800">{it.user.name}</div>
                <div className="text-xs text-slate-500">{it.calls} chamadas</div>
              </div>
            </div>
            <div className="text-sm text-slate-700">
              <span className="text-slate-400">Nota Média</span> {it.avgScore ?? 'N/A'}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function RankingVolume({ items }: { items: Array<{ user: User; calls: number }> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-200 font-medium">Ranking de Volume</div>
      <div className="divide-y">
        {items.map((it, idx) => (
          <a key={it.user.id} href={`#/calls?sdr=${encodeURIComponent(it.user.id)}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-6 text-slate-500">{idx + 1}</div>
              <img className="w-8 h-8 rounded-full" src={it.user.avatarUrl} alt="avatar" />
              <div className="text-sm font-medium text-slate-800">{it.user.name}</div>
            </div>
            <div className="text-xs text-slate-500">
              <span className="text-slate-400">Chamadas</span> {it.calls}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}


