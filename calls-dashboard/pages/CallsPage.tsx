import React, { useMemo, useState } from 'react';
import { CALLS, DATE_FORMATTER, TIME_FORMATTER, SDRS, secondsToHuman } from '../constants';
import { Link } from 'react-router-dom';

export default function CallsPage() {
  const [query, setQuery] = useState('');
  const [sdr, setSdr] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const filtered = useMemo(() => {
    return CALLS.filter((c) => {
      const q = query.toLowerCase();
      if (q && !(c.company.toLowerCase().includes(q) || c.dealCode.toLowerCase().includes(q))) return false;
      if (sdr && c.sdr.id !== sdr) return false;
      if (status && c.status !== status) return false;
      if (start && new Date(c.date) < new Date(start)) return false;
      if (end && new Date(c.date) > new Date(end)) return false;
      return true;
    });
  }, [query, sdr, status, start, end]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Chamadas</h2>
        <p className="text-sm text-slate-600">Visualize, filtre e analise as ligações dos seus SDRs.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 grid grid-cols-1 lg:grid-cols-6 gap-3">
        <input
          className="border border-slate-300 rounded px-3 py-2 text-sm col-span-2"
          placeholder="Empresa ou Deal ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="border border-slate-300 rounded px-3 py-2 text-sm" value={sdr} onChange={(e) => setSdr(e.target.value)}>
          <option value="">Todos os SDRs</option>
          {SDRS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select className="border border-slate-300 rounded px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>
          <option value="answered">Atendida</option>
          <option value="missed">Não Atendida</option>
          <option value="voicemail">Correio de Voz</option>
          <option value="analyzed">Analisada</option>
        </select>
        <input className="border border-slate-300 rounded px-3 py-2 text-sm" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <input className="border border-slate-300 rounded px-3 py-2 text-sm" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm text-slate-600 border-b">
              <th className="p-4 font-medium">Empresa</th>
              <th className="p-4 font-medium">SDR</th>
              <th className="p-4 font-medium">Data</th>
              <th className="p-4 font-medium">Duração</th>
              <th className="p-4 font-medium">Nota</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((call) => (
              <tr key={call.id} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{call.company}</div>
                  <div className="text-xs text-slate-500">{call.dealCode}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <img className="w-8 h-8 rounded-full" src={call.sdr.avatarUrl} alt="avatar" />
                    <div className="text-sm text-slate-700">{call.sdr.name}</div>
                  </div>
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
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500">Nenhuma chamada encontrada com os filtros atuais.</div>
        )}
      </div>
    </div>
  );
}


