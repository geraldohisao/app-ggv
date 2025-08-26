import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { LoadingSpinner } from '../ui/Feedback';

interface DebugLogRow {
  id: number;
  created_at: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: string;
  message: string;
  data: any;
  source?: string;
  url?: string;
  app_version?: string;
  session_id?: string;
  user_email?: string;
  user_role?: string;
}

const levelColors: Record<string, string> = {
  error: 'text-red-700 bg-red-50',
  warn: 'text-yellow-700 bg-yellow-50',
  info: 'text-blue-700 bg-blue-50',
  debug: 'text-gray-700 bg-gray-50',
  success: 'text-green-700 bg-green-50'
};

const DebugLogsAdmin: React.FC = () => {
  const { user } = useUser();
  const [rows, setRows] = useState<DebugLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    user_email: '',
    level: '' as '' | DebugLogRow['level'],
    date_from: '',
    date_to: ''
  });
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [auto, setAuto] = useState(true);
  const [live, setLive] = useState(false);
  const channelRef = useRef<any>(null);

  const isSuperAdmin = user?.role === UserRole.SuperAdmin || user?.role === UserRole.Admin;

  const canSee = isSuperAdmin;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se a tabela existe
      const { error: tableErr } = await supabase.from('debug_logs').select('id').limit(1);
      if (tableErr && tableErr.message.includes('does not exist')) {
        setError('Tabela debug_logs não existe. Execute o script 24_debug_logs.sql no Supabase.');
        setRows([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (filters.search) {
        query = query.or(`message.ilike.%${filters.search}%,category.ilike.%${filters.search}%`);
      }
      if (filters.user_email) {
        query = query.eq('user_email', filters.user_email);
      }
      if (filters.level) {
        query = query.eq('level', filters.level);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to + 'T23:59:59');
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      setRows(data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canSee) return;
    load();
  }, [filters, limit, offset, canSee]);

  useEffect(() => {
    if (!auto || !canSee) return;
    const id = window.setInterval(() => load(), 30000);
    return () => window.clearInterval(id);
  }, [auto, canSee, filters, limit, offset]);

  // Realtime live tailing
  useEffect(() => {
    if (!canSee) return;
    try {
      // Clean up any previous channel
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }

      if (!live) return; // Only attach when live enabled

      const channel = (supabase as any).channel('debug_logs_live');
      channelRef.current = channel;

      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'debug_logs' },
        (payload: any) => {
          const row = payload?.new as DebugLogRow;
          if (!row) return;
          // Apply current filters client-side
          if (filters.search) {
            const s = filters.search.toLowerCase();
            const match = (row.message || '').toLowerCase().includes(s) || (row.category || '').toLowerCase().includes(s);
            if (!match) return;
          }
          if (filters.user_email && row.user_email !== filters.user_email) return;
          if (filters.level && row.level !== filters.level) return;
          if (filters.date_from && row.created_at < filters.date_from) return;
          if (filters.date_to && row.created_at > filters.date_to + 'T23:59:59') return;

          // Prepend new rows, keep virtual window similar to current page size
          setRows(prev => [row, ...prev].slice(0, limit));
        }
      );

      channel.subscribe((status: string) => {
        // no-op; could expose status if needed
      });

      return () => {
        try { if (channelRef.current) supabase.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      };
    } catch {
      // ignore realtime failures silently
    }
  }, [canSee, live, JSON.stringify(filters), limit]);

  const levelBadge = (lvl: DebugLogRow['level']) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${levelColors[lvl] || 'bg-gray-50 text-gray-700'}`}>{lvl}</span>
  );

  if (!canSee) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 text-lg font-semibold">🚫 Acesso Negado</div>
        <p className="text-gray-600">Apenas Admins podem acessar esta funcionalidade.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">📝 Logs Persistidos</h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto (30s)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} /> Live (Realtime)
          </label>
          <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Atualizar</button>
        </div>
      </div>

      <div className="bg-white p-3 rounded border mb-4 grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
        <input className="border rounded px-2 py-1" placeholder="Buscar..." value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} />
        <input className="border rounded px-2 py-1" placeholder="Email" value={filters.user_email} onChange={e => setFilters(prev => ({ ...prev, user_email: e.target.value }))} />
        <select className="border rounded px-2 py-1" value={filters.level} onChange={e => setFilters(prev => ({ ...prev, level: e.target.value as any }))}>
          <option value="">Nível</option>
          <option value="error">error</option>
          <option value="warn">warn</option>
          <option value="info">info</option>
          <option value="debug">debug</option>
          <option value="success">success</option>
        </select>
        <input type="date" className="border rounded px-2 py-1" value={filters.date_from} onChange={e => setFilters(prev => ({ ...prev, date_from: e.target.value }))} />
        <input type="date" className="border rounded px-2 py-1" value={filters.date_to} onChange={e => setFilters(prev => ({ ...prev, date_to: e.target.value }))} />
        <div className="flex items-center gap-2">
          <select className="border rounded px-2 py-1" value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setOffset(0); }}>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <button className="px-2 py-1 border rounded" onClick={() => { setFilters({ search: '', user_email: '', level: '', date_from: '', date_to: '' }); setOffset(0); }}>Limpar</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><LoadingSpinner /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">{error}</div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Nível</th>
                  <th className="px-4 py-2 text-left">Usuário</th>
                  <th className="px-4 py-2 text-left">Categoria</th>
                  <th className="px-4 py-2 text-left">Mensagem</th>
                  <th className="px-4 py-2 text-left">URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600">{new Date(row.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{levelBadge(row.level)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-gray-900">{row.user_email || 'N/A'}</div>
                      <div className="text-gray-500 text-xs">{row.user_role || ''}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">{row.category}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900 truncate max-w-xs" title={row.message}>{row.message}</div>
                      {row.data && (
                        <details className="text-xs text-gray-600 mt-1">
                          <summary className="cursor-pointer">Dados</summary>
                          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(row.data, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-600 max-w-xs truncate" title={row.url}>{row.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginação simples */}
      <div className="flex items-center justify-between mt-3 text-sm">
        <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>Anterior</button>
        <div>Offset: {offset}</div>
        <button className="px-3 py-1 border rounded" onClick={() => setOffset(o => o + limit)}>Próximo</button>
      </div>
    </div>
  );
};

export default DebugLogsAdmin;



