import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { getSessionInfo } from '../../utils/sessionUtils';

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: string;
  message: string;
  data?: any;
  source?: string;
}

interface SystemMetrics {
  memory: { used: number; total: number; percentage: number };
  network: { online: boolean; effectiveType?: string; downlink?: number };
  performance: { navigation: number; render: number };
  storage: { localStorage: number; sessionStorage: number };
}

interface TestResult {
  name: string;
  success: boolean;
  duration?: number;
  error?: string;
  data?: any;
  timestamp: Date;
}

export const UnifiedDebugSystem: React.FC = () => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    memory: { used: 0, total: 0, percentage: 0 },
    network: { online: navigator.onLine },
    performance: { navigation: 0, render: 0 },
    storage: { localStorage: 0, sessionStorage: 0 }
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState({
    level: ['info', 'warn', 'error', 'debug', 'success'],
    category: '',
    search: ''
  });

  const logCounter = useRef(0);
  const metricsInterval = useRef<NodeJS.Timeout>();

  // Verificar se é super admin
  const isSuperAdmin = user?.role === UserRole.SuperAdmin;

  // Função para adicionar logs
  const addLog = (level: DebugLog['level'], category: string, message: string, data?: any, source?: string) => {
    const newLog: DebugLog = {
      id: `unified-${Date.now()}-${++logCounter.current}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      source
    };
    
    setLogs(prev => [...prev.slice(-199), newLog]); // Manter últimos 200 logs
    
    // Log no console com cor baseada no nível
    const colors = {
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b', 
      error: 'color: #ef4444',
      debug: 'color: #6b7280',
      success: 'color: #10b981'
    };
    console.log(`%c[${category.toUpperCase()}] ${message}`, colors[level], data);
  };

  // Atualizar métricas do sistema
  const updateSystemMetrics = () => {
    const memInfo = (performance as any).memory;
    const memory = memInfo ? {
      used: memInfo.usedJSHeapSize || 0,
      total: memInfo.totalJSHeapSize || 0,
      percentage: memInfo.totalJSHeapSize > 0 ? (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100 : 0
    } : { used: 0, total: 0, percentage: 0 };

    const connection = (navigator as any).connection;
    const network = {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink
    };

    const perfTiming = performance.timing;
    const performanceMetrics = {
      navigation: perfTiming.loadEventEnd - perfTiming.navigationStart,
      render: perfTiming.domContentLoadedEventEnd - perfTiming.domContentLoadedEventStart
    };

    const getStorageSize = (storage: Storage) => {
      let total = 0;
      try {
        for (let key in storage) {
          if (storage.hasOwnProperty(key)) {
            total += storage[key].length + key.length;
          }
        }
      } catch (e) {
        // Falha silenciosa
      }
      return total;
    };

    const storage = {
      localStorage: getStorageSize(localStorage),
      sessionStorage: getStorageSize(sessionStorage)
    };

    setSystemMetrics({
      memory,
      network,
      performance: performanceMetrics,
      storage
    });
  };

  // Executar teste
  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const startTime = Date.now();
    addLog('info', 'Test', `Iniciando teste: ${testName}`);
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        name: testName,
        success: true,
        duration,
        data: result,
        timestamp: new Date()
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 19)]); // Manter últimos 20 resultados
      addLog('success', 'Test', `Teste ${testName} concluído (${duration}ms)`, result);
      
      return testResult;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        name: testName,
        success: false,
        duration,
        error: error.message,
        timestamp: new Date()
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 19)]);
      addLog('error', 'Test', `Teste ${testName} falhou (${duration}ms): ${error.message}`, error);
      
      return testResult;
    }
  };

  // Testes específicos
  const tests = {
    database: () => supabase.from('profiles').select('count').limit(1),
    session: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { hasSession: !!data.session };
    },
    n8n: async () => {
      const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL;
      if (!webhookUrl) throw new Error('URL do webhook N8N não configurada');
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          source: 'unified-debug-system',
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    performance: async () => {
      const startTime = performance.now();
      // Simular operação
      await new Promise(resolve => setTimeout(resolve, 100));
      return { duration: performance.now() - startTime };
    }
  };

  // Configuração inicial
  useEffect(() => {
    if (!isSuperAdmin) return;

    addLog('success', 'System', 'Sistema Unificado de Debug iniciado');
    updateSystemMetrics();

    // Configurar atualizações automáticas
    if (autoRefresh) {
      metricsInterval.current = setInterval(updateSystemMetrics, 5000);
    }

    // Capturar erros globais
    const handleError = (event: ErrorEvent) => {
      addLog('error', 'JavaScript', `${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }, event.filename);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', 'Promise', `Promise rejeitada: ${event.reason}`, { reason: event.reason });
    };

    // Atalhos de teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case 'D':
            e.preventDefault();
            setIsVisible(prev => !prev);
            addLog('debug', 'System', 'Painel toggled via Ctrl+Shift+D');
            break;
          case 'C':
            e.preventDefault();
            setLogs([]);
            addLog('debug', 'System', 'Logs limpos via Ctrl+Shift+C');
            break;
          case 'T':
            e.preventDefault();
            Object.keys(tests).forEach(testName => {
              runTest(testName, tests[testName as keyof typeof tests]);
            });
            break;
        }
      }
    };

    // Função global para debug
    (window as any).unifiedDebug = {
      log: (message: string, data?: any) => addLog('debug', 'Manual', message, data),
      info: (message: string, data?: any) => addLog('info', 'Manual', message, data),
      warn: (message: string, data?: any) => addLog('warn', 'Manual', message, data),
      error: (message: string, data?: any) => addLog('error', 'Manual', message, data),
      success: (message: string, data?: any) => addLog('success', 'Manual', message, data),
      test: (name: string, fn: () => Promise<any>) => runTest(name, fn),
      metrics: () => systemMetrics,
      export: () => {
        const data = {
          timestamp: new Date().toISOString(),
          user: user?.email,
          logs,
          testResults,
          systemMetrics,
          sessionInfo: getSessionInfo()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unified-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('success', 'Export', 'Dados exportados');
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (metricsInterval.current) {
        clearInterval(metricsInterval.current);
      }
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).unifiedDebug;
    };
  }, [isSuperAdmin, autoRefresh]);

  // Filtrar logs
  const filteredLogs = logs.filter(log => {
    const levelMatch = filters.level.includes(log.level);
    const categoryMatch = !filters.category || log.category.toLowerCase().includes(filters.category.toLowerCase());
    const searchMatch = !filters.search || 
      log.message.toLowerCase().includes(filters.search.toLowerCase()) ||
      log.category.toLowerCase().includes(filters.search.toLowerCase());
    
    return levelMatch && categoryMatch && searchMatch;
  });

  if (!isSuperAdmin) return null;

  // Botão flutuante
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-96 z-50">
        <button
          onClick={() => {
            setIsVisible(true);
            addLog('debug', 'System', 'Painel aberto via botão');
          }}
          className="w-18 h-18 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center text-2xl border-4 border-white animate-pulse"
          title="Sistema Unificado de Debug (Ctrl+Shift+D)"
        >
          🚀
        </button>
        <div className="absolute -top-12 -left-8 bg-black text-white px-3 py-1 rounded text-xs whitespace-nowrap opacity-90">
          Debug Unificado
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-y-0 right-0 bg-white shadow-2xl border-l-4 border-indigo-600 flex flex-col z-40 transition-all duration-300 ${
        isMinimized ? 'w-16' : 'w-[500px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4">
        <div className="flex items-center justify-between">
          {!isMinimized && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h2 className="font-bold text-lg">Sistema Unificado de Debug</h2>
                <p className="text-xs opacity-90">Painel completo de desenvolvimento</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              title={isMinimized ? 'Expandir' : 'Minimizar'}
            >
              {isMinimized ? '📖' : '📄'}
            </button>
            <button
              onClick={() => {
                setIsVisible(false);
                addLog('debug', 'System', 'Painel fechado');
              }}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex bg-gray-100 border-b overflow-x-auto">
            {[
              { key: 'overview', label: 'Visão Geral', icon: '📊' },
              { key: 'logs', label: 'Logs', icon: '📝' },
              { key: 'tests', label: 'Testes', icon: '🧪' },
              { key: 'system', label: 'Sistema', icon: '💻' },
              { key: 'session', label: 'Sessão', icon: '🕐' },
              { key: 'tools', label: 'Ferramentas', icon: '🛠️' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Conteúdo das abas seria implementado aqui */}
            <div className="p-4">
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-semibold mb-2">Sistema Unificado de Debug</h3>
                <p className="text-sm mb-4">Painel completo em desenvolvimento</p>
                
                {/* Quick Actions */}
                <div className="space-y-2 max-w-xs mx-auto">
                  <button
                    onClick={() => Object.keys(tests).forEach(testName => {
                      runTest(testName, tests[testName as keyof typeof tests]);
                    })}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    🚀 Executar Todos os Testes
                  </button>
                  
                  <button
                    onClick={() => {
                      setLogs([]);
                      setTestResults([]);
                      addLog('success', 'System', 'Dados limpos');
                    }}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 font-medium"
                  >
                    🗑️ Limpar Dados
                  </button>
                  
                  <button
                    onClick={() => (window as any).unifiedDebug.export()}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium"
                  >
                    📤 Exportar Debug
                  </button>
                </div>

                {/* Status */}
                <div className="mt-6 text-xs text-gray-600 space-y-1">
                  <div>Logs: {logs.length}/200</div>
                  <div>Testes: {testResults.length}/20</div>
                  <div>Usuário: {user?.email}</div>
                  <div>Auto-refresh: {autoRefresh ? '🟢' : '🔴'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t px-4 py-3">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span>Ctrl+Shift+D: Toggle</span>
                <span>Ctrl+Shift+C: Clear</span>
                <span>Ctrl+Shift+T: Test All</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Online: {systemMetrics.network.online ? '🟢' : '🔴'}</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedDebugSystem;
