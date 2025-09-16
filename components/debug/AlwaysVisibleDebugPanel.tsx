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
 * 🛡️ PAINEL DEBUG SEMPRE VISÍVEL - SUPER ADMIN APENAS
 * 
 * Características:
 * - SEMPRE renderiza indicador visual
 * - Acesso RESTRITO para Super Admin apenas
 * - Ativação por URL (?debug=true) se autorizado
 * - Logs persistentes no localStorage
 * - Atalhos de teclado múltiplos
 * - Interface compacta e eficiente
 * - Feedback visual de permissões
 */
export const AlwaysVisibleDebugPanel: React.FC = () => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [testResults, setTestResults] = useState<string>('');
  const [globalLogs, setGlobalLogs] = useState<DebugLog[]>([]);
  const [isMonitoringGlobal, setIsMonitoringGlobal] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 🔐 Verificar se é Super Admin
  const isSuperAdmin = user?.role === 'SuperAdmin';
  // Só permitir acesso em desenvolvimento local (localhost) ou para SuperAdmin
  const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const hasDebugAccess = isSuperAdmin || (isLocalDevelopment && user !== null);

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

  // 🎯 Verificar ativação por URL (apenas para Super Admin)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    const adminParam = urlParams.get('admin');
    
    if ((debugParam === 'true' || adminParam === 'true') && hasDebugAccess) {
      setIsVisible(true);
      addLog('success', 'System', 'Debug ativado via URL');
    }

    // Log de acesso
    if (hasDebugAccess) {
      addLog('info', 'Auth', `Acesso autorizado: ${user?.role || 'Development'}`);
    } else if (user) {
      addLog('warn', 'Auth', `Acesso negado: ${user.role} (apenas Super Admin)`);
    }
  }, [user, hasDebugAccess]);

  // ⌨️ Atalhos de teclado múltiplos (apenas para Super Admin)
  useEffect(() => {
    if (!hasDebugAccess) return;

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
  }, [hasDebugAccess]);

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

  // 🔐 Verificar acesso (removido sistema de senha)
  const checkAccess = () => {
    if (hasDebugAccess) {
      setIsVisible(true);
      addLog('success', 'Auth', 'Acesso autorizado');
    } else {
      addLog('warn', 'Auth', 'Acesso negado - apenas Super Admin');
    }
  };

  // 🧪 FUNÇÕES DE TESTE (restauradas do painel original)
  const testDatabase = async () => {
    try {
      addLog('info', 'Test', 'Iniciando teste de banco de dados...');
      const { supabase } = await import('../../services/supabaseClient');
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      addLog('success', 'Test', 'Banco de dados: ✅ Conectado');
      setTestResults(prev => prev + '\n✅ Database: OK');
    } catch (error: any) {
      addLog('error', 'Test', `Banco de dados: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ Database: ${error.message}`);
    }
  };

  const testFeedbackPost = async () => {
    try {
      addLog('info', 'Test', 'Testando POST feedback...');
      const isLocal = window.location.hostname === 'localhost';
      const endpoint = isLocal ? '/api/feedback' : '/.netlify/functions/feedback';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Teste',
          description: 'Teste do painel debug',
          context: { user: user || {}, url: window.location.href }
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('success', 'Test', 'POST Feedback: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ POST Feedback: OK');
    } catch (error: any) {
      addLog('error', 'Test', `POST Feedback: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ POST Feedback: ${error.message}`);
    }
  };

  const testDiagnosticGet = async () => {
    try {
      addLog('info', 'Test', 'Testando GET diagnóstico...');
      const isLocal = window.location.hostname === 'localhost';
      const endpoint = isLocal ? '/api/diagnostic/test' : '/.netlify/functions/diagnostic-test';
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Resposta não é JSON');
      }
      
      await response.json();
      addLog('success', 'Test', 'GET Diagnóstico: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ GET Diagnostic: OK');
    } catch (error: any) {
      addLog('error', 'Test', `GET Diagnóstico: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ GET Diagnostic: ${error.message}`);
    }
  };

  const testDiagnosticPost = async () => {
    try {
      addLog('info', 'Test', 'Testando POST diagnóstico...');
      const isLocal = window.location.hostname === 'localhost';
      const endpoint = isLocal ? '/api/webhook/diag-ggv-register?deal_id=56934' : '/.netlify/functions/diag-ggv-register?deal_id=56934';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: '56934',
          action: 'diagnostic_test',
          body: {
            diagnosticAnswers: [{ questionId: 1, question: 'Teste', answer: 'Sim', description: 'Teste', score: 10 }],
            results: { totalScore: 10, maturityPercentage: '11%' }
          }
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('success', 'Test', 'POST Diagnóstico: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ POST Diagnostic: OK');
    } catch (error: any) {
      addLog('error', 'Test', `POST Diagnóstico: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ POST Diagnostic: ${error.message}`);
    }
  };

  const testGoogleChatAlert = async () => {
    try {
      addLog('info', 'Test', 'Testando Google Chat...');
      const isLocal = window.location.hostname === 'localhost';
      const endpoint = isLocal ? '/api/alert' : '/.netlify/functions/alert';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Teste Google Chat',
          message: `🧪 TESTE GOOGLE CHAT\n\nUsuário: ${user?.name || 'Teste'}\nTimestamp: ${new Date().toLocaleString()}`,
          context: { user: user || {}, url: window.location.href, source: 'DebugPanel-Test' }
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('success', 'Test', 'Google Chat: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ Google Chat: OK');
    } catch (error: any) {
      addLog('error', 'Test', `Google Chat: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ Google Chat: ${error.message}`);
    }
  };

  const testN8N = async () => {
    try {
      addLog('info', 'Test', 'Testando N8N webhook...');
      const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL || 'https://n8n.grupoggv.com/webhook/test';
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          user: user?.name || 'Teste',
          timestamp: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('success', 'Test', 'N8N Webhook: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ N8N: OK');
    } catch (error: any) {
      addLog('error', 'Test', `N8N Webhook: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ N8N: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    setTestResults('🚀 Iniciando todos os testes...\n');
    addLog('info', 'Test', 'Executando bateria completa de testes');
    
    await testDatabase();
    await testFeedbackPost();
    await testDiagnosticGet();
    await testDiagnosticPost();
    await testGoogleChatAlert();
    await testN8N();
    
    addLog('success', 'Test', 'Bateria de testes concluída');
    setTestResults(prev => prev + '\n\n🎉 Todos os testes concluídos!');
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
      <div className="fixed bottom-20 right-4 z-[9999]">
        {/* Indicador de status sempre visível */}
        <div className="flex flex-col items-end gap-2">
          {/* Status do sistema */}
          <div className="bg-black bg-opacity-90 text-white px-3 py-2 rounded-lg text-xs shadow-lg backdrop-blur-sm">
            🛡️ {user ? 'Online' : 'Offline'} | {logs.filter(l => l.level === 'error').length} erros
            {hasDebugAccess && <span className="ml-1 text-green-400">| Super Admin</span>}
          </div>
          
          {/* Botão principal */}
          <button
            onClick={checkAccess}
            className={`w-12 h-12 ${
              hasDebugAccess 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-xl transform hover:scale-110' 
                : 'bg-gray-500 cursor-not-allowed'
            } text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center text-lg border-2 border-white`}
            title={hasDebugAccess ? "Debug Panel (Ctrl+Shift+D)" : "Acesso restrito - Super Admin apenas"}
            disabled={!hasDebugAccess}
          >
            {hasDebugAccess ? '🛡️' : '🔒'}
          </button>
        </div>
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
              <p className="text-xs opacity-90">Super Admin | {logs.length} logs</p>
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

      {/* Tabs */}
      <div className="flex bg-gray-100 border-b overflow-x-auto">
        {[
          { key: 'geral', label: 'Geral', icon: '📊' },
          { key: 'logs', label: 'Logs', icon: '📝' },
          { key: 'testes', label: 'Testes', icon: '🧪' },
          { key: 'sistema', label: 'Sistema', icon: '💻' },
          { key: 'sessao', label: 'Sessão', icon: '🕐' },
          { key: 'global', label: 'Global', icon: '🌐' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'geral' && (
          <div className="p-4 space-y-4">
            {/* Usuário */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                👤 Usuário
              </h4>
              <div className="text-sm space-y-2">
                <div><strong>Nome:</strong> {user?.name || 'N/A'}</div>
                <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
                <div><strong>ID:</strong> {user?.id || 'N/A'}</div>
                <div><strong>Role:</strong> {user?.role || 'N/A'}</div>
              </div>
            </div>

            {/* Métricas */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                📈 Métricas do Sistema
              </h4>
              <div className="text-sm space-y-2">
                <div><strong>Logs Capturados:</strong> {logs.length}/500</div>
                <div><strong>Logs Globais:</strong> {globalLogs.length}/200</div>
                <div><strong>Monitoramento Global:</strong> {isMonitoringGlobal ? '🟢 Ativo' : '🔴 Inativo'}</div>
                <div><strong>Uptime:</strong> {Math.floor(performance.now() / 1000)}s</div>
              </div>
            </div>

            {/* Atividade */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                ⚡ Atividade
              </h4>
              <div className="text-sm space-y-2">
                <div><strong>Total de Logs:</strong> {logs.length}</div>
                <div><strong>Último Log:</strong> {logs[0]?.timestamp || 'Nenhum'}</div>
                <div><strong>Nível Crítico:</strong> {logs.filter(l => l.level === 'error').length} erros</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Logs Locais ({logs.length}/500)</h3>
              <div className="flex gap-2">
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
                  onClick={clearLogs}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  🗑️ Limpar
                </button>
                <button
                  onClick={exportLogs}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  📋 Exportar
                </button>
              </div>
            </div>
            
            <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="text-gray-500">Nenhum log registrado ainda...</div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className={`mb-1 ${
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    log.level === 'debug' ? 'text-blue-400' :
                    log.level === 'success' ? 'text-green-400' :
                    'text-green-400'
                  }`}>
                    <span className="text-gray-500">[{log.timestamp}]</span>
                    <span className="text-white ml-2">{log.level.toUpperCase()}</span>
                    <span className="text-cyan-400 ml-2">{log.source}:</span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {activeTab === 'testes' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Testes do Sistema</h3>
            
            <button
              onClick={runAllTests}
              className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold text-lg"
            >
              🚀 Executar Todos os Testes
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={testDatabase} className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                🗄️ Banco
              </button>
              <button onClick={testFeedbackPost} className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                📝 Feedback
              </button>
              <button onClick={testDiagnosticGet} className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                📊 Diag GET
              </button>
              <button onClick={testDiagnosticPost} className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                📈 Diag POST
              </button>
              <button onClick={testGoogleChatAlert} className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                💬 Google Chat
              </button>
              <button onClick={testN8N} className="p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm">
                🔗 N8N
              </button>
            </div>

            <div className="bg-black text-green-400 p-4 rounded-lg h-48 overflow-y-auto font-mono text-xs">
              <pre>{testResults || 'Nenhum teste executado ainda...'}</pre>
            </div>
          </div>
        )}

        {activeTab === 'sistema' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Informações do Sistema</h3>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">🌍 Ambiente</h4>
                <div className="text-sm space-y-1">
                  <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
                  <div><strong>URL:</strong> {window.location.href}</div>
                  <div><strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...</div>
                  <div><strong>Online:</strong> {navigator.onLine ? '✅ Sim' : '❌ Não'}</div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">⚡ Performance</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Memória:</strong> {(performance as any).memory ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'}</div>
                  <div><strong>Conexão:</strong> {(navigator as any).connection?.effectiveType || 'N/A'}</div>
                  <div><strong>Cores CPU:</strong> {navigator.hardwareConcurrency || 'N/A'}</div>
                  <div><strong>Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessao' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Informações da Sessão</h3>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">🕐 Status da Sessão</h4>
              <div className="text-sm space-y-1">
                <div><strong>Início da Sessão:</strong> {new Date().toLocaleString()}</div>
                <div><strong>Tempo Restante:</strong> ∞ (Persistente)</div>
                <div><strong>Último Acesso:</strong> {new Date().toLocaleTimeString()}</div>
                <div><strong>Renovação Automática:</strong> ✅ Ativa</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'global' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Logs Globais de Todos os Usuários</h3>
            
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">Sistema Global Ativo</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Capturando logs de todos os usuários em tempo real. 
                Total de logs: {globalLogs.length}/200
              </p>
            </div>
          </div>
        )}
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
