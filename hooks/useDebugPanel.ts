import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useUser } from '../contexts/UserContext';

export interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  category: string;
  data?: any;
  source?: string;
  stack?: string;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
  };
  performance: {
    navigation: number;
    render: number;
  };
  network: {
    online: boolean;
    effectiveType?: string;
  };
  storage: {
    localStorage: number;
    sessionStorage: number;
  };
}

export interface DebugState {
  logs: DebugLog[];
  isVisible: boolean;
  activeTab: 'logs' | 'system' | 'network' | 'storage' | 'auth';
  filters: {
    level: string[];
    category: string[];
    search: string;
  };
  metrics: SystemMetrics;
  maxLogs: number;
}

const initialState: DebugState = {
  logs: [],
  isVisible: false,
  activeTab: 'logs',
  filters: {
    level: ['info', 'warn', 'error', 'debug'],
    category: [],
    search: ''
  },
  metrics: {
    memory: { used: 0, total: 0 },
    performance: { navigation: 0, render: 0 },
    network: { online: navigator.onLine },
    storage: { localStorage: 0, sessionStorage: 0 }
  },
  maxLogs: 500
};

export const useDebugPanel = () => {
  const [state, setState] = useState<DebugState>(initialState);
  const { user } = useUser();
  const metricsInterval = useRef<NodeJS.Timeout>();
  const logBuffer = useRef<DebugLog[]>([]);

  // Função para adicionar log
  const addLog = useCallback((log: Omit<DebugLog, 'id' | 'timestamp'>) => {
    const newLog: DebugLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    logBuffer.current.push(newLog);

    setState(prev => {
      const newLogs = [...prev.logs, newLog];
      // Manter apenas os últimos maxLogs
      if (newLogs.length > prev.maxLogs) {
        newLogs.splice(0, newLogs.length - prev.maxLogs);
      }
      return { ...prev, logs: newLogs };
    });

    // Log no console também para facilitar debug
    const logMethod = log.level === 'error' ? 'error' : 
                     log.level === 'warn' ? 'warn' : 
                     log.level === 'debug' ? 'debug' : 'log';
    
    console[logMethod](`[${log.category}] ${log.message}`, log.data || '');
  }, []);

  // Função para limpar logs
  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
    logBuffer.current = [];
  }, []);

  // Função para toggle do painel
  const togglePanel = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: !prev.isVisible }));
  }, []);

  // Função para mudar tab ativa
  const setActiveTab = useCallback((tab: DebugState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // Função para atualizar filtros
  const updateFilters = useCallback((filters: Partial<DebugState['filters']>) => {
    setState(prev => ({ 
      ...prev, 
      filters: { ...prev.filters, ...filters } 
    }));
  }, []);

  // Função para coletar métricas do sistema
  const collectMetrics = useCallback(() => {
    const metrics: SystemMetrics = {
      memory: {
        used: (performance as any).memory?.usedJSHeapSize || 0,
        total: (performance as any).memory?.totalJSHeapSize || 0
      },
      performance: {
        navigation: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 0,
        render: performance.now()
      },
      network: {
        online: navigator.onLine,
        effectiveType: (navigator as any).connection?.effectiveType
      },
      storage: {
        localStorage: JSON.stringify(localStorage).length,
        sessionStorage: JSON.stringify(sessionStorage).length
      }
    };

    setState(prev => ({ ...prev, metrics }));
  }, []);

  // Função para exportar logs
  const exportLogs = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      user: user?.email || 'anonymous',
      logs: state.logs,
      metrics: state.metrics,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog({
      level: 'info',
      message: 'Logs exportados com sucesso',
      category: 'debug-panel'
    });
  }, [state.logs, state.metrics, user, addLog]);

  // Configurar captura global de erros
  useEffect(() => {
    // Disponibilizar função addLog globalmente
    (window as any).__debugPanelAddLog = addLog;
    
    // Atualizar função global debugLog
    window.debugLog = (message: string, level: DebugLog['level'] = 'debug', category = 'manual', data?: any) => {
      addLog({ level, message, category, data });
    };
    const handleError = (event: ErrorEvent) => {
      addLog({
        level: 'error',
        message: event.message,
        category: 'global-error',
        source: event.filename,
        stack: event.error?.stack,
        data: {
          lineno: event.lineno,
          colno: event.colno
        }
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog({
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        category: 'promise-rejection',
        data: event.reason
      });
    };

    const handleConsoleLog = (originalMethod: any, level: DebugLog['level']) => {
      return (...args: any[]) => {
        // Evitar loop infinito
        if (args[0]?.includes?.('[DEBUG-PANEL]')) {
          return originalMethod.apply(console, args);
        }

        addLog({
          level,
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
          category: 'console',
          data: args.length === 1 ? args[0] : args
        });

        return originalMethod.apply(console, args);
      };
    };

    // Interceptar console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    console.log = handleConsoleLog(originalConsole.log, 'info');
    console.warn = handleConsoleLog(originalConsole.warn, 'warn');
    console.error = handleConsoleLog(originalConsole.error, 'error');
    console.debug = handleConsoleLog(originalConsole.debug, 'debug');

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Adicionar log inicial
    addLog({
      level: 'info',
      message: 'Sistema de debug inicializado',
      category: 'debug-panel',
      data: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    });

    return () => {
      // Restaurar console methods
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;

      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [addLog]);

  // Configurar coleta de métricas
  useEffect(() => {
    collectMetrics(); // Coleta inicial

    metricsInterval.current = setInterval(() => {
      collectMetrics();
    }, 5000); // A cada 5 segundos

    return () => {
      if (metricsInterval.current) {
        clearInterval(metricsInterval.current);
      }
    };
  }, [collectMetrics]);

  // Configurar atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+D para toggle do painel
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        togglePanel();
        addLog({
          level: 'debug',
          message: `Painel de debug ${state.isVisible ? 'ocultado' : 'exibido'} via atalho`,
          category: 'debug-panel'
        });
      }

      // Ctrl+Shift+C para limpar logs
      if (e.ctrlKey && e.shiftKey && e.key === 'C' && state.isVisible) {
        e.preventDefault();
        clearLogs();
      }

      // Ctrl+Shift+E para exportar logs
      if (e.ctrlKey && e.shiftKey && e.key === 'E' && state.isVisible) {
        e.preventDefault();
        exportLogs();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePanel, clearLogs, exportLogs, state.isVisible, addLog]);

  // Monitor de mudanças de rede
  useEffect(() => {
    const handleOnline = () => {
      addLog({
        level: 'info',
        message: 'Conexão com internet restaurada',
        category: 'network'
      });
      collectMetrics();
    };

    const handleOffline = () => {
      addLog({
        level: 'warn',
        message: 'Conexão com internet perdida',
        category: 'network'
      });
      collectMetrics();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addLog, collectMetrics]);

  // Filtrar logs baseado nos filtros ativos
  const filteredLogs = state.logs.filter(log => {
    const levelMatch = state.filters.level.includes(log.level);
    const categoryMatch = state.filters.category.length === 0 || 
                         state.filters.category.includes(log.category);
    const searchMatch = !state.filters.search || 
                       log.message.toLowerCase().includes(state.filters.search.toLowerCase());
    
    return levelMatch && categoryMatch && searchMatch;
  });

  return {
    ...state,
    filteredLogs,
    addLog,
    clearLogs,
    togglePanel,
    setActiveTab,
    updateFilters,
    collectMetrics,
    exportLogs
  };
};

// Função global para adicionar logs (disponível no console)
declare global {
  interface Window {
    debugLog: (message: string, level?: DebugLog['level'], category?: string, data?: any) => void;
  }
}

// Instalar função global
if (typeof window !== 'undefined') {
  window.debugLog = (message: string, level: DebugLog['level'] = 'debug', category = 'manual', data?: any) => {
    // Esta função será sobrescrita quando o hook for usado
    console.log(`[DEBUG] ${category}: ${message}`, data || '');
    
    // Tentar adicionar ao painel se disponível
    if ((window as any).__debugPanelAddLog) {
      (window as any).__debugPanelAddLog({
        level,
        message,
        category,
        data
      });
    }
  };
}
