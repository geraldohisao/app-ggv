import React, { useEffect, useMemo, useState } from 'react';

export interface DateRange {
  label: string;
  start: string; // yyyy-mm-dd
  end: string;   // yyyy-mm-dd
}

function fmt(d: Date): string { return d.toISOString().slice(0, 10); }
function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfWeek(d: Date): Date { const x = startOfDay(d); const day = (x.getDay()+6)%7; x.setDate(x.getDate()-day); return x; } // Monday
function endOfWeek(d: Date): Date { const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return e; }
function startOfMonth(d: Date): Date { const x = startOfDay(d); x.setDate(1); return x; }
function endOfMonth(d: Date): Date { const x = startOfDay(d); x.setMonth(x.getMonth()+1, 0); x.setHours(23,59,59,999); return x; }
function startOfQuarter(d: Date): Date { const x = startOfDay(d); const q = Math.floor(x.getMonth()/3)*3; x.setMonth(q,1); return x; }
function endOfQuarter(d: Date): Date { const s = startOfQuarter(d); const e = new Date(s); e.setMonth(s.getMonth()+3,0); e.setHours(23,59,59,999); return e; }
function startOfYear(d: Date): Date { const x = startOfDay(d); x.setMonth(0,1); return x; }
function endOfYear(d: Date): Date { const x = startOfDay(d); x.setMonth(11,31); x.setHours(23,59,59,999); return x; }

const OPTIONS = [
  { key: 'ontem', label: 'Ontem' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'amanha', label: 'Amanhã' },
  { divider: true, label: 'DATAS RELATIVAS' },
  { key: 'esta_semana', label: 'Esta semana' },
  { key: 'semana_passada', label: 'Semana passada' },
  { key: 'proxima_semana', label: 'Próxima semana' },
  { key: 'ultimas_duas_semanas', label: 'Últimas duas semanas' },
  { divider: true, label: 'PERÍODOS RELATIVOS' },
  { key: 'este_mes', label: 'Este mês' },
  { key: 'mes_passado', label: 'Mês passado' },
  { key: 'proximo_mes', label: 'Próximo mês' },
  { key: 'este_trimestre', label: 'Este trimestre' },
  { key: 'proximo_trimestre', label: 'Próximo trimestre' },
  { key: 'trimestre_passado', label: 'Trimestre passado' },
  { key: 'este_ano', label: 'Este ano' },
] as const;

function computeRange(key: string): DateRange {
  const now = new Date();
  switch (key) {
    case 'ontem': {
      const d = new Date(); d.setDate(d.getDate()-1); return { label: 'Ontem', start: fmt(startOfDay(d)), end: fmt(endOfDay(d)) };
    }
    case 'hoje': {
      return { label: 'Hoje', start: fmt(startOfDay(now)), end: fmt(endOfDay(now)) };
    }
    case 'amanha': {
      const d = new Date(); d.setDate(d.getDate()+1); return { label: 'Amanhã', start: fmt(startOfDay(d)), end: fmt(endOfDay(d)) };
    }
    case 'esta_semana': {
      return { label: 'Esta semana', start: fmt(startOfWeek(now)), end: fmt(endOfWeek(now)) };
    }
    case 'semana_passada': {
      const d = new Date(); d.setDate(d.getDate()-7); return { label: 'Semana passada', start: fmt(startOfWeek(d)), end: fmt(endOfWeek(d)) };
    }
    case 'proxima_semana': {
      const d = new Date(); d.setDate(d.getDate()+7); return { label: 'Próxima semana', start: fmt(startOfWeek(d)), end: fmt(endOfWeek(d)) };
    }
    case 'ultimas_duas_semanas': {
      const end = endOfDay(now); const start = new Date(end); start.setDate(end.getDate()-13); start.setHours(0,0,0,0); return { label: 'Últimas duas semanas', start: fmt(start), end: fmt(end) };
    }
    case 'este_mes': {
      return { label: 'Este mês', start: fmt(startOfMonth(now)), end: fmt(endOfMonth(now)) };
    }
    case 'mes_passado': {
      const d = new Date(now.getFullYear(), now.getMonth()-1, 1); return { label: 'Mês passado', start: fmt(startOfMonth(d)), end: fmt(endOfMonth(d)) };
    }
    case 'proximo_mes': {
      const d = new Date(now.getFullYear(), now.getMonth()+1, 1); return { label: 'Próximo mês', start: fmt(startOfMonth(d)), end: fmt(endOfMonth(d)) };
    }
    case 'este_trimestre': {
      return { label: 'Este trimestre', start: fmt(startOfQuarter(now)), end: fmt(endOfQuarter(now)) };
    }
    case 'proximo_trimestre': {
      const d = new Date(now); d.setMonth(now.getMonth()+3); return { label: 'Próximo trimestre', start: fmt(startOfQuarter(d)), end: fmt(endOfQuarter(d)) };
    }
    case 'trimestre_passado': {
      const d = new Date(now); d.setMonth(now.getMonth()-3); return { label: 'Trimestre passado', start: fmt(startOfQuarter(d)), end: fmt(endOfQuarter(d)) };
    }
    case 'este_ano': {
      return { label: 'Este ano', start: fmt(startOfYear(now)), end: fmt(endOfYear(now)) };
    }
    default: {
      return { label: 'Hoje', start: fmt(startOfDay(now)), end: fmt(endOfDay(now)) };
    }
  }
}

