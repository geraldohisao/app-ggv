import React, { useState, useEffect } from 'react';

interface SimpleDebugPanelProps {
  className?: string;
}

export const SimpleDebugPanel: React.FC<SimpleDebugPanelProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Toggle com Ctrl+Shift+D
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Capturar erros globais
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMsg = `ERROR: ${event.message} (${event.filename}:${event.lineno})`;
      setLogs(prev => [...prev.slice(-9), errorMsg]);
      console.error('🐛 [DEBUG] Erro capturado:', event);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMsg = `PROMISE REJECTION: ${event.reason}`;
      setLogs(prev => [...prev.slice(-9), errorMsg]);
      console.error('🐛 [DEBUG] Promise rejeitada:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Função global simples
    (window as any).debugLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const logMsg = `${timestamp}: ${message}`;
      setLogs(prev => [...prev.slice(-9), logMsg]);
      console.log('🐛 [DEBUG]', message);
    };

    // Log inicial
    setLogs(['Sistema de debug inicializado']);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 z-50 flex items-center justify-center text-xl"
        title="Abrir debug (Ctrl+Shift+D)"
      >
        🐛
      </button>
    );
  }

  return (
    <div className={`fixed top-0 right-0 w-80 h-full bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-red-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐛</span>
          <h2 className="font-semibold text-gray-900">Debug Simples</h2>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Fechar"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <button
            onClick={() => setLogs([])}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Limpar Logs
          </button>
          <button
            onClick={() => {
              (window as any).debugLog('Teste manual do sistema');
            }}
            className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Teste
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Logs ({logs.length})</h3>
          {logs.length === 0 ? (
            <div className="text-gray-500 text-sm">Nenhum log ainda</div>
          ) : (
            <div className="space-y-1 text-xs font-mono bg-gray-100 p-2 rounded max-h-60 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="font-semibold">Informações do Sistema</h3>
          <div className="text-xs space-y-1 bg-gray-100 p-2 rounded">
            <div>URL: {window.location.href}</div>
            <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
            <div>Online: {navigator.onLine ? '✅' : '❌'}</div>
            <div>Timestamp: {new Date().toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Testes</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                throw new Error('Teste de erro intencional');
              }}
              className="w-full px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Gerar Erro de Teste
            </button>
            <button
              onClick={() => {
                Promise.reject('Teste de promise rejection');
              }}
              className="w-full px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
            >
              Gerar Promise Rejection
            </button>
            <button
              onClick={() => {
                console.log('Teste de console.log');
                console.warn('Teste de console.warn');
                console.error('Teste de console.error');
              }}
              className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Testar Console Logs
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
        Ctrl+Shift+D para toggle
      </div>
    </div>
  );
};

export default SimpleDebugPanel;
