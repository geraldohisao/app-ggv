import React, { useState, useMemo } from 'react';
import { useDebugPanel, DebugLog } from '../../hooks/useDebugPanel';
import { useUser } from '../../contexts/DirectUserContext';
import { supabase } from '../../services/supabaseClient';

// Ícones simples usando Unicode
const Icons = {
  bug: '🐛',
  system: '⚙️',
  network: '🌐',
  storage: '💾',
  auth: '🔐',
  close: '✕',
  clear: '🗑️',
  export: '📤',
  filter: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  debug: '🔧',
  expand: '📋',
  minimize: '📄',
  refresh: '🔄'
};

interface DebugPanelProps {
  className?: string;
}

const LogLevelBadge: React.FC<{ level: DebugLog['level'] }> = ({ level }) => {
  const colors = {
    info: 'bg-blue-100 text-blue-800',
    warn: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    debug: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[level]}`}>
      {Icons[level]} {level.toUpperCase()}
    </span>
  );
};

const LogItem: React.FC<{ log: DebugLog; expanded: boolean; onToggle: () => void }> = ({ 
  log, 
  expanded, 
  onToggle 
}) => {
  return (
    <div className="border-b border-gray-200 py-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <LogLevelBadge level={log.level} />
            <span className="text-xs text-gray-500 font-mono">
              {log.timestamp.toLocaleTimeString()}
            </span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {log.category}
            </span>
          </div>
          <div className="text-sm text-gray-900 font-mono">
            {log.message}
          </div>
          {log.source && (
            <div className="text-xs text-gray-500 mt-1">
              📁 {log.source}
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
          title="Ver detalhes"
        >
          {expanded ? Icons.minimize : Icons.expand}
        </button>
      </div>
      
      {expanded && (log.data || log.stack) && (
        <div className="mt-2 p-3 bg-gray-50 rounded border">
          {log.data && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-gray-700 mb-1">Dados:</div>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          )}
          {log.stack && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Stack Trace:</div>
              <pre className="text-xs text-red-600 overflow-x-auto whitespace-pre-wrap">
                {log.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SystemTab: React.FC<{ metrics: any }> = ({ metrics }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-semibold text-blue-900 mb-2">{Icons.system} Memória</h4>
          <div className="text-sm space-y-1">
            <div>Usado: {formatBytes(metrics.memory.used)}</div>
            <div>Total: {formatBytes(metrics.memory.total)}</div>
            {metrics.memory.total > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(metrics.memory.used / metrics.memory.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded">
          <h4 className="font-semibold text-green-900 mb-2">{Icons.network} Rede</h4>
          <div className="text-sm space-y-1">
            <div>Status: {metrics.network.online ? '🟢 Online' : '🔴 Offline'}</div>
            {metrics.network.effectiveType && (
              <div>Tipo: {metrics.network.effectiveType}</div>
            )}
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded">
          <h4 className="font-semibold text-purple-900 mb-2">⚡ Performance</h4>
          <div className="text-sm space-y-1">
            <div>Navegação: {metrics.performance.navigation}ms</div>
            <div>Render: {Math.round(metrics.performance.render)}ms</div>
          </div>
        </div>

        <div className="bg-orange-50 p-3 rounded">
          <h4 className="font-semibold text-orange-900 mb-2">{Icons.storage} Storage</h4>
          <div className="text-sm space-y-1">
            <div>LocalStorage: {formatBytes(metrics.storage.localStorage)}</div>
            <div>SessionStorage: {formatBytes(metrics.storage.sessionStorage)}</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded">
        <h4 className="font-semibold text-gray-900 mb-2">🌍 Ambiente</h4>
        <div className="text-sm space-y-1 font-mono">
          <div>URL: {window.location.href}</div>
          <div>User Agent: {navigator.userAgent.slice(0, 80)}...</div>
          <div>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
          <div>Language: {navigator.language}</div>
        </div>
      </div>
    </div>
  );
};

const AuthTab: React.FC = () => {
  const { user } = useUser();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      setSessionInfo({ session, error });
    } catch (err) {
      setSessionInfo({ error: err });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    checkSession();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{Icons.auth} Autenticação</h3>
        <button
          onClick={checkSession}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '⏳' : Icons.refresh} Atualizar
        </button>
      </div>

      <div className="grid gap-4">
        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-semibold text-blue-900 mb-2">👤 Usuário Atual</h4>
          <div className="text-sm space-y-1">
            <div>Status: {user ? '🟢 Logado' : '🔴 Não logado'}</div>
            {user && (
              <>
                <div>Email: {user.email}</div>
                <div>ID: {user.id}</div>
              </>
            )}
          </div>
        </div>

        {sessionInfo?.session && (
          <div className="bg-green-50 p-3 rounded">
            <h4 className="font-semibold text-green-900 mb-2">🎫 Sessão Ativa</h4>
            <div className="text-sm space-y-1 font-mono">
              <div>Access Token: {sessionInfo.session.access_token?.slice(0, 20)}...</div>
              <div>Refresh Token: {sessionInfo.session.refresh_token?.slice(0, 20)}...</div>
              <div>Expira em: {new Date(sessionInfo.session.expires_at * 1000).toLocaleString()}</div>
            </div>
          </div>
        )}

        {sessionInfo?.error && (
          <div className="bg-red-50 p-3 rounded">
            <h4 className="font-semibold text-red-900 mb-2">❌ Erro de Sessão</h4>
            <pre className="text-sm text-red-700 whitespace-pre-wrap">
              {JSON.stringify(sessionInfo.error, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-semibold text-gray-900 mb-2">🔧 Diagnóstico Rápido</h4>
          <div className="space-y-2">
            <button
              onClick={() => {
                console.log('🔍 URL atual:', window.location.href);
                console.log('🔍 LocalStorage keys:', Object.keys(localStorage).filter(k => k.includes('supabase')));
              }}
              className="w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              🔍 Log URL e Storage
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full px-3 py-2 bg-red-200 hover:bg-red-300 rounded text-sm text-red-800"
            >
              🗑️ Limpar Storage e Recarregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DebugPanel: React.FC<DebugPanelProps> = ({ className = '' }) => {
  const {
    isVisible,
    activeTab,
    filteredLogs,
    filters,
    metrics,
    togglePanel,
    setActiveTab,
    updateFilters,
    clearLogs,
    exportLogs
  } = useDebugPanel();

  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const logCategories = useMemo(() => {
    const categories = new Set(filteredLogs.map(log => log.category));
    return Array.from(categories).sort();
  }, [filteredLogs]);

  if (!isVisible) {
    return (
      <button
        onClick={togglePanel}
        className="fixed bottom-4 right-4 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 z-50 flex items-center justify-center text-xl"
        title="Abrir painel de debug (Ctrl+Shift+D)"
      >
        {Icons.bug}
      </button>
    );
  }

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{Icons.bug}</span>
          <h2 className="font-semibold text-gray-900">Debug Panel</h2>
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
            {filteredLogs.length} logs
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? Icons.expand : Icons.minimize}
          </button>
          <button
            onClick={togglePanel}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Fechar painel"
          >
            {Icons.close}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {[
              { key: 'logs', label: 'Logs', icon: Icons.bug },
              { key: 'system', label: 'Sistema', icon: Icons.system },
              { key: 'auth', label: 'Auth', icon: Icons.auth }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'logs' && (
              <div className="h-full flex flex-col">
                {/* Filters */}
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Buscar logs..."
                      value={filters.search}
                      onChange={(e) => updateFilters({ search: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={clearLogs}
                      className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      title="Limpar todos os logs"
                    >
                      {Icons.clear}
                    </button>
                    <button
                      onClick={exportLogs}
                      className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      title="Exportar logs"
                    >
                      {Icons.export}
                    </button>
                  </div>
                  
                  {/* Level filters */}
                  <div className="flex gap-1 mb-2">
                    {['info', 'warn', 'error', 'debug'].map(level => (
                      <button
                        key={level}
                        onClick={() => {
                          const newLevels = filters.level.includes(level)
                            ? filters.level.filter(l => l !== level)
                            : [...filters.level, level];
                          updateFilters({ level: newLevels });
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          filters.level.includes(level)
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {Icons[level as keyof typeof Icons]} {level}
                      </button>
                    ))}
                  </div>

                  {/* Category filter */}
                  {logCategories.length > 0 && (
                    <select
                      value={filters.category[0] || ''}
                      onChange={(e) => updateFilters({ 
                        category: e.target.value ? [e.target.value] : [] 
                      })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Todas as categorias</option>
                      {logCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Logs list */}
                <div className="flex-1 overflow-y-auto p-3">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-2xl mb-2">📝</div>
                      <div>Nenhum log encontrado</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredLogs.slice().reverse().map(log => (
                        <LogItem
                          key={log.id}
                          log={log}
                          expanded={expandedLogs.has(log.id)}
                          onToggle={() => toggleLogExpansion(log.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="h-full overflow-y-auto p-3">
                <SystemTab metrics={metrics} />
              </div>
            )}

            {activeTab === 'auth' && (
              <div className="h-full overflow-y-auto p-3">
                <AuthTab />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            <div className="flex justify-between items-center">
              <div>Ctrl+Shift+D: Toggle | Ctrl+Shift+C: Clear | Ctrl+Shift+E: Export</div>
              <div>{new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DebugPanel;