export default function RelativeDateRange({ value, onChange }: { value?: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [current, setCurrent] = useState<DateRange>(() => value ?? computeRange('ultimas_duas_semanas'));
  const [manualStart, setManualStart] = useState<string>('');
  const [manualEnd, setManualEnd] = useState<string>('');
  const [errStart, setErrStart] = useState<boolean>(false);
  const [errEnd, setErrEnd] = useState<boolean>(false);

  const toBr = (iso?: string) => {
    if (!iso) return '';
    const [y,m,d] = iso.split('-').map(Number);
    if (!y || !m || !d) return '';
    return String(d).padStart(2,'0') + '/' + String(m).padStart(2,'0') + '/' + y;
  };
  const fromBr = (br?: string) => {
    if (!br) return null;
    const parts = br.replace(/\s+/g,'').split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map(Number);
    if (!dd || !mm || !yyyy) return null;
    const d = new Date(yyyy, mm-1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm-1 || d.getDate() !== dd) return null;
    return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  };

  const mask = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0,2), digits.slice(2,4), digits.slice(4,8)].filter(Boolean);
    return parts.join('/');
  };
  const isValidBr = (br: string) => fromBr(br) !== null;

  useEffect(() => { if (value) setCurrent(value); }, [value]);
  useEffect(() => { onChange(current); }, [current]);
  useEffect(() => {
    setManualStart(toBr(current.start));
    setManualEnd(toBr(current.end));
    setErrStart(false);
    setErrEnd(false);
  }, [open, current.start, current.end]);

  const applyManual = () => {
    const s = fromBr(manualStart);
    const e = fromBr(manualEnd);
    setErrStart(!s);
    setErrEnd(!e);
    if (s && e) {
      setCurrent({ label: `${manualStart} – ${manualEnd}`, start: s, end: e });
      setOpen(false);
    }
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return OPTIONS.filter((o: any) => o.divider || o.label.toLowerCase().includes(s));
  }, [search]);

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="px-3 py-2 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50 min-w-[170px] max-w-[220px] text-left whitespace-nowrap overflow-hidden text-ellipsis">
        {current.label}
        <span className="ml-2 text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-72 bg-white border border-slate-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={manualStart}
                onChange={(e) => { const v = mask(e.target.value); setManualStart(v); setErrStart(v.length===10 ? !isValidBr(v) : false); }}
                onBlur={() => setErrStart(manualStart.length===10 ? !isValidBr(manualStart) : false)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyManual(); }}
                placeholder="DD/MM/YYYY"
                className={`w-1/2 px-3 py-2 text-sm border rounded ${errStart?'border-rose-300 focus:border-rose-400 focus:ring-rose-100':'border-slate-300'}`}
              />
              <span className="text-slate-400">-</span>
              <input
                value={manualEnd}
                onChange={(e) => { const v = mask(e.target.value); setManualEnd(v); setErrEnd(v.length===10 ? !isValidBr(v) : false); }}
                onBlur={() => setErrEnd(manualEnd.length===10 ? !isValidBr(manualEnd) : false)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyManual(); }}
                placeholder="DD/MM/YYYY"
                className={`w-1/2 px-3 py-2 text-sm border rounded ${errEnd?'border-rose-300 focus:border-rose-400 focus:ring-rose-100':'border-slate-300'}`}
              />
            </div>
            <div className="flex items-center justify-between">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar" className="w-full px-3 py-2 text-sm border border-slate-300 rounded" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setManualStart(''); setManualEnd(''); setErrStart(false); setErrEnd(false); }} className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Limpar</button>
              <button onClick={applyManual} className="px-2.5 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700">Aplicar</button>
            </div>
          </div>
          <div className="max-h-72 overflow-auto">
            {filtered.map((o: any, idx: number) => o.divider ? (
              <div key={`d-${idx}`} className="px-3 py-1 text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">{o.label}</div>
            ) : (
              <button key={o.key} onClick={() => { setCurrent(computeRange(o.key)); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 ${current.label===o.label?'bg-indigo-600/10 text-indigo-800':''}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


