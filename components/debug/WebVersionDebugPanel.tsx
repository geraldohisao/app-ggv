import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { supabase } from '../../services/supabaseClient';

const WebVersionDebugPanel: React.FC = () => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [logs, setLogs] = useState<Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    source: string;
    message: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
  }>>([]);
  const [globalLogs, setGlobalLogs] = useState<Array<{
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    source: string;
    message: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    metadata?: any;
  }>>([]);
  const [testResults, setTestResults] = useState<string>('');
  const [logCounter, setLogCounter] = useState(0);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMonitoringGlobal, setIsMonitoringGlobal] = useState(false);
  const [globalLogFilter, setGlobalLogFilter] = useState<'all' | 'errors' | 'warnings' | 'info'>('all');

  // Verificar se é super admin (mais permissivo para desenvolvimento)
  const isSuperAdmin = user?.role === 'SuperAdmin' || 
                       user?.role === 'Admin' || 
                       (process.env.NODE_ENV === 'development' && user !== null);

  const addLog = (level: 'info' | 'warn' | 'error' | 'debug', source: string, message: string, userId?: string, userName?: string, userEmail?: string) => {
    const newLog = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message,
      userId,
      userName,
      userEmail
    };
    
    setLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 100);
      return updated;
    });
    
    setLogCounter(prev => prev + 1);

    // Também salva no sistema global de logs
    saveGlobalLog(level, source, message, userId, userName, userEmail);
  };

  const saveGlobalLog = async (level: string, source: string, message: string, userId?: string, userName?: string, userEmail?: string, metadata?: any) => {
    try {
      const logData = {
        level,
        source,
        message,
        user_id: userId || user?.id,
        user_name: userName || user?.name || user?.email?.split('@')[0],
        user_email: userEmail || user?.email,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString()
      };

      // Salva no Supabase
      await supabase
        .from('debug_logs')
        .insert([logData]);

      // Adiciona ao estado local se estiver monitorando
      if (isMonitoringGlobal) {
        const globalLog = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          level: level as 'info' | 'warn' | 'error' | 'debug',
          source,
          message,
          userId: userId || user?.id,
          userName: userName || user?.name || user?.email?.split('@')[0],
          userEmail: userEmail || user?.email,
          metadata
        };

        setGlobalLogs(prev => [globalLog, ...prev].slice(0, 200));
      }
    } catch (error) {
      console.error('Erro ao salvar log global:', error);
    }
  };

  const loadGlobalLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const formattedLogs = data?.map(log => ({
        id: log.id,
        timestamp: new Date(log.created_at).toLocaleTimeString(),
        level: log.level as 'info' | 'warn' | 'error' | 'debug',
        source: log.source,
        message: log.message,
        userId: log.user_id,
        userName: log.user_name,
        userEmail: log.user_email,
        metadata: log.metadata ? JSON.parse(log.metadata) : null
      })) || [];

      setGlobalLogs(formattedLogs);
      addLog('info', 'GlobalLogs', `Carregados ${formattedLogs.length} logs globais`);
    } catch (error) {
      addLog('error', 'GlobalLogs', `Erro ao carregar logs: ${error.message}`);
    }
  };

  const startGlobalMonitoring = () => {
    setIsMonitoringGlobal(true);
    loadGlobalLogs();
    addLog('info', 'GlobalMonitor', 'Monitoramento global iniciado');
  };

  const stopGlobalMonitoring = () => {
    setIsMonitoringGlobal(false);
    setGlobalLogs([]);
    addLog('info', 'GlobalMonitor', 'Monitoramento global parado');
  };

  useEffect(() => {
    if (!isSuperAdmin) return;

    addLog('info', 'System', 'Super Debug Panel Web Version iniciado');

    // Atalho de teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        addLog('debug', 'System', `Painel ${isVisible ? 'fechado' : 'aberto'} via teclado`);
      }
    };

    // Captura de erros globais
    const handleError = (event: ErrorEvent) => {
      const errorMsg = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      addLog('error', 'GlobalError', errorMsg, user?.id, user?.name, user?.email);
      
      // Envia para Google Chat
      fetch('/.netlify/functions/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🚨 ERRO JAVASCRIPT GLOBAL\n\n**Usuário:** ${user?.name || user?.email || 'Anônimo'}\n**ID:** ${user?.id || 'N/A'}\n**Erro:** ${errorMsg}\n**Timestamp:** ${new Date().toLocaleString()}\n**URL:** ${window.location.href}`,
          source: 'SuperDebugPanel-GlobalError'
        })
      }).catch(err => console.log('Erro ao enviar alerta:', err));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMsg = `Promise rejeitada: ${event.reason}`;
      addLog('error', 'UnhandledPromise', errorMsg, user?.id, user?.name, user?.email);
      
      // Envia para Google Chat
      fetch('/.netlify/functions/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🚨 PROMISE REJECTION GLOBAL\n\n**Usuário:** ${user?.name || user?.email || 'Anônimo'}\n**ID:** ${user?.id || 'N/A'}\n**Erro:** ${errorMsg}\n**Timestamp:** ${new Date().toLocaleString()}\n**URL:** ${window.location.href}`,
          source: 'SuperDebugPanel-PromiseRejection'
        })
      }).catch(err => console.log('Erro ao enviar alerta:', err));
    };

    // Intercepta console.error para capturar logs de todos os usuários
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      addLog('error', 'Console', message, user?.id, user?.name, user?.email);
      
      // Envia erros críticos para Google Chat
      if (message.includes('Error:') || message.includes('TypeError:') || message.includes('ReferenceError:')) {
        fetch('/.netlify/functions/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🚨 ERRO CRÍTICO DETECTADO\n\n**Usuário:** ${user?.name || user?.email || 'Anônimo'}\n**ID:** ${user?.id || 'N/A'}\n**Erro:** ${message}\n**Timestamp:** ${new Date().toLocaleString()}\n**URL:** ${window.location.href}`,
            source: 'SuperDebugPanel'
          })
        }).catch(err => console.log('Erro ao enviar alerta:', err));
      }
      
      originalConsoleError.apply(console, args);
    };

    // Expõe funções globais para debug
    window.superDebug = {
      addLog: (level: string, source: string, message: string) => {
        addLog(level as any, source, message, user?.id, user?.name, user?.email);
      },
      testGoogleChat: () => {
        fetch('/.netlify/functions/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🧪 TESTE GOOGLE CHAT\n\n**Usuário:** ${user?.name || user?.email || 'Anônimo'}\n**ID:** ${user?.id || 'N/A'}\n**Timestamp:** ${new Date().toLocaleString()}\n**Status:** Teste manual do painel debug`,
            source: 'SuperDebugPanel-Test'
          })
        }).then(() => {
          addLog('info', 'GoogleChat', 'Teste enviado com sucesso');
        }).catch(err => {
          addLog('error', 'GoogleChat', `Erro no teste: ${err.message}`);
        });
      },
      startGlobalMonitoring,
      stopGlobalMonitoring,
      loadGlobalLogs,
      saveGlobalLog: (level: string, source: string, message: string, metadata?: any) => {
        saveGlobalLog(level, source, message, user?.id, user?.name, user?.email, metadata);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
      delete window.superDebug;
    };
  }, [isSuperAdmin, isVisible, user]);

  // Funções de teste
  const testDatabase = async () => {
    try {
      addLog('info', 'Test', 'Iniciando teste de banco de dados...');
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      addLog('info', 'Test', 'Banco de dados: ✅ Conectado');
      setTestResults(prev => prev + '\n✅ Database: OK');
    } catch (error) {
      addLog('error', 'Test', `Banco de dados: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ Database: ${error.message}`);
    }
  };

  const testFeedbackPost = async () => {
    try {
      addLog('info', 'Test', 'Testando POST feedback...');
      const response = await fetch('/.netlify/functions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Teste do painel debug',
          user: user?.name || 'Teste',
          timestamp: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('info', 'Test', 'POST Feedback: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ POST Feedback: OK');
    } catch (error) {
      addLog('error', 'Test', `POST Feedback: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ POST Feedback: ${error.message}`);
    }
  };

  const testDiagnosticGet = async () => {
    try {
      addLog('info', 'Test', 'Testando GET diagnóstico...');
      const response = await fetch('/api/diagnostic/test');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('info', 'Test', 'GET Diagnóstico: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ GET Diagnostic: OK');
    } catch (error) {
      addLog('error', 'Test', `GET Diagnóstico: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ GET Diagnostic: ${error.message}`);
    }
  };

  const testDiagnosticPost = async () => {
    try {
      addLog('info', 'Test', 'Testando POST diagnóstico...');
      const response = await fetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: '12345',
          responses: [{ questionId: 1, answer: 'Sim', score: 10 }]
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('info', 'Test', 'POST Diagnóstico: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ POST Diagnostic: OK');
    } catch (error) {
      addLog('error', 'Test', `POST Diagnóstico: ❌ ${error.message}`);
      setTestResults(prev => prev + `\n❌ POST Diagnostic: ${error.message}`);
    }
  };

  const testGoogleChatAlert = async () => {
    try {
      addLog('info', 'Test', 'Testando Google Chat...');
      const response = await fetch('/.netlify/functions/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🧪 TESTE GOOGLE CHAT\n\nUsuário: ${user?.name || 'Teste'}\nTimestamp: ${new Date().toLocaleString()}`,
          source: 'DebugPanel-Test'
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addLog('info', 'Test', 'Google Chat: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ Google Chat: OK');
    } catch (error) {
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
      addLog('info', 'Test', 'N8N Webhook: ✅ Funcionando');
      setTestResults(prev => prev + '\n✅ N8N: OK');
    } catch (error) {
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
    
    addLog('info', 'Test', 'Bateria de testes concluída');
    setTestResults(prev => prev + '\n\n🎉 Todos os testes concluídos!');
  };

  if (!isSuperAdmin) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {
            setIsVisible(true);
            setIsMinimized(false);
            addLog('debug', 'System', 'Painel aberto');
          }}
          className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center text-2xl border-4 border-white animate-pulse"
          title="Super Debug Panel Web Version (Ctrl+Shift+D)"
        >
          🛡️
        </button>

      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l-4 border-purple-600 flex flex-col z-50">
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
            { key: 'geral', label: 'Geral', icon: '📊' },
            { key: 'logs', label: 'Logs', icon: '📝' },
            { key: 'global', label: 'Global', icon: '🌐' },
            { key: 'testes', label: 'Testes', icon: '🧪' },
            { key: 'sistema', label: 'Sistema', icon: '💻' },
            { key: 'sessao', label: 'Sessão', icon: '🕐' },
            { key: 'roles', label: 'Roles', icon: '🔐' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-purple-600 border-b-2 border-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'geral' && (
            <div className="grid grid-cols-1 gap-4">
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

              {/* Status da Sessão */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  🔐 Status da Sessão
                </h4>
                <div className="text-sm space-y-2">
                  <div><strong>Autenticado:</strong> {user ? '✅ Sim' : '❌ Não'}</div>
                  <div><strong>Última Atividade:</strong> {new Date().toLocaleString()}</div>
                  <div><strong>Sessão Ativa:</strong> ✅ Ativa</div>
                </div>
              </div>

              {/* Métricas do Sistema */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  📈 Métricas do Sistema
                </h4>
                <div className="text-sm space-y-2">
                  <div><strong>Logs Capturados:</strong> {logs.length}/100</div>
                  <div><strong>Logs Globais:</strong> {globalLogs.length}/200</div>
                  <div><strong>Monitoramento Global:</strong> {isMonitoringGlobal ? '🟢 Ativo' : '🔴 Inativo'}</div>
                  <div><strong>Uptime:</strong> {Math.floor(performance.now() / 1000)}s</div>
                </div>
              </div>

              {/* Contador de Atividade */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  ⚡ Atividade
                </h4>
                <div className="text-sm space-y-2">
                  <div><strong>Total de Logs:</strong> {logCounter}</div>
                  <div><strong>Último Log:</strong> {logs[0]?.timestamp || 'Nenhum'}</div>
                  <div><strong>Nível Crítico:</strong> {logs.filter(l => l.level === 'error').length} erros</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Logs Locais ({logs.length}/100)</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogs([])}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    🗑️ Limpar
                  </button>
                  <button
                    onClick={() => {
                      const logsText = logs.map(log => 
                        `[${log.timestamp}] ${log.level.toUpperCase()} - ${log.source}: ${log.message}${log.userName ? ` (${log.userName})` : ''}`
                      ).join('\n');
                      navigator.clipboard.writeText(logsText);
                      addLog('info', 'System', 'Logs copiados para clipboard');
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    📋 Exportar
                  </button>
                </div>
              </div>
              
              <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-gray-500">Nenhum log registrado ainda...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className={`mb-1 ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'debug' ? 'text-blue-400' :
                      'text-green-400'
                    }`}>
                      <span className="text-gray-500">[{log.timestamp}]</span>
                      <span className="text-white ml-2">{log.level.toUpperCase()}</span>
                      <span className="text-cyan-400 ml-2">{log.source}:</span>
                      <span className="ml-2">{log.message}</span>
                      {log.userName && <span className="text-purple-400 ml-2">({log.userName})</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'global' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Logs Globais de Todos os Usuários</h3>
                <div className="flex gap-2">
                  {!isMonitoringGlobal ? (
                    <button
                      onClick={startGlobalMonitoring}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      🟢 Iniciar Monitoramento
                    </button>
                  ) : (
                    <button
                      onClick={stopGlobalMonitoring}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      🔴 Parar Monitoramento
                    </button>
                  )}
                  <button
                    onClick={loadGlobalLogs}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    🔄 Recarregar
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-2">
                <select 
                  value={globalLogFilter} 
                  onChange={(e) => setGlobalLogFilter(e.target.value as any)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="all">Todos os Logs</option>
                  <option value="errors">Apenas Erros</option>
                  <option value="warnings">Apenas Warnings</option>
                  <option value="info">Apenas Info</option>
                </select>
                <span className="text-sm text-gray-600 py-1">
                  {globalLogs.filter(log => 
                    globalLogFilter === 'all' || 
                    (globalLogFilter === 'errors' && log.level === 'error') ||
                    (globalLogFilter === 'warnings' && log.level === 'warn') ||
                    (globalLogFilter === 'info' && log.level === 'info')
                  ).length} logs filtrados
                </span>
              </div>
              
              <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-xs">
                {!isMonitoringGlobal ? (
                  <div className="text-yellow-400">⚠️ Monitoramento global desativado. Clique em "Iniciar Monitoramento" para ver logs de todos os usuários.</div>
                ) : globalLogs.length === 0 ? (
                  <div className="text-gray-500">Carregando logs globais...</div>
                ) : (
                  globalLogs
                    .filter(log => 
                      globalLogFilter === 'all' || 
                      (globalLogFilter === 'errors' && log.level === 'error') ||
                      (globalLogFilter === 'warnings' && log.level === 'warn') ||
                      (globalLogFilter === 'info' && log.level === 'info')
                    )
                    .map((log, index) => (
                    <div key={index} className={`mb-1 ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'debug' ? 'text-blue-400' :
                      'text-green-400'
                    }`}>
                      <span className="text-gray-500">[{log.timestamp}]</span>
                      <span className="text-white ml-2">{log.level.toUpperCase()}</span>
                      <span className="text-cyan-400 ml-2">{log.source}:</span>
                      <span className="ml-2">{log.message}</span>
                      <span className="text-purple-400 ml-2">
                        ({log.userName || 'Anônimo'} - {log.userEmail || log.userId || 'N/A'})
                      </span>
                    </div>
                  ))
                )}
              </div>

              {isMonitoringGlobal && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center gap-2 text-green-800">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium">Monitoramento Ativo</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Capturando logs de todos os usuários em tempo real. 
                    Total de logs: {globalLogs.length}/200
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'testes' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Testes do Sistema</h3>
              
              <button
                onClick={runAllTests}
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold text-lg"
              >
                🚀 Executar Todos os Testes
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={testDatabase}
                  className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  🗄️ Banco
                </button>
                <button
                  onClick={testFeedbackPost}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  📝 Feedback
                </button>
                <button
                  onClick={testDiagnosticGet}
                  className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  📊 Diag GET
                </button>
                <button
                  onClick={testDiagnosticPost}
                  className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                >
                  📈 Diag POST
                </button>
                <button
                  onClick={testGoogleChatAlert}
                  className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  💬 Google Chat
                </button>
                <button
                  onClick={testN8N}
                  className="p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                >
                  🔗 N8N
                </button>
              </div>

              <div className="bg-black text-green-400 p-4 rounded-lg h-48 overflow-y-auto font-mono text-xs">
                <pre>{testResults || 'Nenhum teste executado ainda...'}</pre>
              </div>
            </div>
          )}

          {activeTab === 'sistema' && (
            <div className="space-y-4">
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
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Informações da Sessão</h3>
              
              <div className="grid grid-cols-1 gap-3">
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
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Permissões e Roles</h3>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">🔐 Permissões Atuais</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Role Principal:</strong> {user?.role || 'N/A'}</div>
                    <div><strong>Super Admin:</strong> {isSuperAdmin ? '✅ Sim' : '❌ Não'}</div>
                    <div><strong>Debug Panel:</strong> ✅ Acesso Total</div>
                    <div><strong>Logs Globais:</strong> ✅ Permitido</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ações Rápidas */}
        <div className="bg-gray-50 p-3 border-t">
          <h4 className="font-semibold text-gray-800 mb-2 text-sm">⚡ Ações Rápidas</h4>
          <div className="space-y-2 text-xs">
            <input 
              type="text" 
              placeholder="56934" 
              className="w-full px-2 py-1 border rounded bg-white text-xs"
              readOnly
            />
            <input 
              type="text" 
              placeholder="https://app.grupoggv.com/api/webhook/diag-ggv-register" 
              className="w-full px-2 py-1 border rounded bg-white text-xs"
              readOnly
            />
            <input 
              type="text" 
              placeholder="https://api-test.ggvinteligencia.com.br/webhook/feedback-ggv-register" 
              className="w-full px-2 py-1 border rounded bg-white text-xs"
              readOnly
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-3 py-2 text-xs text-gray-500 flex justify-between items-center">
          <div>Ctrl+Shift+D: Toggle | Logs: {logs.length}/100</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
    </div>
  );
};

export default WebVersionDebugPanel;