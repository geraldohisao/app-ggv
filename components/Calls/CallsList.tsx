import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface Call {
  id: string;
  provider_call_id: string;
  from_number: string;
  to_number: string;
  agent_id: string;
  sdr_name?: string;
  company?: string;
  deal_id?: string;
  status: string;
  status_voip?: string;
  status_voip_friendly?: string;
  duration: number;
  call_type?: string;
  direction?: string;
  created_at: string;
  total_count: number;
}

export default function CallsList() {
  const [data, setData] = useState<{ items: Call[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const IS_UNDER_DEVELOPMENT = (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    typeof (import.meta as any).env.VITE_CALLS_UNDER_DEV !== 'undefined'
  ) ? ((import.meta as any).env.VITE_CALLS_UNDER_DEV === 'true') : false; // DESATIVADO: false = produção ativa

  useEffect(() => {
    if (IS_UNDER_DEVELOPMENT) {
      // Evita chamadas ao backend enquanto a seção estiver em desenvolvimento
      return;
    }
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!supabase) {
          throw new Error('Supabase não inicializado');
        }

        // Usar a MESMA função que funciona no gráfico
        const { data: callsData, error: callsError } = await supabase
          .rpc('get_calls_with_filters', {
            p_sdr: null,
            p_status: null,
            p_type: null,
            p_start_date: null,
            p_end_date: null,
            p_limit: 500,
            p_offset: 0,
            p_sort_by: 'created_at',
            p_min_duration: null,
            p_max_duration: null,
            p_min_score: null
          });

        if (callsError) {
          throw new Error(`Erro ao buscar calls: ${callsError.message}`);
        }

        const items = (callsData || []).map((call: any) => ({
          id: call.id,
          provider_call_id: call.provider_call_id || call.id,
          from_number: call.from_number,
          to_number: call.to_number,
          agent_id: call.agent_id,
          sdr_name: call.sdr_name,
          company: call.company || call.deal_id || 'Empresa não informada',
          deal_id: call.deal_id,
          status: call.status,
          status_voip: call.status_voip,
          status_voip_friendly: call.status_voip_friendly || call.status,
          duration: call.duration || 0,
          call_type: call.call_type,
          direction: call.direction,
          created_at: call.created_at,
          total_count: call.total_count || callsData.length
        }));
        
        const total = items.length > 0 ? items[0].total_count : 0;

        setData({ items, total });
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
        <div className="text-xs text-slate-500">
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Em desenvolvimento</span>
          <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded">Supabase</span>
          <span className="ml-2">Total: {data.total}</span>
        </div>
      </div>
      {IS_UNDER_DEVELOPMENT && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
          <strong>Em desenvolvimento:</strong> Estamos construindo a seção de chamadas. Em breve você verá os dados reais aqui.
        </div>
      )}
      
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-600">Carregando chamadas...</div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Erro:</strong> {error}
        </div>
      )}
      
      {!loading && !error && !IS_UNDER_DEVELOPMENT && (
        <>
          {data.items.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>Nenhuma chamada encontrada.</p>
              <p className="text-sm mt-2">As chamadas aparecerão aqui quando forem processadas.</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-slate-600 border-b">
                    <th className="p-4 font-medium">Empresa</th>
                    <th className="p-4 font-medium">SDR</th>
                    <th className="p-4 font-medium">Tipo</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Duração</th>
                    <th className="p-4 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((call) => (
                    <tr key={call.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{call.company}</div>
                        {call.deal_id && <div className="text-xs text-slate-500">Deal: {call.deal_id}</div>}
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{call.sdr_name || call.agent_id || '-'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          call.call_type === 'prospeccao' ? 'bg-blue-100 text-blue-800' :
                          call.call_type === 'follow_up' ? 'bg-yellow-100 text-yellow-800' :
                          call.call_type === 'demo' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {call.call_type || call.direction || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          call.status === 'processed' ? 'bg-green-100 text-green-800' :
                          call.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          call.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {call.status_voip_friendly || call.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {call.duration > 0 ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '-'}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {new Date(call.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
