import React, { useEffect, useState } from 'react';
import { useSuperDebug } from '../../hooks/useSuperDebug';

/**
 * Componente de exemplo mostrando como usar o sistema de debug
 * Este componente demonstra as melhores práticas para debugging
 */
export const DebugExampleUsage: React.FC = () => {
  const { 
    isSuperAdmin, 
    addDebugLog, 
    debugWrapper, 
    debugState, 
    debugAPI,
    testUtils,
    monitors 
  } = useSuperDebug();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Inicializar monitores quando componente monta
  useEffect(() => {
    if (isSuperAdmin) {
      monitors.startErrorMonitor();
      monitors.startPerformanceMonitor();
      addDebugLog('info', 'Component', 'DebugExampleUsage montado');
    }

    return () => {
      if (isSuperAdmin) {
        addDebugLog('info', 'Component', 'DebugExampleUsage desmontado');
      }
    };
  }, [isSuperAdmin]);

  // Exemplo de debug de mudança de estado
  useEffect(() => {
    debugState('data', data);
  }, [data]);

  useEffect(() => {
    debugState('loading', loading);
  }, [loading]);

  // Exemplo de função com debug wrapper
  const fetchData = async () => {
    return debugWrapper(async () => {
      setLoading(true);
      
      // Simular chamada API
      const response = await fetch('/api/example');
      const result = await response.json();
      
      // Debug da API call
      debugAPI('GET', '/api/example', response.status, undefined, result);
      
      setData(result);
      return result;
    }, 'Buscar dados de exemplo', 'API');
  };

  // Exemplo de teste manual
  const runManualTest = async () => {
    addDebugLog('info', 'Test', 'Iniciando teste manual');
    
    try {
      // Gerar dados de teste
      const testData = testUtils.generateTestData('diagnostic');
      addDebugLog('success', 'Test', 'Dados de teste gerados', testData);
      
      // Simular delay
      await testUtils.delay(1000);
      addDebugLog('info', 'Test', 'Delay de 1s concluído');
      
      // Testar conectividade
      const connectivity = await testUtils.testConnectivity('https://httpbin.org/status/200');
      addDebugLog('info', 'Test', 'Teste de conectividade', connectivity);
      
      // Log de informações do sistema
      testUtils.logSystemInfo();
      
    } catch (error: any) {
      addDebugLog('error', 'Test', `Erro no teste: ${error.message}`, error);
    }
  };

  // Exemplo de simulação de erro
  const simulateError = () => {
    try {
      testUtils.simulateError('Este é um erro simulado para demonstração');
    } catch (error) {
      // Erro capturado e logado automaticamente
      console.log('Erro capturado:', error);
    }
  };

  // Se não for super admin, não renderizar
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-40">
      <h3 className="font-semibold text-gray-900 mb-3">🧪 Debug Example</h3>
      <p className="text-sm text-gray-600 mb-4">
        Exemplo de como usar o sistema de debug
      </p>
      
      <div className="space-y-2">
        <button
          onClick={fetchData}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '⏳ Carregando...' : '📡 Fetch Data'}
        </button>
        
        <button
          onClick={runManualTest}
          className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          🧪 Executar Teste
        </button>
        
        <button
          onClick={simulateError}
          className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          💥 Simular Erro
        </button>
        
        <button
          onClick={() => addDebugLog('info', 'Manual', 'Log manual adicionado', { timestamp: new Date() })}
          className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
        >
          📝 Log Manual
        </button>
      </div>
      
      {data && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
          <strong>Dados carregados:</strong>
          <pre className="mt-1 overflow-auto max-h-20">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugExampleUsage;
