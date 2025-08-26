import React, { useEffect, useMemo, useState } from 'react';
import CallVolumeChart from '../../../calls-dashboard/components/CallVolumeChart';
import SdrScoreChart from '../../../calls-dashboard/components/SdrScoreChart';
import { CALLS, SDRS } from '../../../calls-dashboard/constants';
import { fetchCalls } from '../../../services/callsService';
import RelativeDateRange from '../RelativeDateRange';
import KpiCards from '../KpiCards';
import { RankingScore, RankingVolume } from '../Rankings';
import RecentCalls from '../RecentCalls';
import { computeMetricsClientSide } from '../../../services/callsService';
import SavedFilters from '../SavedFilters';

export default function DashboardPage() {
  const [sdr, setSdr] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');

  const [remote, setRemote] = useState<any[] | null>(null);
  const source = remote ?? CALLS;

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const setPreset = (days: number) => {
    const endD = new Date();
    const startD = new Date();
    startD.setDate(endD.getDate() - (days - 1));
    setStart(fmt(startD));
    setEnd(fmt(endD));
  };

  useEffect(() => {
    const run = async () => {
      try {
        const { items } = await fetchCalls({
          sdrId: sdr || undefined,
          status: status || undefined,
          start: start || undefined,
          end: end || undefined,
        });
        setRemote(items);
      } catch {
        setRemote(null);
      }
    };
    run();
  }, [sdr, start, end, status]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return source.filter((c: any) => {
      const company = (c.company || '').toLowerCase();
      const deal = (c.dealCode || c.deal_id || '').toLowerCase();
      if (q && !(company.includes(q) || deal.includes(q))) return false;
      if (sdr && (c.sdr?.id || c.sdr_id) !== sdr) return false;
      if (status && c.status !== status) return false;
      if (start && new Date(c.date || c.created_at) < new Date(start)) return false;
      if (end && new Date(c.date || c.created_at) > new Date(end)) return false;
      return true;
    });
  }, [source, query, sdr, status, start, end]);

  const totalCalls = filtered.length;
  const answered = filtered.filter((c) => c.status !== 'missed').length;
  const answeredRate = totalCalls ? Math.round((answered / totalCalls) * 100) : 0;
  const avgDuration = filtered.reduce((a: number, c: any) => a + (c.durationSec ?? c.duration ?? 0), 0) / (totalCalls || 1);

  const metrics = computeMetricsClientSide(filtered as any);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-3 lg:p-4 grid grid-cols-1 xl:grid-cols-5 lg:grid-cols-4 gap-2 lg:gap-3">
        <input className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="Empresa ou Deal ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" value={sdr} onChange={(e) => setSdr(e.target.value)}>
          <option value="">Todos os SDRs</option>
          {SDRS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <select className="border border-slate-300 rounded px-2.5 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os Tipos</option>
          <option value="answered">Atendidas</option>
          <option value="missed">Não Atendidas</option>
          <option value="voicemail">Correio de Voz</option>
        </select>
        <div className="shrink">
          <RelativeDateRange onChange={(r) => { setStart(r.start); setEnd(r.end); }} />
        </div>
      </div>
      <KpiCards data={{ totalCalls, answerRate: (answeredRate/100), avgDurationSec: avgDuration, avgScore: null }} />

      <CallVolumeChart data={filtered} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingScore items={SDRS.map((u) => ({ user: u as any, calls: filtered.filter((c) => (c.sdr?.id || c.sdr_id) === u.id).length, avgScore: null }))} />
        <RankingVolume items={SDRS.map((u) => ({ user: u as any, calls: filtered.filter((c) => (c.sdr?.id || c.sdr_id) === u.id).length }))} />
      </div>

      <RecentCalls items={[...filtered].sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()).slice(0,5)} />

      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="text-xs text-slate-500 mb-2">Filtros salvos</div>
        <SavedFilters
          view="dashboard"
          params={{ ...(sdr?{sdr}:{}) , ...(status?{status}:{}) , ...(start?{start}:{}) , ...(end?{end}:{}) , ...(query?{q:query}:{}) }}
          onApply={(p) => { setSdr(p.sdr || ''); setStatus(p.status || ''); setStart(p.start || ''); setEnd(p.end || ''); setQuery(p.q || ''); }}
        />
      </div>
    </div>
  );
}


