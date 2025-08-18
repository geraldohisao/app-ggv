import React, { useEffect, useState } from 'react';

const API_BASE = (import.meta as any)?.env?.VITE_CALLS_API_BASE || 'https://app.grupoggv.com/api';

export default function CallsList() {
  const [data, setData] = useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/calls`);
        if (!res.ok) throw new Error('API offline');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Chamadas</h1>
        <span className="text-xs text-slate-500">API: {API_BASE}</span>
      </div>
      {loading && <div>Carregando...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr className="text-left text-sm text-slate-600 border-b">
              <th className="p-3">ProviderCallId</th>
              <th className="p-3">De</th>
              <th className="p-3">Para</th>
              <th className="p-3">Agente</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id} className="border-b hover:bg-slate-50">
                <td className="p-3">{c.providerCallId}</td>
                <td className="p-3">{c.from}</td>
                <td className="p-3">{c.to}</td>
                <td className="p-3">{c.agentId}</td>
                <td className="p-3">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
