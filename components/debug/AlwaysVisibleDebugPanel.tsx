import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../contexts/DirectUserContext';

interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  source: string;
  message: string;
  data?: any;
}

/**
 * 🛡️ PAINEL DEBUG SEMPRE VISÍVEL
 * 
 * Características:
 * - SEMPRE renderiza (não depende de permissões)
 * - Ativação por URL (?debug=true)
 * - Senha master para bypass
 * - Logs persistentes no localStorage
 * - Atalhos de teclado múltiplos
 * - Interface compacta e eficiente
 */
export const AlwaysVisibleDebugPanel: React.FC = () => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 🔐 SENHA MASTER para bypass (pode ser alterada)
  const MASTER_PASSWORD = 'ggv2024debug';

  // 📊 Adicionar log com persistência
  const addLog = (level: DebugLog['level'], source: string, message: string, data?: any) => {
    const newLog: DebugLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      level,
      source,
      message,
      data
    };

    setLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 500); // Máximo 500 logs
      // 💾 Salvar no localStorage
      try {
        localStorage.setItem('debug_logs', JSON.stringify(updated));
      } catch (error) {
        console.warn('Erro ao salvar logs:', error);
      }
      return updated;
    });

    // Auto-scroll para o final
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // 🔄 Carregar logs do localStorage
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('debug_logs');
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs);
        setLogs(Array.isArray(parsed) ? parsed.slice(0, 500) : []);
      }
    } catch (error) {
      console.warn('Erro ao carregar logs salvos:', error);
    }
  }, []);

  // 🎯 Verificar ativação por URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    const adminParam = urlParams.get('admin');
    
    if (debugParam === 'true' || adminParam === 'true') {
      setIsVisible(true);
      setIsAuthenticated(true);
      addLog('success', 'System', 'Debug ativado via URL');
    }

    // Verificar se usuário tem permissões
    if (user?.role === 'SuperAdmin' || user?.role === 'Admin') {
      setIsAuthenticated(true);
      addLog('info', 'Auth', `Acesso autorizado: ${user.role}`);
    }
  }, [user]);

  // ⌨️ Atalhos de teclado múltiplos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+D (principal)
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        addLog('debug', 'Keyboard', 'Toggle via Ctrl+Shift+D');
      }
      
      // Ctrl+Alt+D (alternativo)
      if (e.ctrlKey && e.altKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        addLog('debug', 'Keyboard', 'Toggle via Ctrl+Alt+D');
      }

      // F12 + D (para quando F12 não abre DevTools)
      if (e.key === 'F12') {
        setTimeout(() => {
          const handleDKey = (event: KeyboardEvent) => {
            if (event.key === 'D' || event.key === 'd') {
              setIsVisible(prev => !prev);
              addLog('debug', 'Keyboard', 'Toggle via F12+D');
              document.removeEventListener('keydown', handleDKey);
            }
          };
          document.addEventListener('keydown', handleDKey);
          setTimeout(() => document.removeEventListener('keydown', handleDKey), 2000);
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 🎯 Capturar erros globais
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addLog('error', 'Global', `${event.message} at ${event.filename}:${event.lineno}`, {
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', 'Promise', `Unhandled rejection: ${event.reason}`, event.reason);
    };

    // Interceptar console.error
    const originalError = console.error;
    console.error = (...args) => {
      addLog('error', 'Console', args.join(' '), args);
      originalError.apply(console, args);
    };

    // Interceptar console.warn
    const originalWarn = console.warn;
    console.warn = (...args) => {
      addLog('warn', 'Console', args.join(' '), args);
      originalWarn.apply(console, args);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Log inicial
    addLog('success', 'System', 'Debug Panel inicializado');

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // 🔐 Verificar senha master
  const checkPassword = () => {
    if (passwordInput === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      setShowPasswordPrompt(false);
      setPasswordInput('');
      addLog('success', 'Auth', 'Acesso autorizado via senha master');
    } else {
      addLog('warn', 'Auth', 'Senha incorreta');
      setPasswordInput('');
    }
  };

  // 📤 Exportar logs
  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addLog('info', 'Export', `${logs.length} logs exportados`);
  };

  // 🧹 Limpar logs
  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('debug_logs');
    addLog('info', 'System', 'Logs limpos');
  };

  // 📊 Filtrar logs
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  // 🎯 SEMPRE renderizar indicador (pequeno ícone no canto)
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        {/* Indicador de status sempre visível */}
        <div className="flex flex-col items-end gap-2">
          {/* Status do sistema */}
          <div className="bg-black bg-opacity-80 text-white px-2 py-1 rounded text-xs">
            🛡️ {user ? 'Online' : 'Offline'} | {logs.filter(l => l.level === 'error').length} erros
          </div>
          
          {/* Botão principal */}
          <button
            onClick={() => {
              if (isAuthenticated) {
                setIsVisible(true);
              } else {
                setShowPasswordPrompt(true);
              }
            }}
            className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center text-xl border-2 border-white"
            title="Debug Panel (Ctrl+Shift+D)"
          >
            🛡️
          </button>
        </div>

        {/* Prompt de senha */}
        {showPasswordPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <h3 className="text-lg font-bold mb-4">🔐 Acesso Debug</h3>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && checkPassword()}
                placeholder="Senha master..."
                className="w-full px-3 py-2 border rounded mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={checkPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPasswordInput('');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 🎛️ PAINEL PRINCIPAL
  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l-4 border-blue-600 flex flex-col z-[9999]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <h2 className="font-bold">Debug Panel Pro</h2>
              <p className="text-xs opacity-90">Sempre visível | {logs.length} logs</p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-gray-50 p-3 border-b">
        <div className="flex items-center gap-2 mb-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="all">Todos ({logs.length})</option>
            <option value="error">Erros ({logs.filter(l => l.level === 'error').length})</option>
            <option value="warn">Avisos ({logs.filter(l => l.level === 'warn').length})</option>
            <option value="info">Info ({logs.filter(l => l.level === 'info').length})</option>
          </select>
          
          <button
            onClick={exportLogs}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            📤 Export
          </button>
          
          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            🧹 Limpar
          </button>
        </div>

        {/* Informações do usuário */}
        <div className="text-xs text-gray-600">
          👤 {user?.name || 'Não logado'} | 🎯 {user?.role || 'N/A'} | ⏰ {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Nenhum log encontrado
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded text-xs border-l-4 ${
                  log.level === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                  log.level === 'warn' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                  log.level === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                  'bg-blue-50 border-blue-500 text-blue-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-gray-500">{log.timestamp}</span>
                  <span className="bg-gray-200 px-1 rounded">{log.source}</span>
                </div>
                <div className="font-medium">{log.message}</div>
                {log.data && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-gray-600">Ver dados</summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-1 rounded overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Footer com atalhos */}
      <div className="bg-gray-100 p-2 text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <div>Ctrl+Shift+D | Ctrl+Alt+D | F12+D</div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Ativo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlwaysVisibleDebugPanel;
