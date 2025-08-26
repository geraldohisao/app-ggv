import React from 'react';
import Tooltip from '../ui/Tooltip';

export interface KpiData {
  totalCalls: number;
  answerRate: number; // 0-1
  avgDurationSec: number;
  avgScore?: number | null;
}

export default function KpiCards({ data }: { data: KpiData }) {
  const minutes = Math.floor(data.avgDurationSec / 60);
  const seconds = Math.round(data.avgDurationSec % 60);
  const durationLabel = `${minutes}m ${String(seconds).padStart(2, '0')}s`;

  const cards = [
    { title: 'Total de Chamadas', value: data.totalCalls, icon: '📞', href: '#/calls' },
    { title: 'Taxa de Atendimento', value: `${Math.round((data.answerRate || 0) * 100)}%`, icon: '📈', href: '#/calls?status=answered' },
    { title: 'Duração Média', value: durationLabel, icon: '⏱️', href: '#/calls' },
    { title: 'Nota Média Geral', value: data.avgScore ?? 'N/A', icon: '🎯', href: '#/calls' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((c) => (
        <a key={c.title} href={c.href} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3 hover:bg-slate-50">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg">{c.icon}</div>
          <div>
            <div className="text-sm text-slate-500 flex items-center gap-1">
              {c.title}
              <Tooltip text={
                c.title === 'Total de Chamadas' ? 'Quantidade total no período' :
                c.title === 'Taxa de Atendimento' ? 'Percentual de chamadas atendidas' :
                c.title === 'Duração Média' ? 'Tempo médio por chamada' :
                'Média das notas das chamadas' }>
                <span className="text-slate-400">ⓘ</span>
              </Tooltip>
            </div>
            <div className="text-2xl font-semibold text-slate-800">{c.value}</div>
          </div>
        </a>
      ))}
    </div>
  );
}


