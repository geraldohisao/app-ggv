import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { LoadingSpinner } from '../ui/Feedback';
import IncidentChart from './IncidentChart';

interface ErrorEvent {
  id: number;
  created_at: string;
  incident_hash: string;
  title: string;
  message: string;
  url: string;
  user_email: string;
  user_role: string;
  user_agent: string;
  app_version: string;
  stack: string;
  component_stack: string;
  status_code: number;
  context: any;
}

interface IncidentGroup {
  incident_hash: string;
  title: string;
  count: number;
  first_occurrence: string;
  last_occurrence: string;
  users_affected: string[];
}

export const ErrorEventsAdmin: React.FC = () => {
  const { user } = useUser();
  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [incidents, setIncidents] = useState<IncidentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    user_email: '',
    incident_hash: '',
    date_from: '',
    date_to: ''
  });
  const [view, setView] = useState<'events' | 'incidents' | 'chart'>('incidents');
  const [auto, setAuto] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const isSuperAdmin = user?.role === UserRole.SuperAdmin;

  if (!isSuperAdmin) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 text-lg font-semibold">🚫 Acesso Negado</div>
        <p className="text-gray-600">Apenas Super Admins podem acessar esta funcionalidade.</p>
      </div>
    );
  }

  const loadIncidents = async () => {
    try {
    setLoading(true);
    setError(null);

    // Verificar se a tabela existe primeiro
    const { data: tableCheck, error: tableError } = await supabase
      .from('error_events')
      .select('id')
      .limit(1);

    if (tableError && tableError.message.includes('does not exist')) {
      setError('Tabela error_events não existe. Execute o script SQL no Supabase Dashboard.');
      setLoading(false);
      return;
    }

    let query = supabase
      .from('error_events')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
    }
    if (filters.user_email) {
      query = query.eq('user_email', filters.user_email);
    }
    if (filters.incident_hash) {
      query = query.eq('incident_hash', filters.incident_hash);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to + 'T23:59:59');
    }

    const { data, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (view === 'incidents') {
      // Group by incident_hash
      const grouped = data.reduce((acc: Record<string, IncidentGroup>, event: ErrorEvent) => {
        if (!acc[event.incident_hash]) {
          acc[event.incident_hash] = {
            incident_hash: event.incident_hash,
            title: event.title,
            count: 0,
            first_occurrence: event.created_at,
            last_occurrence: event.created_at,
            users_affected: []
          };
        }
        acc[event.incident_hash].count++;
        if (event.created_at < acc[event.incident_hash].first_occurrence) {
          acc[event.incident_hash].first_occurrence = event.created_at;
        }
        if (event.created_at > acc[event.incident_hash].last_occurrence) {
          acc[event.incident_hash].last_occurrence = event.created_at;
        }
        if (event.user_email && !acc[event.incident_hash].users_affected.includes(event.user_email)) {
          acc[event.incident_hash].users_affected.push(event.user_email);
        }
        return acc;
      }, {});

      setIncidents(Object.values(grouped));
    } else if (view === 'chart') {
      // Prepare chart data - group by date
      const dailyData = data.reduce((acc: Record<string, number>, event: ErrorEvent) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const chartDataArray = Object.entries(dailyData)
        .map(([date, count]) => ({
          date,
          count,
          severity: count >= 10 ? 'critical' : count >= 5 ? 'high' : count >= 2 ? 'medium' : 'low'
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Last 7 days

      setChartData(chartDataArray);
    } else {
      setEvents(data);
    }

    setTotalPages(Math.ceil(data.length / 20));
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadIncidents();
  }, [view, filters, page]);

  // Auto-refresh leve a cada 30s
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(loadIncidents, 30000);
    return () => window.clearInterval(id);
  }, [auto, view, filters, page]);

  const getSeverityColor = (count: number) => {
    if (count >= 10) return 'text-red-600 bg-red-50';
    if (count >= 5) return 'text-orange-600 bg-orange-50';
    if (count >= 2) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">📊 Admin de Incidentes</h1>
        <p className="text-gray-600">Gerencie e analise incidentes de erro da aplicação</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Buscar por título ou mensagem..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="email"
            placeholder="Email do usuário"
            value={filters.user_email}
            onChange={(e) => setFilters(prev => ({ ...prev, user_email: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Hash do incidente"
            value={filters.incident_hash}
            onChange={(e) => setFilters(prev => ({ ...prev, incident_hash: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
            className="border rounded px-3 py-2"
          />
        </div>
        <div className="mt-4 flex gap-2 items-center">
          <button
            onClick={() => setFilters({ search: '', user_email: '', incident_hash: '', date_from: '', date_to: '' })}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Limpar Filtros
          </button>
          <button
            onClick={loadIncidents}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Atualizar
          </button>
          <label className="text-sm text-gray-600 flex items-center gap-2 ml-2">
            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto (30s)
          </label>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('incidents')}
          className={`px-4 py-2 rounded ${view === 'incidents' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          📊 Incidentes Agrupados
        </button>
        <button
          onClick={() => setView('events')}
          className={`px-4 py-2 rounded ${view === 'events' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          📝 Eventos Individuais
        </button>
        <button
          onClick={() => setView('chart')}
          className={`px-4 py-2 rounded ${view === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          📈 Gráfico
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <div className="mb-4">
            <strong>Erro:</strong> {error}
          </div>
          {error.includes('does not exist') && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <h4 className="font-semibold text-blue-800 mb-2">🔧 Como resolver:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Acesse o <a href="https://supabase.com/dashboard" target="_blank" className="underline">Supabase Dashboard</a></li>
                <li>2. Vá para SQL Editor</li>
                <li>3. Execute o script: <code className="bg-blue-100 px-1 rounded">create-error-events-table.sql</code></li>
                <li>4. Clique em "Atualizar" aqui</li>
              </ol>
              <button
                onClick={() => {
                  const script = `-- Copie e cole este script no SQL Editor do Supabase:
CREATE TABLE IF NOT EXISTS public.error_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  incident_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  url TEXT,
  user_email TEXT,
  user_role TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  app_version TEXT,
  stack TEXT,
  component_stack TEXT,
  status_code INTEGER,
  context JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_error_events_created_at ON public.error_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_incident_hash ON public.error_events (incident_hash);
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert error events" ON public.error_events;
CREATE POLICY "Users can insert error events" ON public.error_events
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own error events" ON public.error_events;
CREATE POLICY "Users can view own error events" ON public.error_events
  FOR SELECT USING (
    (auth.uid() = user_id) OR public.is_admin() OR 
    (current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_email
  );

GRANT INSERT, SELECT, UPDATE, DELETE ON public.error_events TO service_role;
GRANT USAGE ON SEQUENCE public.error_events_id_seq TO service_role;`;
                  
                  navigator.clipboard.writeText(script);
                  alert('Script copiado! Cole no SQL Editor do Supabase.');
                }}
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                📋 Copiar Script SQL
              </button>
            </div>
          )}
        </div>
      ) : view === 'incidents' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incidente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ocorrências
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primeira
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuários Afetados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incidents.map((incident) => (
                  <tr key={incident.incident_hash} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {incident.incident_hash}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{incident.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(incident.count)}`}>
                        {incident.count}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(incident.first_occurrence)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(incident.last_occurrence)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {incident.users_affected.slice(0, 3).join(', ')}
                        {incident.users_affected.length > 3 && ` +${incident.users_affected.length - 3}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedIncident(incident.incident_hash)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => copyToClipboard(incident.incident_hash)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Copiar hash"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(event.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{event.user_email || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{event.user_role || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{event.message}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="truncate max-w-xs">{event.url}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(event, null, 2))}
                        className="text-gray-600 hover:text-gray-900"
                        title="Copiar dados completos"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart View */}
      {view === 'chart' && (
        <div className="space-y-6">
          <IncidentChart data={chartData} title="Incidentes nos Últimos 7 Dias" />
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-800 mb-4">📊 Resumo Estatístico</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{incidents.length}</div>
                <div className="text-sm text-gray-600">Tipos de Incidente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{events.length}</div>
                <div className="text-sm text-gray-600">Total de Eventos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {incidents.length > 0 ? Math.round(events.length / incidents.length) : 0}
                </div>
                <div className="text-sm text-gray-600">Média por Incidente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {incidents.filter(i => i.count >= 5).length}
                </div>
                <div className="text-sm text-gray-600">Incidentes Críticos</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incident Details Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Detalhes do Incidente: {selectedIncident}</h2>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <IncidentDetails incidentHash={selectedIncident} />
          </div>
        </div>
      )}
    </div>
  );
};

const IncidentDetails: React.FC<{ incidentHash: string }> = ({ incidentHash }) => {
  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('error_events')
          .select('*')
          .eq('incident_hash', incidentHash)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } catch (err: any) {
        console.error('Error loading incident details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [incidentHash]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="border rounded p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">{event.title}</h3>
              <p className="text-sm text-gray-600">{event.user_email} - {new Date(event.created_at).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-sm mb-2">{event.message}</p>
          {event.stack && (
            <details className="text-xs">
              <summary className="cursor-pointer text-blue-600">Stack Trace</summary>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">{event.stack}</pre>
            </details>
          )}
          {event.context && (
            <details className="text-xs">
              <summary className="cursor-pointer text-blue-600">Contexto</summary>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(event.context, null, 2)}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
};

export default ErrorEventsAdmin;
