import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { getSessionInfo } from '../../utils/sessionUtils';
import { supabase } from '../../services/supabaseClient';

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

interface SessionMetrics {
  totalSessions: number;
  activeTime: number;
  lastActivity: Date;
  refreshCount: number;
  errorCount: number;
}

export const EnhancedSessionDebugPanel: React.FC = () => {
  const { user } = useUser();
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('session');
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics>({
    totalSessions: 0,
    activeTime: 0,
    lastActivity: new Date(),
    refreshCount: 0,
    errorCount: 0
  });
  const [authData, setAuthData] = useState<any>(null);

  // Função para adicionar logs
  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const newLog: DebugLog = {
      id: `session-log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      data
    };
    setLogs(prev => [...prev.slice(-19), newLog]); // Manter últimos 20 logs
    console.log(`[SESSION] ${message}`, data);
  };

  // Atualizar informações da sessão
  useEffect(() => {
    const interval = setInterval(() => {
      const newSessionInfo = getSessionInfo();
      setSessionInfo(newSessionInfo);
      
      // Log mudanças importantes
      if (newSessionInfo.remainingHours < 24 && newSessionInfo.remainingHours % 6 === 0) {
        addLog('warn', `Sessão expira em ${newSessionInfo.remainingHours}h`, newSessionInfo);
      }
    }, 5000); // Atualizar a cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  // Carregar dados de autenticação
  const loadAuthData = async () => {
    addLog('info', 'Carregando dados de autenticação...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        addLog('error', `Erro ao carregar sessão: ${error.message}`, error);
        setAuthData({ error: error.message });
      } else {
        addLog('success', 'Dados de autenticação carregados', { hasSession: !!session });
        setAuthData(session);
      }
    } catch (err: any) {
      addLog('error', `Exceção ao carregar auth: ${err.message}`, err);
      setAuthData({ error: err.message });
    }
  };

  // Testar renovação de sessão
  const testSessionRenewal = async () => {
    addLog('info', 'Testando renovação de sessão...');
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        addLog('error', `Erro na renovação: ${error.message}`, error);
      } else {
        addLog('success', 'Sessão renovada com sucesso', data);
        setMetrics(prev => ({ ...prev, refreshCount: prev.refreshCount + 1 }));
      }
    } catch (err: any) {
      addLog('error', `Exceção na renovação: ${err.message}`, err);
      setMetrics(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
    }
  };

  // Limpar dados de sessão
  const clearSessionData = () => {
    addLog('warn', 'Limpando dados de sessão...');
    localStorage.removeItem('ggv-user-session');
    localStorage.removeItem('ggv-session-timestamp');
    addLog('success', 'Dados de sessão limpos - recarregue a página');
  };

  // Inicialização
  useEffect(() => {
    if (isVisible) {
      addLog('info', 'Painel de sessão iniciado');
      loadAuthData();
      setMetrics(prev => ({ 
        ...prev, 
        totalSessions: prev.totalSessions + 1,
        lastActivity: new Date()
      }));
    }
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:from-blue-700 hover:to-cyan-700 z-50 shadow-lg transform hover:scale-105 transition-all duration-200"
      >
        🕐 Debug Sessão
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-xl shadow-2xl w-96 max-h-96 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕐</span>
            <div>
              <h3 className="font-bold">Debug da Sessão</h3>
              <p className="text-xs opacity-90">Sistema de autenticação</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              addLog('info', 'Painel fechado');
            }}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 border-b">
        {[
          { key: 'session', label: 'Sessão', icon: '🕐' },
          { key: 'auth', label: 'Auth', icon: '🔐' },
          { key: 'logs', label: 'Logs', icon: '📝' },
          { key: 'tools', label: 'Ferramentas', icon: '🛠️' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-2 text-xs font-medium ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-64">
        {activeTab === 'session' && (
          <div className="space-y-3">
            {/* Status da Sessão */}
            <div className={`border rounded-lg p-3 ${
              sessionInfo.isLoggedIn && sessionInfo.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className={`font-semibold mb-2 ${
                sessionInfo.isLoggedIn && sessionInfo.isValid ? 'text-green-800' : 'text-red-800'
              }`}>
                🔍 Status Atual
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={sessionInfo.isLoggedIn ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {sessionInfo.isLoggedIn ? '🟢 Logado' : '🔴 Não logado'}
                  </span>
                </div>
                {sessionInfo.isLoggedIn && (
                  <>
                    <div className="flex justify-between">
                      <span>Usuário:</span>
                      <span className="font-mono text-xs">{sessionInfo.user?.email}</span>
                    </div>
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

            {/* Barra de Progresso */}
            {sessionInfo.isLoggedIn && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h5 className="font-semibold text-gray-800 mb-2">⏰ Progresso da Sessão</h5>
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

            {/* Métricas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="font-semibold text-blue-800 mb-2">📊 Métricas</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Sessões:</span>
                  <div className="font-mono font-medium">{metrics.totalSessions}</div>
                </div>
                <div>
                  <span className="text-gray-600">Renovações:</span>
                  <div className="font-mono font-medium">{metrics.refreshCount}</div>
                </div>
                <div>
                  <span className="text-gray-600">Erros:</span>
                  <div className="font-mono font-medium text-red-600">{metrics.errorCount}</div>
                </div>
                <div>
                  <span className="text-gray-600">Atividade:</span>
                  <div className="font-mono font-medium text-xs">{metrics.lastActivity.toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">🔐 Dados de Autenticação</h4>
              <button
                onClick={loadAuthData}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔄 Atualizar
              </button>
            </div>

            {authData ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                {authData.error ? (
                  <div className="text-red-600 text-sm">
                    ❌ Erro: {authData.error}
                  </div>
                ) : authData.access_token ? (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Access Token:</span>
                      <div className="font-mono text-xs bg-white p-1 rounded mt-1 break-all">
                        {authData.access_token.slice(0, 30)}...
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Refresh Token:</span>
                      <div className="font-mono text-xs bg-white p-1 rounded mt-1 break-all">
                        {authData.refresh_token?.slice(0, 30) || 'N/A'}...
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Expira em:</span>
                      <div className="font-mono text-xs">
                        {authData.expires_at ? new Date(authData.expires_at * 1000).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Tipo:</span>
                      <div className="font-mono text-xs">{authData.token_type || 'N/A'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm">
                    ℹ️ Nenhuma sessão ativa encontrada
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4 text-sm">
                Carregue os dados de autenticação
              </div>
            )}

            {/* User Info */}
            {user && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h5 className="font-semibold text-green-800 mb-2">👤 Usuário Logado</h5>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">ID:</span> <span className="font-mono text-xs">{user.id}</span></div>
                  <div><span className="font-medium">Email:</span> {user.email}</div>
                  <div><span className="font-medium">Nome:</span> {user.name}</div>
                  <div><span className="font-medium">Role:</span> 
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded ml-2 text-xs">
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">📝 Logs de Sessão</h4>
              <button
                onClick={() => {
                  setLogs([]);
                  addLog('info', 'Logs limpos');
                }}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                🗑️ Limpar
              </button>
            </div>
            
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-4 text-sm">
                  Nenhum log ainda
                </div>
              ) : (
                logs.slice().reverse().map(log => (
                  <div
                    key={log.id}
                    className={`p-2 rounded text-xs border-l-4 ${
                      log.level === 'error' ? 'bg-red-50 border-red-500' :
                      log.level === 'warn' ? 'bg-yellow-50 border-yellow-500' :
                      log.level === 'success' ? 'bg-green-50 border-green-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{log.message}</span>
                      <span className="text-gray-500 text-xs">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {log.data && (
                      <pre className="mt-1 text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2).slice(0, 100)}...
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">🛠️ Ferramentas de Sessão</h4>
            
            <div className="space-y-2">
              <button
                onClick={testSessionRenewal}
                className="w-full bg-green-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-green-700 font-medium"
              >
                🔄 Testar Renovação
              </button>
              
              <button
                onClick={clearSessionData}
                className="w-full bg-yellow-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-yellow-700 font-medium"
              >
                🗑️ Limpar Dados de Sessão
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify({
                    sessionInfo,
                    user,
                    authData,
                    metrics,
                    timestamp: new Date().toISOString()
                  }, null, 2));
                  addLog('success', 'Dados copiados para clipboard');
                }}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 font-medium"
              >
                📋 Copiar Dados Debug
              </button>
            </div>

            {/* Informações do Storage */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h5 className="font-semibold text-gray-800 mb-2">💾 Local Storage</h5>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Sessão GGV:</span>
                  <span className={localStorage.getItem('ggv-user-session') ? 'text-green-600' : 'text-red-600'}>
                    {localStorage.getItem('ggv-user-session') ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className={localStorage.getItem('ggv-session-timestamp') ? 'text-green-600' : 'text-red-600'}>
                    {localStorage.getItem('ggv-session-timestamp') ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Supabase Auth:</span>
                  <span className={Object.keys(localStorage).some(k => k.includes('supabase')) ? 'text-green-600' : 'text-red-600'}>
                    {Object.keys(localStorage).some(k => k.includes('supabase')) ? '✅' : '❌'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t px-4 py-2">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>Sessão: {sessionInfo.isLoggedIn ? sessionInfo.remainingHours + 'h' : 'N/A'}</span>
          <span>Logs: {logs.length}/20</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSessionDebugPanel;
