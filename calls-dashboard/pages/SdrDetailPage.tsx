import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CALLS, SDRS, DATE_FORMATTER, TIME_FORMATTER, secondsToHuman } from '../constants';

export default function SdrDetailPage() {
  const { id } = useParams();
  const sdr = useMemo(() => SDRS.find((s) => s.id === id), [id]);
  const calls = CALLS.filter((c) => c.sdr.id === id);
  const totalCalls = calls.length;
  const answered = calls.filter((c) => c.status !== 'missed').length;
  const answeredRate = totalCalls ? Math.round((answered / totalCalls) * 100) : 0;
  const avgScore = calls.filter((c) => typeof c.score === 'number').reduce((a, c, _, arr) => a + (c.score || 0) / arr.length, 0);
  const avgDuration = calls.reduce((a, c) => a + c.durationSec, 0) / (totalCalls || 1);

  if (!sdr) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6">
          <div className="text-slate-700">SDR não encontrado.</div>
          <Link to="/dashboard" className="text-indigo-600 text-sm">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-indigo-600 font-medium">
            {sdr.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{sdr.name}</h2>
          <p className="text-sm text-slate-600">Visão geral da performance e chamadas de {sdr.name}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Total de Chamadas</div>
          <div className="text-2xl font-bold text-slate-800">{totalCalls}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Taxa de Atendimento</div>
          <div className="text-2xl font-bold text-slate-800">{answeredRate}%</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Nota Média</div>
          <div className="text-2xl font-bold text-slate-800">{avgScore ? Math.round(avgScore) : 'N/A'}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Duração Média</div>
          <div className="text-2xl font-bold text-slate-800">{Math.round(avgDuration/60)}m {Math.round(avgDuration%60)}s</div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm text-slate-600 border-b">
              <th className="p-4 font-medium">Empresa</th>
              <th className="p-4 font-medium">Data</th>
              <th className="p-4 font-medium">Duração</th>
              <th className="p-4 font-medium">Nota</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{call.company}</div>
                  <div className="text-xs text-slate-500">{call.dealCode}</div>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  {DATE_FORMATTER.format(new Date(call.date))}
                  <span className="text-slate-400"> • </span>
                  {TIME_FORMATTER.format(new Date(call.date))}
                </td>
                <td className="p-4">{secondsToHuman(call.durationSec)}</td>
                <td className="p-4 text-sm font-semibold">
                  {typeof call.score === 'number' ? (
                    <span className={`${call.score >= 85 ? 'text-emerald-600' : call.score >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{call.score}</span>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <Link to={`/calls/${call.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Ver Detalhes</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


