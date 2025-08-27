import React from 'react';

interface User { id: string; name: string; avatarUrl?: string }

interface RankingScoreProps {
  items?: Array<{ user: User; calls: number; avgScore: number | null }>;
  data?: Array<{ user: User; calls: number; avgScore: number | null }>;
}

export function RankingScore({ items, data }: RankingScoreProps) {
  const rankingData = data || items || [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-200 font-medium">Ranking de SDRs (Nota)</div>
      <div className="divide-y">
        {rankingData.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">
            Nenhum dado disponível
          </div>
        ) : (
          rankingData.map((it, idx) => (
            <a key={it.user.id} href={`#/calls?sdr=${encodeURIComponent(it.user.id)}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-6 text-slate-500">{idx + 1}</div>
                {it.user.avatarUrl ? (
                  <img className="w-8 h-8 rounded-full" src={it.user.avatarUrl} alt="avatar" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium text-sm">
                      {it.user.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-slate-800">{it.user.name}</div>
                  <div className="text-xs text-slate-500">{it.calls} chamadas</div>
                </div>
              </div>
              <div className="text-sm text-slate-700">
                <span className="text-slate-400">Nota Média</span> {it.avgScore ?? 'N/A'}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

interface RankingVolumeProps {
  items?: Array<{ user: User; calls: number }>;
  data?: Array<{ user: User; calls: number }>;
}

export function RankingVolume({ items, data }: RankingVolumeProps) {
  const rankingData = data || items || [];

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-4 py-3 border-b border-slate-200 font-medium">Ranking de Volume</div>
      <div className="divide-y">
        {rankingData.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">
            Nenhum dado disponível
          </div>
        ) : (
          rankingData.map((it, idx) => (
            <a key={it.user.id} href={`#/calls?sdr=${encodeURIComponent(it.user.id)}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-6 text-slate-500">{idx + 1}</div>
                {it.user.avatarUrl ? (
                  <img className="w-8 h-8 rounded-full" src={it.user.avatarUrl} alt="avatar" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium text-sm">
                      {it.user.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="text-sm font-medium text-slate-800">{it.user.name}</div>
              </div>
              <div className="text-xs text-slate-500">
                <span className="text-slate-400">Chamadas</span> {it.calls}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}


