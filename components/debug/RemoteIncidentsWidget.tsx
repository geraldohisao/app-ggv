import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';

type ErrorEventRow = {
  id: number;
  created_at: string;
  incident_hash: string;
  title: string;
  message: string;
  url: string | null;
  user_email: string | null;
  user_role: string | null;
  status_code: number | null;
};

const HOURS_PRESETS = [1, 6, 24, 72];

export const RemoteIncidentsWidget: React.FC = () => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === UserRole.SuperAdmin;
  const [open, setOpen] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [hours, setHours] = useState<number>(6);
  const [auto, setAuto] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ErrorEventRow[]>([]);
  const timerRef = useRef<number | null>(null);

  const sinceIso = useMemo(() => {
    const dt = new Date(Date.now() - hours * 60 * 60 * 1000);
    return dt.toISOString();
  }, [hours]);

  const load = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      // Checar existência da tabela rapidamente
      try {
        const { error: tableErr } = await supabase.from('error_events').select('id').limit(1);
        if (tableErr && String(tableErr.message || '').includes('does not exist')) {
          setError('Tabela error_events ausente. Abra /admin/incidents para instruções.');
          setRows([]);
          setLoading(false);
          return;
        }
      } catch {}

      let query = supabase
        .from('error_events')
        .select('id, created_at, incident_hash, title, message, url, user_email, user_role, status_code')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(50);

      if (email.trim()) {
        query = query.eq('user_email', email.trim());
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;
      setRows((data || []) as any);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar incidentes');
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh
  useEffect(() => {
    if (!isSuperAdmin) return;
    load();
    if (auto) {
      timerRef.current = window.setInterval(load, 30000);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [isSuperAdmin, email, hours, auto]);

  if (!isSuperAdmin) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded-lg shadow bg-slate-800 text-white text-sm hover:bg-slate-700"
          title="Abrir incidentes remotos"
        >
          🔎 Incidentes
        </button>
      )}

      {open && (
        <div className="w-[360px] max-h-[70vh] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
            <div className="text-sm font-semibold text-slate-700">Incidentes Remotos</div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="text-xs px-2 py-1 bg-slate-700 text-white rounded">Atualizar</button>
              <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 bg-slate-200 rounded">Fechar</button>
            </div>
          </div>

          <div className="p-3 space-y-2 border-b">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Filtrar por email"
              className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-slate-600">
                Últimas:
                {HOURS_PRESETS.map(h => (
                  <button
                    key={h}
                    onClick={() => setHours(h)}
                    className={`px-2 py-0.5 rounded border ${hours === h ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'}`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <label className="text-xs text-slate-600 flex items-center gap-1">
                <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto
              </label>
            </div>
            <div className="text-xs text-slate-500">Mostrando desde {new Date(sinceIso).toLocaleString('pt-BR')}</div>
            <a href="/admin/incidents" className="text-xs text-blue-700 underline">Abrir Admin de Incidentes</a>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
            {error && (
              <div className="m-3 p-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded">{error}</div>
            )}
            {loading && (
              <div className="m-3 text-xs text-slate-500">Carregando...</div>
            )}
            {!loading && !error && rows.length === 0 && (
              <div className="m-3 text-xs text-slate-500">Nenhum incidente encontrado.</div>
            )}
            <ul className="divide-y">
              {rows.map(ev => (
                <li key={ev.id} className="p-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-slate-500">{new Date(ev.created_at).toLocaleString('pt-BR')}</div>
                    <span className="text-[10px] text-slate-500">{ev.status_code ? `HTTP ${ev.status_code}` : ''}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 truncate" title={ev.title}>{ev.title}</div>
                  <div className="text-[12px] text-slate-600 truncate" title={ev.message}>{ev.message}</div>
                  <div className="text-[11px] text-slate-500 truncate" title={ev.user_email || ''}>{ev.user_email || '—'}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="text-[10px] bg-slate-100 px-1 rounded" title={ev.incident_hash}>{ev.incident_hash}</code>
                    {ev.url && (
                      <a className="text-[11px] text-blue-700 underline" href={ev.url} target="_blank" rel="noreferrer">abrir</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteIncidentsWidget;


