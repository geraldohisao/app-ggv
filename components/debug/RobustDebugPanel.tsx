import React, { useState, useEffect, useRef } from 'react';

interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export const RobustDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const logIdCounter = useRef(0);

  // Função para adicionar log de forma segura
  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    try {
      const newLog: DebugLog = {
        id: `log-${Date.now()}-${++logIdCounter.current}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        data
      };

      setLogs(prev => {
        const newLogs = [...prev, newLog];
        // Manter apenas os últimos 100 logs
        return newLogs.slice(-100);
      });
    } catch (error) {
      console.error('Erro ao adicionar log:', error);
    }
  };

  // Configurar captura de erros e logs
  useEffect(() => {
    let mounted = true;

    try {
      // Log inicial
      addLog('info', '🚀 Sistema de debug iniciado');

      // Capturar erros globais
      const handleError = (event: ErrorEvent) => {
        if (!mounted) return;
        addLog('error', `Erro JavaScript: ${event.message}`, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      };

      // Capturar promises rejeitadas
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        if (!mounted) return;
        addLog('error', `Promise rejeitada: ${event.reason}`, { reason: event.reason });
      };

      // Interceptar console (de forma segura)
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug
      };

      const createConsoleWrapper = (level: DebugLog['level'], originalMethod: any) => {
        return (...args: any[]) => {
          if (!mounted) return originalMethod.apply(console, args);
          
          try {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            
            // Evitar loop infinito
            if (!message.includes('[DEBUG-PANEL]')) {
              addLog(level, message, args.length === 1 ? args[0] : args);
            }
          } catch (e) {
            // Falha silenciosa para evitar problemas
          }
          
          return originalMethod.apply(console, args);
        };
      };

      console.log = createConsoleWrapper('info', originalConsole.log);
      console.warn = createConsoleWrapper('warn', originalConsole.warn);
      console.error = createConsoleWrapper('error', originalConsole.error);
      console.debug = createConsoleWrapper('debug', originalConsole.debug);

      // Função global
      (window as any).debugLog = (message: string, level: DebugLog['level'] = 'debug', data?: any) => {
        if (mounted) {
          addLog(level, message, data);
        }
      };

      // Atalhos de teclado
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          setIsVisible(prev => !prev);
          addLog('debug', 'Painel de debug toggled via atalho');
        }
      };

      // Registrar event listeners
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('keydown', handleKeyPress);

      // Cleanup
      return () => {
        mounted = false;
        
        try {
          // Restaurar console
          console.log = originalConsole.log;
          console.warn = originalConsole.warn;
          console.error = originalConsole.error;
          console.debug = originalConsole.debug;

          // Remover listeners
          window.removeEventListener('error', handleError);
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
          window.removeEventListener('keydown', handleKeyPress);
        } catch (error) {
          // Falha silenciosa
        }
      };
    } catch (error) {
      console.error('[DEBUG-PANEL] Erro na inicialização:', error);
    }
  }, []);

  // Render do botão flutuante
  if (!isVisible) {
    return (
      <button
        onClick={() => {
          setIsVisible(true);
          addLog('debug', 'Painel aberto via clique');
        }}
        className="fixed bottom-4 right-4 w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-50 flex items-center justify-center text-xl"
        title="Debug Panel (Ctrl+Shift+D)"
        style={{ zIndex: 9999 }}
      >
        🐛
      </button>
    );
  }

  // Render do painel
  return (
    <div 
      className="fixed inset-y-0 right-0 bg-white shadow-2xl border-l border-gray-200 flex flex-col"
      style={{ 
        width: isMinimized ? '60px' : '400px',
        zIndex: 9999,
        transition: 'width 0.3s ease-in-out'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        {!isMinimized && (
          <div className="flex items-center gap-2">
            <span className="text-lg">🐛</span>
            <h2 className="font-semibold text-gray-900">Debug Panel</h2>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {logs.length}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? '📖' : '📄'}
          </button>
          <button
            onClick={() => {
              setIsVisible(false);
              addLog('debug', 'Painel fechado');
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content (só mostra se não minimizado) */}
      {!isMinimized && (
        <>
          {/* Controls */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setLogs([]);
                  addLog('debug', 'Logs limpos');
                }}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                🗑️ Limpar
              </button>
              <button
                onClick={() => {
                  addLog('debug', 'Teste manual do sistema', { timestamp: new Date() });
                }}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                🧪 Teste
              </button>
              <button
                onClick={() => {
                  const data = {
                    timestamp: new Date().toISOString(),
                    logs,
                    url: window.location.href,
                    userAgent: navigator.userAgent
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `debug-logs-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  addLog('info', 'Logs exportados');
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                📤 Exportar
              </button>
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-3">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-2xl mb-2">📝</div>
                <div>Nenhum log ainda</div>
                <div className="text-xs mt-2">Use Ctrl+Shift+D para toggle</div>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice().reverse().map(log => (
                  <div 
                    key={log.id} 
                    className={`p-2 rounded text-xs border-l-4 ${
                      log.level === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                      log.level === 'warn' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                      log.level === 'debug' ? 'bg-gray-50 border-gray-500 text-gray-800' :
                      'bg-blue-50 border-blue-500 text-blue-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-xs text-gray-500 mb-1">
                          {log.timestamp} - {log.level.toUpperCase()}
                        </div>
                        <div className="font-medium">{log.message}</div>
                        {log.data && (
                          <pre className="mt-1 text-xs overflow-x-auto bg-white bg-opacity-50 p-1 rounded">
                            {JSON.stringify(log.data, null, 2).slice(0, 200)}
                            {JSON.stringify(log.data, null, 2).length > 200 ? '...' : ''}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            <div className="flex justify-between items-center">
              <div>Sistema: {navigator.onLine ? '🟢 Online' : '🔴 Offline'}</div>
              <div>Logs: {logs.length}/100</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RobustDebugPanel;
