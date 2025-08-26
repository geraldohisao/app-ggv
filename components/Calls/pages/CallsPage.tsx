import React, { useEffect, useMemo, useState } from 'react';
import { CALLS, DATE_FORMATTER, TIME_FORMATTER, SDRS, secondsToHuman } from '../../../calls-dashboard/constants';
import { fetchCalls } from '../../../services/callsService';
import RelativeDateRange from '../RelativeDateRange';
import FilterChips from '../FilterChips';
import SavedFilters from '../SavedFilters';
import { listFavoriteSdrs, toggleFavoriteSdr } from '../../../services/preferences';

export default function CallsPage() {
  const [query, setQuery] = useState('');
  const [sdr, setSdr] = useState('');
  const [status, setStatus] = useState('');
  const [callType, setCallType] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const [remote, setRemote] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const setPreset = (days: number) => {
    const endD = new Date();
    const startD = new Date();
    startD.setDate(endD.getDate() - (days - 1));
    setStart(fmt(startD));
    setEnd(fmt(endD));
  };

  // Sincroniza filtros com a URL (#/calls?sdr=...&start=...&end=...)
  useEffect(() => {
    const applyFromHash = () => {
      const hash = window.location.hash || '';
      const [path, qs] = hash.split('?');
      if (!path?.startsWith('#/calls')) return;
      const params = new URLSearchParams(qs || '');
      setSdr(params.get('sdr') || '');
      setStatus(params.get('status') || '');
      setCallType(params.get('callType') || '');
      setStart(params.get('start') || '');
      setEnd(params.get('end') || '');
      setQuery(params.get('q') || '');
      setPage(Number(params.get('page') || 1));
    };
    applyFromHash();
    window.addEventListener('hashchange', applyFromHash);
    return () => window.removeEventListener('hashchange', applyFromHash);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { items, total } = await fetchCalls({
          sdrId: sdr || undefined,
          status: status || undefined,
          callType: callType || undefined,
          start: start || undefined,
          end: end || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        setRemote(items);
        setTotal(total || items.length);
      } catch (e: any) {
        setError(e?.message || 'Falha ao buscar chamadas');
        setRemote(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [sdr, status, callType, start, end, page]);

  useEffect(() => { setPage(1); }, [sdr, status, callType, start, end, query]);

  const filtered = useMemo(() => {
    const source = remote ?? CALLS; // fallback aos mocks
    return source.filter((c: any) => {
      const q = query.toLowerCase();
      const company = (c.company || '').toLowerCase();
      const deal = (c.dealCode || c.deal_id || '').toLowerCase();
      if (q && !(company.includes(q) || deal.includes(q))) return false;
      if (sdr && (c.sdr?.id || c.sdr_id) !== sdr) return false;
      if (status && c.status !== status) return false;
      if (start && new Date(c.date) < new Date(start)) return false;
      if (end && new Date(c.date) > new Date(end)) return false;
      return true;
    });
  }, [query, sdr, status, start, end]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-3 lg:p-4 grid grid-cols-1 xl:grid-cols-6 lg:grid-cols-5 gap-2 lg:gap-3">
        <input
          className="border border-slate-300 rounded px-2.5 py-2 text-sm col-span-2 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          placeholder="Empresa ou Deal ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" value={sdr} onChange={(e) => setSdr(e.target.value)}>
          <option value="">Todos os SDRs</option>
          {SDRS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>
          <option value="answered">Atendida</option>
          <option value="missed">Não Atendida</option>
          <option value="voicemail">Correio de Voz</option>
          <option value="analyzed">Analisada</option>
        </select>
        <select className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" value={callType} onChange={(e) => setCallType(e.target.value)}>
          <option value="">Todos os Tipos</option>
          <option value="diagnostico">Diagnóstico</option>
          <option value="ligacao">Ligação</option>
          <option value="proposta">Proposta</option>
        </select>
        <div className="shrink">
          <RelativeDateRange onChange={(r) => { setStart(r.start); setEnd(r.end); }} />
        </div>
      </div>

      <FilterChips
        chips={[
          ...(query ? [{ key: 'q', label: `Busca: ${query}` }] : []),
          ...(sdr ? [{ key: 'sdr', label: `SDR: ${SDRS.find(x=>x.id===sdr)?.name || sdr}` }] : []),
          ...(status ? [{ key: 'status', label: `Status: ${status}` }] : []),
          ...(callType ? [{ key: 'callType', label: `Tipo: ${callType}` }] : []),
          ...((start||end) ? [{ key: 'date', label: `Período: ${start || '...'} a ${end || '...'}` }] : []),
        ]}
        onClear={(k) => {
          if (k==='q') setQuery('');
          if (k==='sdr') setSdr('');
          if (k==='status') setStatus('');
          if (k==='callType') setCallType('');
          if (k==='date') { setStart(''); setEnd(''); }
        }}
        onClearAll={() => { setQuery(''); setSdr(''); setStatus(''); setCallType(''); setStart(''); setEnd(''); }}
      />

      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs text-slate-500 mb-2">Filtros salvos</div>
        <SavedFilters
          view="calls"
          params={{ ...(sdr?{sdr}:{}) , ...(status?{status}:{}) , ...(callType?{callType}:{}) , ...(start?{start}:{}) , ...(end?{end}:{}) , ...(query?{q:query}:{}) }}
          onApply={(p) => {
            setSdr(p.sdr || ''); setStatus(p.status || ''); setCallType(p.callType || ''); setStart(p.start || ''); setEnd(p.end || ''); setQuery(p.q || '');
          }}
        />
        <div className="mt-3 text-xs text-slate-500">Favoritos</div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {SDRS.map((s) => {
            const favs = listFavoriteSdrs();
            const active = favs.includes(s.id);
            return (
              <button key={s.id} onClick={() => { const updated = toggleFavoriteSdr(s.id); setSdr(active ? '' : s.id); }} className={`px-2 py-1 text-xs rounded border ${active?'border-indigo-300 text-indigo-700 bg-indigo-50':'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{s.name}</button>
            );
          })}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && <div className="p-4 text-slate-600">Carregando chamadas...</div>}
        {error && <div className="p-4 text-rose-700 bg-rose-50 border-b border-rose-200">{error}</div>}
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
            {filtered.map((call: any) => (
              <tr key={call.id} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-slate-800">{call.company}</div>
                  <div className="text-xs text-slate-500">{call.dealCode || call.deal_id}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {call.sdr?.avatarUrl && <img className="w-8 h-8 rounded-full" src={call.sdr.avatarUrl} alt="avatar" />}
                    <div className="text-sm text-slate-700">{call.sdr?.name || call.sdr_id || '-'}</div>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  {DATE_FORMATTER.format(new Date(call.date || call.created_at))}
                  <span className="text-slate-400"> • </span>
                  {TIME_FORMATTER.format(new Date(call.date || call.created_at))}
                </td>
                <td className="p-4">{secondsToHuman(call.durationSec ?? call.duration ?? 0)}</td>
                <td className="p-4 text-sm font-semibold">
                  {typeof call.score === 'number' ? (
                    <span className={`${call.score >= 85 ? 'text-emerald-600' : call.score >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{call.score}</span>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center gap-3 justify-end">
                    <a href={`#/calls/${call.id}`} className="text-slate-600 hover:text-slate-900 text-sm">Detalhes</a>
                    <a href={`#/calls/${call.id}/analyze`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Analisar</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500">Nenhuma chamada encontrada com os filtros atuais.</div>
        )}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 text-sm text-slate-600">
          <div>
            Mostrando {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} de {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded border ${page===1?'border-slate-200 text-slate-300':'border-slate-300 hover:bg-slate-50'}`}
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p-1))}
            >Anterior</button>
            <button
              className={`px-3 py-1 rounded border ${page*pageSize>=total?'border-slate-200 text-slate-300':'border-slate-300 hover:bg-slate-50'}`}
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p+1)}
            >Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}


