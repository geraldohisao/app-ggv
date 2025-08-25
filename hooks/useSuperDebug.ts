import { useUser } from '../contexts/UserContext';
import { UserRole } from '../types';

/**
 * Hook para funcionalidades de debug avançado do Super Admin
 * Fornece utilitários e helpers para debug e testes
 */
export const useSuperDebug = () => {
  const { user } = useUser();
  
  // Verificar se o usuário é super admin
  // TEMPORÁRIO: Para teste local, permitir também admins e em desenvolvimento
  const isSuperAdmin = user?.role === UserRole.SuperAdmin || 
                       user?.role === UserRole.Admin || 
                       (process.env.NODE_ENV === 'development' && user !== null);

  /**
   * Adiciona um log ao painel de debug (se disponível)
   */
  const addDebugLog = (
    level: 'info' | 'warn' | 'error' | 'debug' | 'success' = 'debug',
    category: string = 'Manual',
    message: string,
    data?: any
  ) => {
    if (isSuperAdmin && (window as any).superDebugLog) {
      (window as any).superDebugLog(level, category, message, data);
    }
  };

  /**
   * Executa uma função e loga o resultado
   */
  const debugWrapper = async <T>(
    fn: () => Promise<T> | T,
    description: string,
    category: string = 'Debug'
  ): Promise<T | null> => {
    if (!isSuperAdmin) {
      return typeof fn === 'function' ? await fn() : fn;
    }

    const startTime = Date.now();
    addDebugLog('info', category, `Iniciando: ${description}`);
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      addDebugLog('success', category, `Concluído: ${description} (${duration}ms)`, result);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      addDebugLog('error', category, `Erro em ${description} (${duration}ms): ${error.message}`, error);
      return null;
    }
  };

  /**
   * Monitora uma variável de estado e loga mudanças
   */
  const debugState = (stateName: string, value: any, category: string = 'State') => {
    if (isSuperAdmin) {
      addDebugLog('debug', category, `Estado ${stateName} alterado`, { 
        value, 
        type: typeof value,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Loga informações de performance
   */
  const debugPerformance = (operation: string, startTime: number, category: string = 'Performance') => {
    if (isSuperAdmin) {
      const duration = Date.now() - startTime;
      const level = duration > 1000 ? 'warn' : duration > 500 ? 'info' : 'debug';
      addDebugLog(level, category, `${operation}: ${duration}ms`, { 
        duration,
        operation,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Loga informações de API calls
   */
  const debugAPI = (
    method: string,
    url: string,
    status?: number,
    duration?: number,
    data?: any,
    error?: any
  ) => {
    if (!isSuperAdmin) return;

    const level = error ? 'error' : status && status >= 400 ? 'warn' : 'success';
    const message = error 
      ? `${method} ${url} - Erro: ${error.message}`
      : `${method} ${url} - ${status}${duration ? ` (${duration}ms)` : ''}`;

    addDebugLog(level, 'API', message, {
      method,
      url,
      status,
      duration,
      data: data ? (typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : data) : undefined,
      error: error ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Utilitários para testes rápidos
   */
  const testUtils = {
    // Simula delay
    delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Gera dados de teste
    generateTestData: (type: 'diagnostic' | 'user' | 'company') => {
      switch (type) {
        case 'diagnostic':
          return Array.from({ length: 10 }, (_, i) => ({
            questionId: i + 1,
            question: `Pergunta de teste ${i + 1}`,
            answer: Math.floor(Math.random() * 5) + 1,
            timestamp: new Date().toISOString()
          }));
        case 'user':
          return {
            id: 'test-' + Date.now(),
            email: 'test@example.com',
            name: 'Usuário de Teste',
            role: 'USER',
            created_at: new Date().toISOString()
          };
        case 'company':
          return {
            name: 'Empresa Teste',
            email: 'contato@empresateste.com',
            segment: 'Tecnologia',
            revenue: 'R$ 1M - R$ 5M',
            employees: '50-100',
            timestamp: new Date().toISOString()
          };
        default:
          return null;
      }
    },

    // Testa conectividade
    testConnectivity: async (url: string) => {
      const startTime = Date.now();
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        const duration = Date.now() - startTime;
        debugAPI('HEAD', url, response.status, duration);
        return { success: true, status: response.status, duration };
      } catch (error: any) {
        const duration = Date.now() - startTime;
        debugAPI('HEAD', url, undefined, duration, undefined, error);
        return { success: false, error: error.message, duration };
      }
    },

    // Simula erro para testes
    simulateError: (message: string = 'Erro simulado para teste') => {
      addDebugLog('error', 'Test', message, { simulated: true, stack: new Error().stack });
      throw new Error(message);
    },

    // Loga informações do sistema
    logSystemInfo: () => {
      addDebugLog('info', 'System', 'Informações do sistema coletadas', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        onLine: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : 'N/A',
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt
        } : 'N/A',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Monitores automáticos
   */
  const monitors = {
    // Monitor de erros não tratados
    startErrorMonitor: () => {
      if (!isSuperAdmin) return;
      
      window.addEventListener('error', (event) => {
        addDebugLog('error', 'Monitor', `Erro não tratado: ${event.message}`, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString()
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        addDebugLog('error', 'Monitor', `Promise rejeitada: ${event.reason}`, {
          reason: event.reason,
          timestamp: new Date().toISOString()
        });
      });
    },

    // Monitor de performance
    startPerformanceMonitor: () => {
      if (!isSuperAdmin) return;

      // Monitorar navegação
      if (performance.timing) {
        const timing = performance.timing;
        const navigationTime = timing.loadEventEnd - timing.navigationStart;
        debugPerformance('Page Load', timing.navigationStart);
      }

      // Monitorar recursos
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              debugPerformance('Navigation', 0);
            } else if (entry.entryType === 'resource') {
              if (entry.duration > 1000) {
                addDebugLog('warn', 'Performance', `Recurso lento: ${entry.name}`, {
                  duration: entry.duration,
                  size: (entry as any).transferSize || 0,
                  type: (entry as any).initiatorType
                });
              }
            }
          });
        });

        try {
          observer.observe({ entryTypes: ['navigation', 'resource'] });
        } catch (e) {
          // Fallback se PerformanceObserver não suportar esses tipos
        }
      }
    }
  };

  return {
    isSuperAdmin,
    addDebugLog,
    debugWrapper,
    debugState,
    debugPerformance,
    debugAPI,
    testUtils,
    monitors
  };
};

export default useSuperDebug;
