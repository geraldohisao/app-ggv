import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { LoadingSpinner } from '../ui/Feedback';

// ============================================================
// TYPES
// ============================================================

interface AuditEvent {
  id: number;
  created_at: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  source: 'frontend' | 'netlify' | 'db_trigger' | 'system';
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  actor_impersonated_by: string | null;
  subject_type: string | null;
  subject_id: string | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  url: string | null;
  metadata: Record<string, unknown>;
  total_count?: number;
}

interface AuditStats {
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_severity: Record<string, number>;
  events_by_source: Record<string, number>;
  top_actors: Array<{ email: string; count: number }>;
  events_by_hour: Array<{ hour: string; count: number }>;
}

interface Filters {
  search: string;
  event_type: string;
  severity: string;
  source: string;
  actor_email: string;
  subject_type: string;
  date_from: string;
  date_to: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const EVENT_TYPE_CATEGORIES: Record<string, string[]> = {
  'Autenticação': ['auth.login', 'auth.logout', 'auth.session_expired'],
  'Impersonação': ['impersonation.start', 'impersonation.stop'],
  'OKR': ['okr.created', 'okr.updated', 'okr.deleted', 'kr.created', 'kr.updated', 'kr.deleted'],
  'Sprint': ['sprint.created', 'sprint.updated', 'sprint.deleted', 'sprint.status_changed'],
  'Checkin': ['checkin.created', 'checkin.updated', 'checkin.submitted'],
  'Calendário': ['calendar.sync_started', 'calendar.sync_completed', 'calendar.sync_failed', 'calendar.event_created', 'calendar.event_updated', 'calendar.event_deleted'],
  'Usuários': ['user.role_changed', 'user.department_changed', 'user.deactivated', 'user.reactivated'],
  'Diagnóstico': ['diagnostic.started', 'diagnostic.completed', 'diagnostic.shared'],
  'Calls': ['call.analyzed', 'call.feedback_submitted'],
  'Integrações': ['integration.connected', 'integration.disconnected', 'integration.error'],
  'Admin': ['admin.settings_changed', 'admin.bulk_action'],
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

const SOURCE_COLORS: Record<string, string> = {
  frontend: 'bg-purple-100 text-purple-800',
  netlify: 'bg-green-100 text-green-800',
  db_trigger: 'bg-orange-100 text-orange-800',
  system: 'bg-gray-100 text-gray-800',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const AuditEventsAdmin: React.FC = () => {
  const { user } = useUser();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    event_type: '',
    severity: '',
    source: '',
    actor_email: '',
    subject_type: '',
    date_from: '',
    date_to: '',
  });
  const [view, setView] = useState<'events' | 'stats'>('events');
  const [auto, setAuto] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const pageSize = 50;

  const isSuperAdmin = user?.role === UserRole.SuperAdmin;
  const isAdmin = user?.role === UserRole.Admin || isSuperAdmin;

  // ============================================================
  // DATA LOADING
  // ============================================================

  const loadEvents = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      // Check if table exists
      const { error: tableError } = await supabase
        .from('audit_events')
        .select('id')
        .limit(1);

      if (tableError && tableError.message.includes('does not exist')) {
        setError('Tabela audit_events não existe. Execute o script SQL 27_audit_events.sql no Supabase Dashboard.');
        setLoading(false);
        return;
      }

      // Use RPC function for paginated query
      const { data, error: fetchError } = await supabase.rpc('get_audit_events', {
        p_page: page,
        p_limit: pageSize,
        p_event_type: filters.event_type || null,
        p_severity: filters.severity || null,
        p_source: filters.source || null,
        p_actor_email: filters.actor_email || null,
        p_subject_type: filters.subject_type || null,
        p_subject_id: null,
        p_date_from: filters.date_from ? new Date(filters.date_from).toISOString() : null,
        p_date_to: filters.date_to ? new Date(filters.date_to + 'T23:59:59').toISOString() : null,
        p_search: filters.search || null,
      });

      if (fetchError) throw fetchError;

      setEvents(data || []);
      setTotalCount(data?.[0]?.total_count || 0);
    } catch (err: any) {
      console.error('Error loading audit events:', err);
      setError(err.message || 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, filters]);

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error: fetchError } = await supabase.rpc('get_audit_stats', {
        p_hours: 24,
      });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (err: any) {
      console.error('Error loading audit stats:', err);
    }
  }, [isAdmin]);

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    if (view === 'events') {
      loadEvents();
    } else {
      loadStats();
    }
  }, [view, loadEvents, loadStats]);

  // Auto-refresh
  useEffect(() => {
    if (!auto) return;
    const interval = setInterval(() => {
      if (view === 'events') {
        loadEvents();
      } else {
        loadStats();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [auto, view, loadEvents, loadStats]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/\./g, ' › ').replace(/_/g, ' ');
  };

  const getEventTypeCategory = (eventType: string): string => {
    for (const [category, types] of Object.entries(EVENT_TYPE_CATEGORIES)) {
      if (types.includes(eventType)) {
        return category;
      }
    }
    return 'Outro';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ============================================================
  // ACCESS CHECK
  // ============================================================

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-lg font-semibold">Acesso Negado</div>
        <p className="text-gray-600 mt-2">Apenas Administradores podem acessar a auditoria.</p>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Auditoria de Eventos</h1>
        <p className="text-gray-600">Histórico de ações e alterações no sistema</p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('events')}
          className={`px-4 py-2 rounded ${view === 'events' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Eventos
        </button>
        <button
          onClick={() => setView('stats')}
          className={`px-4 py-2 rounded ${view === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Estatísticas
        </button>
      </div>

      {/* Filters */}
      {view === 'events' && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <select
              value={filters.event_type}
              onChange={(e) => setFilters(prev => ({ ...prev, event_type: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(EVENT_TYPE_CATEGORIES).map(([category, types]) => (
                <optgroup key={category} label={category}>
                  {types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">Todas severidades</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={filters.source}
              onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">Todas origens</option>
              <option value="frontend">Frontend</option>
              <option value="netlify">Netlify</option>
              <option value="db_trigger">DB Trigger</option>
              <option value="system">Sistema</option>
            </select>
            <input
              type="email"
              placeholder="Email do usuário"
              value={filters.actor_email}
              onChange={(e) => setFilters(prev => ({ ...prev, actor_email: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Tipo de subject"
              value={filters.subject_type}
              onChange={(e) => setFilters(prev => ({ ...prev, subject_type: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4 flex gap-2 items-center">
            <button
              onClick={() => setFilters({
                search: '',
                event_type: '',
                severity: '',
                source: '',
                actor_email: '',
                subject_type: '',
                date_from: '',
                date_to: '',
              })}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Limpar Filtros
            </button>
            <button
              onClick={loadEvents}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Atualizar
            </button>
            <label className="text-sm text-gray-600 flex items-center gap-2 ml-2">
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
              Auto (30s)
            </label>
            <span className="text-sm text-gray-500 ml-auto">
              {totalCount} eventos encontrados
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <div className="text-red-700 font-medium">Erro</div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Events View */}
      {!loading && !error && view === 'events' && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severidade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Nenhum evento encontrado
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(event.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {formatEventType(event.event_type)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getEventTypeCategory(event.event_type)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SEVERITY_COLORS[event.severity]}`}>
                            {event.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SOURCE_COLORS[event.source]}`}>
                            {event.source}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{event.actor_email || '—'}</div>
                          <div className="text-xs text-gray-500">{event.actor_role || ''}</div>
                          {event.actor_impersonated_by && (
                            <div className="text-xs text-amber-600">Impersonado</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {event.subject_type && (
                            <>
                              <div className="text-sm text-gray-900">{event.subject_type}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[150px]" title={event.subject_id || ''}>
                                {event.subject_id || ''}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedEvent(event)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-gray-600">
                Página {page} de {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Stats View */}
      {!loading && !error && view === 'stats' && stats && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total_events}</div>
              <div className="text-sm text-gray-600">Eventos (24h)</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600">{stats.events_by_severity?.info || 0}</div>
              <div className="text-sm text-gray-600">Info</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.events_by_severity?.warning || 0}</div>
              <div className="text-sm text-gray-600">Warning</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-red-600">{stats.events_by_severity?.critical || 0}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
          </div>

          {/* Events by Source */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Por Origem</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.events_by_source || {}).map(([source, count]) => (
                <div key={source} className="text-center">
                  <div className="text-xl font-bold text-gray-700">{count as number}</div>
                  <div className="text-sm text-gray-500">{source}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Actors */}
          {stats.top_actors && stats.top_actors.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Usuários Mais Ativos (24h)</h3>
              <ul className="space-y-2">
                {stats.top_actors.map((actor, idx) => (
                  <li key={actor.email || idx} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{actor.email}</span>
                    <span className="text-sm font-medium text-gray-900">{actor.count} eventos</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Events by Type */}
          {stats.events_by_type && Object.keys(stats.events_by_type).length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Por Tipo de Evento</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(stats.events_by_type)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 12)
                  .map(([type, count]) => (
                    <div key={type} className="text-sm">
                      <span className="text-gray-700">{type}: </span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Detalhes do Evento</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase">ID</div>
                  <div className="text-sm font-mono">{selectedEvent.id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Data</div>
                  <div className="text-sm">{formatDate(selectedEvent.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Tipo</div>
                  <div className="text-sm font-medium">{selectedEvent.event_type}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Severidade</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SEVERITY_COLORS[selectedEvent.severity]}`}>
                    {selectedEvent.severity}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Origem</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SOURCE_COLORS[selectedEvent.source]}`}>
                    {selectedEvent.source}
                  </span>
                </div>
              </div>

              {/* Actor Info */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Ator</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div>{selectedEvent.actor_email || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Role</div>
                    <div>{selectedEvent.actor_role || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">User ID</div>
                    <div className="font-mono text-xs truncate">{selectedEvent.actor_user_id || '—'}</div>
                  </div>
                  {selectedEvent.actor_impersonated_by && (
                    <div>
                      <div className="text-xs text-gray-500">Impersonado Por</div>
                      <div className="font-mono text-xs text-amber-600">{selectedEvent.actor_impersonated_by}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Info */}
              {(selectedEvent.subject_type || selectedEvent.subject_id) && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Subject</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Tipo</div>
                      <div>{selectedEvent.subject_type || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">ID</div>
                      <div className="font-mono text-xs">{selectedEvent.subject_id || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Context */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Contexto da Requisição</h4>
                <div className="space-y-2 text-sm">
                  {selectedEvent.request_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Request ID</span>
                      <span className="font-mono text-xs">{selectedEvent.request_id}</span>
                    </div>
                  )}
                  {selectedEvent.ip_address && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">IP</span>
                      <span>{selectedEvent.ip_address}</span>
                    </div>
                  )}
                  {selectedEvent.url && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">URL</span>
                      <span className="truncate max-w-xs">{selectedEvent.url}</span>
                    </div>
                  )}
                  {selectedEvent.user_agent && (
                    <div>
                      <div className="text-gray-500 mb-1">User Agent</div>
                      <div className="text-xs bg-gray-100 p-2 rounded break-all">{selectedEvent.user_agent}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Metadata</h4>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedEvent.metadata, null, 2))}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Copiar
                    </button>
                  </div>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditEventsAdmin;
