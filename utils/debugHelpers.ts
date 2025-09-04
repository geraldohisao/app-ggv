/**
 * 🛠️ UTILITÁRIOS DE DEBUG GLOBAIS
 * 
 * Funções auxiliares para facilitar o debug em produção
 */

// Declarar tipos globais
declare global {
  interface Window {
    debugLog: (level: string, source: string, message: string, data?: any) => void;
    debugInfo: () => void;
    debugExport: () => void;
    debugClear: () => void;
    debugTest: () => void;
    debugUser: () => void;
    debugSystem: () => void;
  }
}

/**
 * 📊 Informações do sistema para debug
 */
export const getSystemInfo = () => {
  return {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    memory: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
    } : null,
    connection: (navigator as any).connection ? {
      effectiveType: (navigator as any).connection.effectiveType,
      downlink: (navigator as any).connection.downlink,
      rtt: (navigator as any).connection.rtt
    } : null,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    localStorage: {
      available: !!window.localStorage,
      used: localStorage ? Object.keys(localStorage).length : 0
    },
    sessionStorage: {
      available: !!window.sessionStorage,
      used: sessionStorage ? Object.keys(sessionStorage).length : 0
    }
  };
};

/**
 * 🔍 Testar conectividade e APIs
 */
export const runConnectivityTests = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {} as Record<string, any>
  };

  // Teste 1: Supabase
  try {
    const response = await fetch('https://xyzcompany.supabase.co/rest/v1/', {
      method: 'HEAD'
    });
    results.tests.supabase = {
      status: response.status,
      ok: response.ok,
      time: Date.now()
    };
  } catch (error) {
    results.tests.supabase = {
      error: error.message,
      time: Date.now()
    };
  }

  // Teste 2: Netlify Functions
  try {
    const response = await fetch('/.netlify/functions/diagnostic-test', {
      method: 'HEAD'
    });
    results.tests.netlifyFunctions = {
      status: response.status,
      ok: response.ok,
      time: Date.now()
    };
  } catch (error) {
    results.tests.netlifyFunctions = {
      error: error.message,
      time: Date.now()
    };
  }

  // Teste 3: Google APIs
  try {
    const response = await fetch('https://accounts.google.com/', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    results.tests.googleApis = {
      accessible: true,
      time: Date.now()
    };
  } catch (error) {
    results.tests.googleApis = {
      error: error.message,
      time: Date.now()
    };
  }

  return results;
};

/**
 * 📤 Exportar dados de debug
 */
export const exportDebugData = () => {
  const debugData = {
    timestamp: new Date().toISOString(),
    system: getSystemInfo(),
    localStorage: localStorage ? Object.fromEntries(
      Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
    ) : {},
    sessionStorage: sessionStorage ? Object.fromEntries(
      Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
    ) : {},
    cookies: document.cookie,
    url: window.location.href,
    referrer: document.referrer,
    title: document.title
  };

  const dataStr = JSON.stringify(debugData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `debug-data-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);

  return debugData;
};

/**
 * 🎯 Inicializar funções globais de debug
 */
export const initializeGlobalDebugFunctions = () => {
  // Função principal de log
  window.debugLog = (level: string, source: string, message: string, data?: any) => {
    console.log(`[${level.toUpperCase()}] ${source}: ${message}`, data || '');
  };

  // Informações do sistema
  window.debugInfo = () => {
    const info = getSystemInfo();
    console.table(info);
    return info;
  };

  // Exportar dados
  window.debugExport = () => {
    const data = exportDebugData();
    console.log('📤 Dados de debug exportados:', data);
    return data;
  };

  // Limpar dados
  window.debugClear = () => {
    localStorage.removeItem('debug_logs');
    console.log('🧹 Logs de debug limpos');
  };

  // Teste de conectividade
  window.debugTest = async () => {
    console.log('🧪 Iniciando testes de conectividade...');
    const results = await runConnectivityTests();
    console.table(results.tests);
    return results;
  };

  // Informações do usuário
  window.debugUser = () => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.table(user);
        return user;
      } catch (error) {
        console.error('Erro ao parsear dados do usuário:', error);
      }
    } else {
      console.log('👤 Nenhum usuário encontrado no storage');
    }
  };

  // Informações do sistema
  window.debugSystem = () => {
    const system = {
      environment: process.env.NODE_ENV || 'unknown',
      react: React.version || 'unknown',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(performance.now() / 1000) + 's',
      memory: (performance as any).memory ? 
        `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'
    };
    console.table(system);
    return system;
  };

  console.log('🛠️ Funções globais de debug inicializadas:');
  console.log('- window.debugLog(level, source, message, data?)');
  console.log('- window.debugInfo() - Informações do sistema');
  console.log('- window.debugExport() - Exportar dados');
  console.log('- window.debugClear() - Limpar logs');
  console.log('- window.debugTest() - Testar conectividade');
  console.log('- window.debugUser() - Informações do usuário');
  console.log('- window.debugSystem() - Informações do sistema');
};

// Auto-inicializar se estiver no browser
if (typeof window !== 'undefined') {
  initializeGlobalDebugFunctions();
}
