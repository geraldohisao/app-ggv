import React, { useState, useEffect, useRef } from 'react';
import { postCriticalAlert } from '../../src/utils/net';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';
import ErrorEventsAdmin from './ErrorEventsAdmin';
import { getSessionInfo } from '../../utils/sessionUtils';

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: string;
  message: string;
  data?: any;
}

interface TestResult {
  name: string;
  success: boolean;
  duration?: number;
  error?: string;
  data?: any;
  timestamp: Date;
}

interface SystemMetrics {
  memory: { used: number; total: number; percentage: number };
  network: { online: boolean; effectiveType?: string };
  performance: { navigation: number; render: number };
  storage: { localStorage: number; sessionStorage: number };
}

export const FinalUnifiedDebugPanel: React.FC = () => {
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
  const [authData, setAuthData] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());
  const logCounter = useRef(0);

  // Verificar se é super admin
  const isSuperAdmin = user?.role === UserRole.SuperAdmin;

  // Runtime config (override via localStorage)
  const [diagGetUrl, setDiagGetUrl] = useState<string>(((import.meta as any)?.env?.VITE_DIAG_API_URL as string) || 'https://app.grupoggv.com/api/webhook/diag-ggv-register');
  const [diagPostUrl, setDiagPostUrl] = useState<string>(((import.meta as any)?.env?.VITE_N8N_WEBHOOK_URL as string) || 'https://api-test.ggvinteligencia.com.br/webhook/diag-ggv-register');
  const [feedbackPostUrl, setFeedbackPostUrl] = useState<string>(((import.meta as any)?.env?.VITE_FEEDBACK_WEBHOOK_URL as string) || 'https://api-test.ggvinteligencia.com.br/webhook/feedback-ggv-register');
  const [dealId, setDealId] = useState<string>('56934');

  // Função para adicionar logs
  const addLog = (level: DebugLog['level'], category: string, message: string, data?: any) => {
    const newLog: DebugLog = {
      id: `debug-${Date.now()}-${++logCounter.current}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data
    };
    
    setLogs(prev => [...prev.slice(-99), newLog]); // Manter últimos 100 logs
    
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
      effectiveType: connection?.effectiveType
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
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Manter últimos 10
      addLog('success', 'Test', `✅ ${testName} OK (${duration}ms)`, result);
      
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
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
      addLog('error', 'Test', `❌ ${testName} falhou (${duration}ms): ${error.message}`, error);
      
      return testResult;
    }
  };

  // Testes disponíveis
  const tests = {
    database: () => supabase.from('profiles').select('id').limit(1),
    session: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { hasSession: !!data.session };
    },
    n8n: async () => {
      const webhookUrl = diagPostUrl;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          source: 'unified-debug',
          timestamp: new Date().toISOString(),
          user: user?.email
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json().catch(() => ({}));
    },
    diag_get: async () => {
      const url = `${diagGetUrl}?deal_id=${encodeURIComponent(dealId)}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json().catch(() => ({ ok: true }));
    },
    diag_post: async () => {
      const url = diagPostUrl;
      const payload = {
        empresa: 'Empresa Debug LTDA',
        email: user?.email || 'debug@example.com',
        ramo_de_atividade: 'Serviço',
        setor_de_atuação: 'Tecnologia / Desenvolvimento / Sites',
        faturamento_mensal: 'R$ 101 a 300 mil/mês',
        tamanho_equipe_comercial: 'De 4 a 10 colaboradores',
        pontuacao_total: 72,
        nivel_maturidade: 'Média-Alta',
        porcentagem_maturidade: '72%',
        respostas: {
          maturidade_comercial: 'Às vezes',
          mapeamento_processos: 'Sim',
          crm: 'Sim',
          script_comercial: 'Às vezes',
          teste_comportamental: 'N/A',
          plano_metas: 'Às vezes',
          indicadores_comerciais: 'Sim',
          treinamentos: 'N/A',
          pos_venda: 'Às vezes',
          prospeccao_ativa: 'Sim'
        },
        link_resultado: 'https://app.grupoggv.com/r/AAAAAAAAAAAAAAAAAAAAAAAA',
        deal_id: dealId,
        timestamp: new Date().toISOString(),
        tipo: 'resultado_diagnostico'
      } as any;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json().catch(() => ({ ok: true }));
    },
    feedback_post: async () => {
      const url = feedbackPostUrl;
      const body = [{
        id: `${Date.now()}`,
        custom_variables: { deal: dealId },
        email_address: user?.email || 'debug@example.com',
        response_status: 'completed',
        date_created: new Date().toISOString(),
        pages: [
          { id: 'page1', questions: [
            { id: 'meeting_question', answers: [{ choice_id: '1193480653', simple_text: 'Sim' }], family: 'single_choice', subtype: 'vertical', heading: 'A reunião aconteceu?' },
            { id: 'notes_question', answers: [{ text: 'Teste debug painel' }], family: 'open_ended', subtype: 'essay', heading: 'Observações' }
          ]}
        ]
      }];
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json().catch(() => ({ ok: true }));
    }
  };

  // Carregar dados de autenticação
  const loadAuthData = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      setAuthData(session);
      addLog('success', 'Auth', 'Dados de auth carregados');
    } catch (error: any) {
      setAuthData({ error: error.message });
      addLog('error', 'Auth', `Erro ao carregar auth: ${error.message}`);
    }
  };

  // Verificações de permissão
  const permissions = {
    canSeeFeedback: user?.role === UserRole.SuperAdmin || 
                   user?.user_function === 'Closer' || 
                   user?.user_function === 'Gestor',
    canSeeSettings: user?.role === UserRole.SuperAdmin || user?.role === UserRole.Admin,
    canSeeDebug: user?.role === UserRole.SuperAdmin,
    canManageUsers: user?.role === UserRole.SuperAdmin
  };

  // Configuração inicial
  useEffect(() => {
    if (!isSuperAdmin) return;

    addLog('success', 'System', '🚀 Debug Panel Unificado iniciado');
    updateSystemMetrics();
    loadAuthData();

    // Overrides locais
    try {
      const o1 = localStorage.getItem('dbg.diagGetUrl');
      const o2 = localStorage.getItem('dbg.diagPostUrl');
      const o3 = localStorage.getItem('dbg.feedbackPostUrl');
      const o4 = localStorage.getItem('dbg.dealId');
      if (o1) setDiagGetUrl(o1);
      if (o2) setDiagPostUrl(o2);
      if (o3) setFeedbackPostUrl(o3);
      if (o4) setDealId(o4);
    } catch {}

    // Atualizar sessão
    const sessionInterval = setInterval(() => {
      setSessionInfo(getSessionInfo());
    }, 5000);

    // Atualizar métricas
    const metricsInterval = setInterval(updateSystemMetrics, 10000);

    // Capturar erros globais
    const handleError = (event: ErrorEvent) => {
      addLog('error', 'JavaScript', `${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', 'Promise', `Promise rejeitada: ${event.reason}`, { reason: event.reason });
    };

    // Atalhos de teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        addLog('debug', 'System', 'Painel toggled via Ctrl+Shift+D');
      }
    };

    // Função global para debug
    (window as any).debugPanel = {
      log: (message: string, data?: any) => addLog('debug', 'Manual', message, data),
      info: (message: string, data?: any) => addLog('info', 'Manual', message, data),
      warn: (message: string, data?: any) => addLog('warn', 'Manual', message, data),
      error: (message: string, data?: any) => addLog('error', 'Manual', message, data),
      success: (message: string, data?: any) => addLog('success', 'Manual', message, data),
      test: (name: string, fn: () => Promise<any>) => runTest(name, fn),
      export: () => {
        const data = {
          timestamp: new Date().toISOString(),
          user: user?.email,
          logs,
          testResults,
          systemMetrics,
          sessionInfo,
          permissions
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('success', 'Export', 'Dados exportados');
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(sessionInterval);
      clearInterval(metricsInterval);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).debugPanel;
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  // Botão flutuante
  if (!isVisible) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsVisible(true);
            addLog('debug', 'System', 'Painel aberto via botão');
          }}
          className="w-16 h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center text-2xl border-4 border-white animate-pulse"
          title="Debug Panel Unificado (Ctrl+Shift+D)"
        >
          🛡️
        </button>
        <div className="absolute -top-10 -left-4 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-90 pointer-events-none">
          Super Debug
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed bottom-6 right-6 w-[480px] h-[600px] bg-white rounded-2xl shadow-2xl border-2 border-purple-500 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="font-bold text-lg">Super Debug Panel</h2>
              <p className="text-xs opacity-90">Sistema completo de debug</p>
            </div>
          </div>
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

      {/* Tabs */}
      <div className="flex bg-gray-100 border-b overflow-x-auto">
        {[
          { key: 'overview', label: 'Geral', icon: '📊' },
          { key: 'logs', label: 'Logs', icon: '📝' },
          { key: 'tests', label: 'Testes', icon: '🧪' },
          { key: 'system', label: 'Sistema', icon: '💻' },
          { key: 'session', label: 'Sessão', icon: '🕐' },
          { key: 'permissions', label: 'Roles', icon: '🔐' },
          { key: 'incidents', label: 'Incidentes', icon: '🚨' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-semibold text-blue-800 mb-1 flex items-center gap-1">
                  👤 Usuário
                </h4>
                <div className="text-sm">
                  <div className="font-medium">{user?.name}</div>
                  <div className="text-xs text-gray-600">{user?.email}</div>
                  <div className="mt-1">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-semibold text-green-800 mb-1 flex items-center gap-1">
                  🕐 Sessão
                </h4>
                <div className="text-sm">
                  <div className={`font-medium ${sessionInfo.isLoggedIn ? 'text-green-600' : 'text-red-600'}`}>
                    {sessionInfo.isLoggedIn ? '🟢 Ativa' : '🔴 Inativa'}
                  </div>
                  {sessionInfo.isLoggedIn && (
                    <div className="text-xs text-gray-600">
                      {sessionInfo.remainingHours}h restantes
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="font-semibold text-purple-800 mb-1 flex items-center gap-1">
                  💻 Sistema
                </h4>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Memória:</span>
                    <span className="font-mono">{formatBytes(systemMetrics.memory.used)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rede:</span>
                    <span className={systemMetrics.network.online ? 'text-green-600' : 'text-red-600'}>
                      {systemMetrics.network.online ? '🟢' : '🔴'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h4 className="font-semibold text-orange-800 mb-1 flex items-center gap-1">
                  📊 Atividade
                </h4>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Logs:</span>
                    <span className="font-mono">{logs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Testes:</span>
                    <span className="font-mono">{testResults.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">⚡ Ações Rápidas</h4>
              
              {/* Inputs para overrides */}
              <div className="space-y-2 text-xs bg-gray-50 p-2 rounded border">
                <div className="grid grid-cols-1 gap-2">
                  <input className="border p-1 rounded" value={dealId} onChange={e => { setDealId(e.target.value); localStorage.setItem('dbg.dealId', e.target.value); }} placeholder="Deal ID" />
                  <input className="border p-1 rounded" value={diagGetUrl} onChange={e => { setDiagGetUrl(e.target.value); localStorage.setItem('dbg.diagGetUrl', e.target.value); }} placeholder="Diag GET URL" />
                  <input className="border p-1 rounded" value={diagPostUrl} onChange={e => { setDiagPostUrl(e.target.value); localStorage.setItem('dbg.diagPostUrl', e.target.value); }} placeholder="Diag POST URL" />
                  <input className="border p-1 rounded" value={feedbackPostUrl} onChange={e => { setFeedbackPostUrl(e.target.value); localStorage.setItem('dbg.feedbackPostUrl', e.target.value); }} placeholder="Feedback POST URL" />
                </div>
              </div>

              <button
                onClick={() => {
                  Object.keys(tests).forEach(testName => {
                    runTest(testName, tests[testName as keyof typeof tests]);
                  });
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
              >
                🚀 Executar Todos os Testes
              </button>
              <button
                onClick={() => {
                  postCriticalAlert({
                    title: 'Teste de Alerta Crítico',
                    message: 'Disparo manual via painel de debug',
                    context: {
                      url: window.location.href,
                      userAgent: navigator.userAgent,
                      appVersion: (window as any).__APP_VERSION__ || '',
                      tags: ['manual', 'debug']
                    }
                  });
                  addLog('success', 'Alert', '🚨 Alerta crítico enviado');
                }}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium"
              >
                🚨 Testar Alerta Crítico
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => runTest('database', tests.database)}
                  className="bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  🗄️ Banco
                </button>
                <button
                  onClick={() => runTest('n8n', tests.n8n)}
                  className="bg-orange-600 text-white py-2 px-3 rounded-lg hover:bg-orange-700 text-sm font-medium"
                >
                  🔄 N8N
                </button>
                <button
                  onClick={() => runTest('diag_get', tests.diag_get)}
                  className="bg-indigo-600 text-white py-2 px-3 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  📥 Diag GET
                </button>
                <button
                  onClick={() => runTest('diag_post', tests.diag_post)}
                  className="bg-indigo-700 text-white py-2 px-3 rounded-lg hover:bg-indigo-800 text-sm font-medium"
                >
                  📤 Diag POST
                </button>
                <button
                  onClick={() => runTest('feedback_post', tests.feedback_post)}
                  className="bg-teal-700 text-white py-2 px-3 rounded-lg hover:bg-teal-800 text-sm font-medium"
                >
                  📨 Feedback POST
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setLogs([]);
                    setTestResults([]);
                    addLog('success', 'System', 'Dados limpos');
                  }}
                  className="bg-gray-600 text-white py-2 px-3 rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  🗑️ Limpar
                </button>
                <button
                  onClick={() => (window as any).debugPanel?.export()}
                  className="bg-indigo-600 text-white py-2 px-3 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  📤 Exportar
                </button>
              </div>
            </div>

            {/* Recent Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">📊 Últimos Testes</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {testResults.slice(0, 5).map(result => (
                    <div
                      key={`${result.name}-${result.timestamp.getTime()}`}
                      className={`p-2 rounded text-xs border-l-4 ${
                        result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium capitalize">{result.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                            {result.success ? '✅' : '❌'}
                          </span>
                          {result.duration && (
                            <span className="text-gray-500">{result.duration}ms</span>
                          )}
                        </div>
                      </div>
                      {result.error && (
                        <div className="text-red-600 mt-1">{result.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">📝 Sistema de Logs</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLogs([]);
                    addLog('debug', 'System', 'Logs limpos');
                  }}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  🗑️ Limpar
                </button>
                <button
                  onClick={() => (window as any).debugPanel?.export()}
                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                >
                  📤 Exportar
                </button>
              </div>
            </div>
            
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-2xl mb-2">📝</div>
                  <div>Nenhum log ainda</div>
                  <div className="text-xs mt-2">Use window.debugPanel.log() no console</div>
                </div>
              ) : (
                logs.slice().reverse().map(log => (
                  <div
                    key={log.id}
                    className={`p-2 rounded text-xs border-l-4 ${
                      log.level === 'error' ? 'bg-red-50 border-red-500' :
                      log.level === 'warn' ? 'bg-yellow-50 border-yellow-500' :
                      log.level === 'success' ? 'bg-green-50 border-green-500' :
                      log.level === 'info' ? 'bg-blue-50 border-blue-500' :
                      'bg-gray-50 border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold">{log.category}</span>
                      <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="text-gray-800">{log.message}</div>
                    {log.data && (
                      <pre className="mt-1 text-gray-600 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2).slice(0, 100)}...
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">🧪 Bateria de Testes</h4>
            
            <button
              onClick={() => {
                Object.keys(tests).forEach(testName => {
                  runTest(testName, tests[testName as keyof typeof tests]);
                });
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold"
            >
              🚀 Executar Todos os Testes
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => runTest('database', tests.database)}
                className="bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                🗄️ Banco de Dados
              </button>
              <button
                onClick={() => runTest('session', tests.session)}
                className="bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                🔐 Sessão Auth
              </button>
              <button
                onClick={() => runTest('n8n', tests.n8n)}
                className="bg-orange-600 text-white py-2 px-3 rounded-lg hover:bg-orange-700 text-sm font-medium"
              >
                🔄 N8N Webhook
              </button>
              <button
                onClick={() => {
                  runTest('custom', async () => {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return { customTest: true, timestamp: new Date() };
                  });
                }}
                className="bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 text-sm font-medium"
              >
                🎯 Teste Custom
              </button>
            </div>

            {/* Resultados */}
            {testResults.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-semibold text-gray-800">📊 Resultados</h5>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded border ${
                        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium capitalize">{result.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                            {result.success ? '✅' : '❌'}
                          </span>
                          {result.duration && (
                            <span className="text-xs text-gray-500">{result.duration}ms</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {result.timestamp.toLocaleString()}
                      </div>
                      {result.error && (
                        <div className="text-xs text-red-600 mt-1">
                          Erro: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Console Helper */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h5 className="font-semibold text-yellow-800 mb-2">💡 Console JavaScript</h5>
              <div className="text-xs font-mono bg-yellow-100 p-2 rounded space-y-1">
                <div>{"window.debugPanel.test('nome', async function() { /* ... */ })"}</div>
                <div>{"window.debugPanel.log('mensagem', dados)"}</div>
                <div>{"window.debugPanel.export() // Exportar tudo"}</div>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">💻 Informações do Sistema</h4>
              <button
                onClick={updateSystemMetrics}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                🔄 Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="font-semibold text-blue-800 mb-2">🧠 Memória</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Usado:</span>
                    <span className="font-mono">{formatBytes(systemMetrics.memory.used)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-mono">{formatBytes(systemMetrics.memory.total)}</span>
                  </div>
                  {systemMetrics.memory.total > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${systemMetrics.memory.percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 mb-2">🌐 Rede</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={systemMetrics.network.online ? 'text-green-600' : 'text-red-600'}>
                      {systemMetrics.network.online ? '🟢 Online' : '🔴 Offline'}
                    </span>
                  </div>
                  {systemMetrics.network.effectiveType && (
                    <div className="flex justify-between">
                      <span>Tipo:</span>
                      <span className="font-mono">{systemMetrics.network.effectiveType}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h5 className="font-semibold text-purple-800 mb-2">⚡ Performance</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Navegação:</span>
                    <span className="font-mono">{systemMetrics.performance.navigation}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DOM Ready:</span>
                    <span className="font-mono">{systemMetrics.performance.render}ms</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h5 className="font-semibold text-orange-800 mb-2">💾 Armazenamento</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>LocalStorage:</span>
                    <span className="font-mono">{formatBytes(systemMetrics.storage.localStorage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SessionStorage:</span>
                    <span className="font-mono">{formatBytes(systemMetrics.storage.sessionStorage)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h5 className="font-semibold text-gray-800 mb-2">🌍 Ambiente</h5>
                <div className="space-y-1 text-xs">
                  <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
                  <div><strong>URL:</strong> {window.location.href}</div>
                  <div><strong>User Agent:</strong> {navigator.userAgent.slice(0, 50)}...</div>
                  <div><strong>Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                  <div><strong>Language:</strong> {navigator.language}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Tab */}
        {activeTab === 'session' && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">🕐 Gerenciamento de Sessão</h4>

            <div className={`border rounded-lg p-3 ${
              sessionInfo.isLoggedIn && sessionInfo.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h5 className={`font-semibold mb-2 ${
                sessionInfo.isLoggedIn && sessionInfo.isValid ? 'text-green-800' : 'text-red-800'
              }`}>
                📊 Status da Sessão
              </h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={sessionInfo.isLoggedIn ? 'text-green-600' : 'text-red-600'}>
                    {sessionInfo.isLoggedIn ? '🟢 Logado' : '🔴 Não logado'}
                  </span>
                </div>
                {sessionInfo.isLoggedIn && (
                  <>
                    <div className="flex justify-between">
                      <span>Válida:</span>
                      <span className={sessionInfo.isValid ? 'text-green-600' : 'text-red-600'}>
                        {sessionInfo.isValid ? '✅ Sim' : '❌ Não'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Idade:</span>
                      <span className="font-mono">{sessionInfo.ageHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Restante:</span>
                      <span className={`font-mono ${
                        sessionInfo.remainingHours > 24 ? 'text-green-600' : 
                        sessionInfo.remainingHours > 12 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {sessionInfo.remainingHours}h
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {sessionInfo.isLoggedIn && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="font-semibold text-blue-800 mb-2">⏰ Progresso da Sessão</h5>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      sessionInfo.remainingHours > 50 ? 'bg-green-500' :
                      sessionInfo.remainingHours > 25 ? 'bg-yellow-500' : 
                      sessionInfo.remainingHours > 10 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.max(5, (sessionInfo.remainingHours / 100) * 100)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>0h</span>
                  <span className="font-medium">{sessionInfo.remainingHours}/100h</span>
                  <span>100h</span>
                </div>
              </div>
            )}

            {authData && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h5 className="font-semibold text-purple-800 mb-2">🔐 Dados de Auth</h5>
                {authData.error ? (
                  <div className="text-red-600 text-sm">❌ {authData.error}</div>
                ) : authData.access_token ? (
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Token:</span>
                      <div className="font-mono text-xs bg-white p-1 rounded mt-1 break-all">
                        {authData.access_token.slice(0, 30)}...
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Expira:</span>
                      <div className="font-mono text-xs">
                        {authData.expires_at ? new Date(authData.expires_at * 1000).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm">ℹ️ Nenhuma sessão ativa</div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h5 className="font-semibold text-gray-800">🛠️ Ferramentas</h5>
              <button
                onClick={loadAuthData}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                🔄 Atualizar Dados Auth
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('ggv-user-session');
                  localStorage.removeItem('ggv-session-timestamp');
                  addLog('warn', 'Session', 'Dados de sessão limpos - recarregue a página');
                }}
                className="w-full bg-yellow-600 text-white py-2 px-3 rounded-lg hover:bg-yellow-700 text-sm font-medium"
              >
                🗑️ Limpar Sessão Local
              </button>
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="h-full overflow-hidden">
            <ErrorEventsAdmin />
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">🔐 Roles & Permissões</h4>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="font-semibold text-blue-800 mb-2">👤 Perfil do Usuário</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Nome:</span>
                  <span className="font-medium">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-mono text-xs">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Role:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user?.role === UserRole.SuperAdmin ? 'bg-red-100 text-red-800' :
                    user?.role === UserRole.Admin ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user?.role}
                  </span>
                </div>
                {user?.user_function && (
                  <div className="flex items-center justify-between">
                    <span>Função:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user?.user_function === 'Gestor' ? 'bg-blue-100 text-blue-800' :
                      user?.user_function === 'Closer' ? 'bg-green-100 text-green-800' :
                      user?.user_function === 'SDR' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.user_function}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h5 className="font-semibold text-green-800 mb-2">🛡️ Matriz de Permissões</h5>
              <div className="space-y-2">
                {Object.entries(permissions).map(([key, granted]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="capitalize">
                      {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {granted ? '✅ Permitido' : '❌ Negado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-semibold text-gray-800">🧪 Testes de Acesso</h5>
              <button
                onClick={() => window.location.href = '/opportunity-feedback'}
                disabled={!permissions.canSeeFeedback}
                className={`w-full text-sm py-2 px-3 rounded-lg font-medium ${
                  permissions.canSeeFeedback 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                📋 Testar Acesso ao Feedback
              </button>
              
              <button
                onClick={() => window.location.href = '/settings'}
                disabled={!permissions.canSeeSettings}
                className={`w-full text-sm py-2 px-3 rounded-lg font-medium ${
                  permissions.canSeeSettings 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ⚙️ Testar Acesso às Configurações
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">📋 Regras de Acesso</h5>
              <div className="text-xs text-gray-700 space-y-1">
                <div>• <strong>Feedback:</strong> Closer, Gestor, SuperAdmin</div>
                <div>• <strong>Configurações:</strong> Admin, SuperAdmin</div>
                <div>• <strong>Debug Panel:</strong> SuperAdmin</div>
                <div>• <strong>Gerenciar Usuários:</strong> SuperAdmin</div>
                <div>• <strong>SDR:</strong> Acesso limitado (sem feedback)</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t px-4 py-3">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>Ctrl+Shift+D: Toggle</span>
            <span>Logs: {logs.length}/100</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{systemMetrics.network.online ? '🟢' : '🔴'}</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalUnifiedDebugPanel;
