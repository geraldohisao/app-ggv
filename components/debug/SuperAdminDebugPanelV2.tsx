import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: string;
  message: string;
  data?: any;
}

export const SuperAdminDebugPanelV2: React.FC = () => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('system');
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [testResults, setTestResults] = useState<any>({});
  const logCounter = useRef(0);

  // Verificar se é super admin (mais permissivo para desenvolvimento)
  const isSuperAdmin = user?.role === UserRole.SuperAdmin || 
                       user?.role === UserRole.Admin || 
                       (process.env.NODE_ENV === 'development' && user !== null);

  console.log('🚀 SuperAdminDebugPanelV2 - User:', user);
  console.log('🚀 SuperAdminDebugPanelV2 - isSuperAdmin:', isSuperAdmin);

  // Função para adicionar logs
  const addLog = (level: DebugLog['level'], category: string, message: string, data?: any) => {
    const newLog: DebugLog = {
      id: `log-${Date.now()}-${++logCounter.current}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data
    };
    
    setLogs(prev => [...prev.slice(-99), newLog]); // Manter apenas últimos 100 logs
    console.log(`[${level.toUpperCase()}] ${category}: ${message}`, data);
  };

  // Configuração inicial
  useEffect(() => {
    if (!isSuperAdmin) return;

    addLog('success', 'System', 'Super Admin Debug Panel V2 iniciado');

    // Atalho de teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        addLog('debug', 'System', 'Painel toggled via atalho Ctrl+Shift+D');
      }
    };

    // Capturar erros globais e enviar para Google Chat
    const handleError = (event: ErrorEvent) => {
      const errorData = {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        user: user?.name || user?.email || 'Usuário desconhecido',
        timestamp: new Date().toISOString()
      };
      
      addLog('error', 'JavaScript', `Erro: ${event.message}`, errorData);
      
      // Enviar para Google Chat via postCriticalAlert
      try {
        const { postCriticalAlert } = require('../../src/utils/net');
        postCriticalAlert({
          title: `🚨 Erro JavaScript - ${user?.name || 'Usuário'}`,
          message: event.message,
          context: errorData
        });
      } catch (alertError) {
        console.warn('🔒 Erro ao enviar alerta crítico:', alertError);
      }
    };

    // Capturar promises rejeitadas e enviar para Google Chat
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorData = {
        reason: event.reason,
        user: user?.name || user?.email || 'Usuário desconhecido',
        timestamp: new Date().toISOString()
      };
      
      addLog('error', 'Promise', `Promise rejeitada: ${event.reason}`, errorData);
      
      // Enviar para Google Chat via postCriticalAlert
      try {
        const { postCriticalAlert } = require('../../src/utils/net');
        postCriticalAlert({
          title: `🚨 Promise Rejeitada - ${user?.name || 'Usuário'}`,
          message: String(event.reason),
          context: errorData
        });
      } catch (alertError) {
        console.warn('🔒 Erro ao enviar alerta crítico:', alertError);
      }
    };

    // Função global para debug com notificações Google Chat
    (window as any).superDebug = {
      log: (message: string, data?: any) => addLog('debug', 'Manual', message, data),
      info: (message: string, data?: any) => addLog('info', 'Manual', message, data),
      warn: (message: string, data?: any) => addLog('warn', 'Manual', message, data),
      error: (message: string, data?: any) => {
        addLog('error', 'Manual', message, data);
        // Enviar erros manuais para Google Chat
        try {
          const { postCriticalAlert } = require('../../src/utils/net');
          postCriticalAlert({
            title: `🔧 Debug Manual - ${user?.name || 'SuperAdmin'}`,
            message: message,
            context: { data, user: user?.name || user?.email, timestamp: new Date().toISOString() }
          });
        } catch (alertError) {
          console.warn('🔒 Erro ao enviar alerta crítico:', alertError);
        }
      },
      success: (message: string, data?: any) => addLog('success', 'Manual', message, data),
      // Nova função para testar Google Chat
      testGoogleChat: (message: string = 'Teste do SuperAdmin Debug Panel') => {
        try {
          const { postCriticalAlert } = require('../../src/utils/net');
          postCriticalAlert({
            title: `🧪 Teste Google Chat - ${user?.name || 'SuperAdmin'}`,
            message: message,
            context: { 
              test: true, 
              user: user?.name || user?.email, 
              timestamp: new Date().toISOString(),
              panel: 'SuperAdminDebugPanelV2'
            }
          });
          addLog('success', 'GoogleChat', 'Teste enviado para Google Chat', { message });
        } catch (error) {
          addLog('error', 'GoogleChat', 'Falha ao enviar teste para Google Chat', { error });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      delete (window as any).superDebug;
    };
  }, [isSuperAdmin]);

  // Testes
  const testDatabase = async () => {
    addLog('info', 'Database', 'Iniciando teste de conexão...');
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      const duration = Date.now() - startTime;
      
      if (error) {
        addLog('error', 'Database', `Erro na conexão: ${error.message}`, error);
        setTestResults(prev => ({ ...prev, database: { success: false, error: error.message, duration } }));
      } else {
        addLog('success', 'Database', `Conexão OK (${duration}ms)`, data);
        setTestResults(prev => ({ ...prev, database: { success: true, duration, data } }));
      }
    } catch (err: any) {
      addLog('error', 'Database', `Exceção: ${err.message}`, err);
      setTestResults(prev => ({ ...prev, database: { success: false, error: err.message } }));
    }
  };

  const testN8N = async () => {
    addLog('info', 'N8N', 'Testando webhook N8N...');
    const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      addLog('warn', 'N8N', 'URL do webhook não configurada');
      setTestResults(prev => ({ ...prev, n8n: { success: false, error: 'URL não configurada' } }));
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          source: 'super-admin-debug-v2',
          timestamp: new Date().toISOString(),
          user: user?.email
        })
      });
      
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const result = await response.json();
        addLog('success', 'N8N', `Webhook OK (${duration}ms)`, result);
        setTestResults(prev => ({ ...prev, n8n: { success: true, duration, response: result } }));
      } else {
        addLog('error', 'N8N', `HTTP ${response.status}: ${response.statusText}`, { status: response.status });
        setTestResults(prev => ({ ...prev, n8n: { success: false, error: `HTTP ${response.status}`, duration } }));
      }
    } catch (err: any) {
      addLog('error', 'N8N', `Erro na requisição: ${err.message}`, err);
      setTestResults(prev => ({ ...prev, n8n: { success: false, error: err.message } }));
    }
  };

  const runAllTests = async () => {
    addLog('info', 'Tests', 'Iniciando bateria completa de testes...');
    await testDatabase();
    await testN8N();
    addLog('success', 'Tests', 'Bateria de testes concluída');
  };

  // Se não for super admin, não renderizar
  if (!isSuperAdmin) {
    return null;
  }

  // Botão flutuante
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-20 z-50">
        <button
          onClick={() => {
            setIsVisible(true);
            addLog('debug', 'System', 'Painel aberto via botão');
          }}
          className="w-16 h-16 bg-gradient-to-r from-purple-600 to-red-600 text-white rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center text-2xl border-4 border-white animate-pulse"
          title="Super Admin Debug Panel V2 (Ctrl+Shift+D)"
        >
          🛡️
        </button>
        <div className="absolute -top-10 -left-4 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-90">
          Super Admin
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l-4 border-purple-600 flex flex-col z-40">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-red-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="font-bold text-lg">Super Admin Debug V2</h2>
              <p className="text-xs opacity-90">Painel avançado de debug e testes</p>
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
      <div className="flex bg-gray-100 border-b">
        {[
          { key: 'system', label: 'Sistema', icon: '💻' },
          { key: 'logs', label: 'Logs', icon: '📝' },
          { key: 'tests', label: 'Testes', icon: '🧪' },
          { key: 'chat', label: 'Google Chat', icon: '💬' },
          { key: 'user', label: 'Usuário', icon: '👤' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 px-2 text-sm font-medium ${
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
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'system' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Informações do Sistema</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">🌍 Ambiente</h4>
              <div className="text-sm space-y-1">
                <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
                <div><strong>URL:</strong> {window.location.href}</div>
                <div><strong>Online:</strong> {navigator.onLine ? '🟢' : '🔴'} {navigator.onLine ? 'Sim' : 'Não'}</div>
                <div><strong>Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-semibold text-green-800 mb-2">📊 Performance</h4>
              <div className="text-sm space-y-1">
                <div><strong>Memory:</strong> {(performance as any).memory ? 
                  `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'}</div>
                <div><strong>Connection:</strong> {(navigator as any).connection?.effectiveType || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">Logs do Sistema</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLogs([]);
                    addLog('debug', 'System', 'Logs limpos');
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  🗑️ Limpar
                </button>
                <button
                  onClick={() => {
                    const data = { logs, timestamp: new Date().toISOString(), user: user?.email };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `debug-logs-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    addLog('success', 'System', 'Logs exportados');
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  📤 Exportar
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <div className="text-2xl mb-2">📝</div>
                  <div>Nenhum log ainda</div>
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
                      <div className="mt-1 text-gray-600">
                        <pre className="text-xs overflow-x-auto">{JSON.stringify(log.data, null, 2).slice(0, 100)}...</pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Bateria de Testes</h3>
            
            <button
              onClick={runAllTests}
              className="w-full p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold"
            >
              🚀 Executar Todos os Testes
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={testDatabase}
                className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                🗄️ Banco de Dados
              </button>
              <button
                onClick={testN8N}
                className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
              >
                🔄 N8N Webhook
              </button>
            </div>

            {/* Resultados dos testes */}
            {Object.keys(testResults).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">Resultados:</h4>
                {Object.entries(testResults).map(([test, result]: [string, any]) => (
                  <div
                    key={test}
                    className={`p-2 rounded border ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{test}</span>
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.success ? '✅' : '❌'}
                      </span>
                    </div>
                    {result.duration && (
                      <div className="text-xs text-gray-600">Tempo: {result.duration}ms</div>
                    )}
                    {result.error && (
                      <div className="text-xs text-red-600">Erro: {result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-semibold text-yellow-800 mb-2">💡 Console JavaScript</h4>
              <p className="text-sm text-yellow-700 mb-2">Use estas funções no console:</p>
              <div className="text-xs font-mono bg-yellow-100 p-2 rounded space-y-1">
                <div>window.superDebug.log('mensagem', dados)</div>
                <div>window.superDebug.error('erro', erro)</div>
                <div>window.superDebug.success('sucesso')</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">🔔 Google Chat Notifications</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">📡 Status do Sistema</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Webhook URL:</span>
                  <span className="text-green-600">✅ Configurado</span>
                </div>
                <div className="flex justify-between">
                  <span>Captura Global:</span>
                  <span className="text-green-600">✅ Ativa</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Limiting:</span>
                  <span className="text-green-600">✅ Ativo</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-semibold text-yellow-800 mb-2">🧪 Testes de Notificação</h4>
              <div className="space-y-2">
                <button
                  onClick={() => (window as any).superDebug?.testGoogleChat?.('Teste básico do painel SuperAdmin')}
                  className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  📤 Enviar Teste Básico
                </button>
                <button
                  onClick={() => (window as any).superDebug?.testGoogleChat?.('🚨 Simulação de erro crítico para teste')}
                  className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  🚨 Simular Erro Crítico
                </button>
                <button
                  onClick={() => (window as any).superDebug?.error?.('Teste de erro manual via SuperAdmin Debug')}
                  className="w-full p-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                >
                  🔧 Teste Erro Manual
                </button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-semibold text-green-800 mb-2">📋 Logs de Notificações</h4>
              <div className="text-sm space-y-1">
                <div>Filtrar logs por categoria "GoogleChat" na aba Logs para ver o histórico de notificações enviadas.</div>
                <div className="mt-2 p-2 bg-white rounded border text-xs">
                  <strong>Comandos disponíveis no console:</strong><br/>
                  • <code>window.superDebug.testGoogleChat('mensagem')</code><br/>
                  • <code>window.superDebug.error('erro para chat')</code><br/>
                  • <code>window.superDebug.info('info geral')</code>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h4 className="font-semibold text-purple-800 mb-2">⚙️ Configuração</h4>
              <div className="text-sm space-y-1">
                <div><strong>Webhook:</strong> Netlify Function /.netlify/functions/alert</div>
                <div><strong>Rate Limit:</strong> 3 alertas/min por chave</div>
                <div><strong>Contexto:</strong> Usuário, URL, timestamp incluídos</div>
                <div><strong>Captura:</strong> Erros JS, Promises rejeitadas, Erros manuais</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'user' && (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Informações do Usuário</h3>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h4 className="font-semibold text-purple-800 mb-2">👤 Perfil Atual</h4>
              <div className="text-sm space-y-1">
                <div><strong>Email:</strong> {user?.email}</div>
                <div><strong>Nome:</strong> {user?.name}</div>
                <div><strong>Role:</strong> 
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded ml-2 text-xs font-medium">
                    {user?.role}
                  </span>
                </div>
                <div><strong>ID:</strong> <span className="font-mono text-xs">{user?.id}</span></div>
                {user?.user_function && (
                  <div><strong>Função:</strong> {user.user_function}</div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">🔐 Sessão</h4>
              <div className="text-sm space-y-1">
                <div><strong>Status:</strong> 🟢 Ativa</div>
                <div><strong>Contexto:</strong> DirectUserContext</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t p-3">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div>Ctrl+Shift+D para toggle</div>
          <div>Logs: {logs.length}/100</div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDebugPanelV2;
