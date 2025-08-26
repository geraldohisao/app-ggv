import React from 'react';
import { CALLS } from '../constants';

// Simple SVG line chart without external libs
export default function CallVolumeChart({ data }: { data?: any[] }) {
  const source = data ?? CALLS;
  const byDay: Record<string, { answered: number; missed: number }> = {};
  source.forEach((c: any) => {
    const dateValue = c.date || c.created_at;
    const day = new Date(dateValue).toLocaleDateString('pt-BR');
    if (!byDay[day]) byDay[day] = { answered: 0, missed: 0 };
    const answered = c.status === 'missed' ? false : (c.status === 'voicemail' ? false : true);
    if (answered) byDay[day].answered++; else byDay[day].missed++;
  });
  const labels = Object.keys(byDay).sort((a, b) => {
    const [da, ma, ya] = a.split('/').map(Number);
    const [db, mb, yb] = b.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });
  const answered = labels.map((l) => byDay[l].answered);
  const missed = labels.map((l) => byDay[l].missed);
  const maxY = Math.max(1, ...answered, ...missed);

  const width = 720;
  const height = 240;
  const padding = 30;
  const xStep = labels.length > 1 ? (width - padding * 2) / (labels.length - 1) : 0;
  const yScale = (v: number) => height - padding - (v / maxY) * (height - padding * 2);

  const pathFrom = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * xStep} ${yScale(v)}`).join(' ');

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Volume de Chamadas por Dia</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-indigo-700"><span className="w-3 h-0.5 bg-indigo-600 rounded"></span> Atendidas</span>
          <span className="inline-flex items-center gap-1 text-slate-500"><span className="w-3 h-0.5 bg-slate-400 rounded"></span> Não Atendidas</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-60">
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#cbd5e1" />
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#cbd5e1" />
        <path d={pathFrom(missed)} fill="none" stroke="#94a3b8" strokeWidth={2} />
        <path d={pathFrom(answered)} fill="none" stroke="#4f46e5" strokeWidth={2} />
        {labels.map((l, i) => (
          <text key={l} x={padding + i * xStep} y={height - padding + 16} textAnchor="middle" fontSize="10" fill="#64748b">{l}</text>
        ))}
      </svg>
    </div>
  );
}


