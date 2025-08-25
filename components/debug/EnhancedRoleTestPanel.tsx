import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

export const EnhancedRoleTestPanel: React.FC = () => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('permissions');
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [testResults, setTestResults] = useState<any>({});

  // Função para adicionar logs
  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const newLog: DebugLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      data
    };
    setLogs(prev => [...prev.slice(-19), newLog]); // Manter últimos 20 logs
    console.log(`[ROLES] ${message}`, data);
  };

  useEffect(() => {
    if (isVisible) {
      addLog('info', 'Painel de roles iniciado');
    }
  }, [isVisible]);

  // Verificações de permissão
  const permissions = {
    canSeeFeedback: user?.role === UserRole.SuperAdmin || 
                   user?.user_function === 'Closer' || 
                   user?.user_function === 'Gestor',
    canSeeSettings: user?.role === UserRole.SuperAdmin || user?.role === UserRole.Admin,
    canSeeDebug: user?.role === UserRole.SuperAdmin,
    canManageUsers: user?.role === UserRole.SuperAdmin,
    canAccessAll: user?.role === UserRole.SuperAdmin
  };

  // Testes de funcionalidade
  const testDatabaseAccess = async () => {
    addLog('info', 'Testando acesso ao banco de dados...');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        addLog('error', `Erro no banco: ${error.message}`, error);
        setTestResults(prev => ({ ...prev, database: { success: false, error: error.message } }));
      } else {
        addLog('success', 'Acesso ao banco OK', data);
        setTestResults(prev => ({ ...prev, database: { success: true, data } }));
      }
    } catch (err: any) {
      addLog('error', `Exceção no banco: ${err.message}`, err);
      setTestResults(prev => ({ ...prev, database: { success: false, error: err.message } }));
    }
  };

  const testUserPermissions = () => {
    addLog('info', 'Testando permissões do usuário...');
    const permissionTests = Object.entries(permissions).map(([key, value]) => ({
      permission: key,
      granted: value
    }));
    
    addLog('success', 'Teste de permissões concluído', permissionTests);
    setTestResults(prev => ({ ...prev, permissions: permissionTests }));
  };

  const simulateRoleChange = (newRole: UserRole) => {
    addLog('warn', `Simulando mudança de role para: ${newRole}`, { 
      oldRole: user?.role, 
      newRole,
      note: 'Simulação apenas - não altera dados reais'
    });
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-16 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:from-purple-700 hover:to-blue-700 z-50 shadow-lg transform hover:scale-105 transition-all duration-200"
      >
        🔐 Debug Roles
      </button>
    );
  }

  return (
    <div className="fixed bottom-16 right-4 bg-white border-2 border-purple-500 rounded-xl shadow-2xl w-96 max-h-96 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <div>
              <h3 className="font-bold">Debug Roles & Acesso</h3>
              <p className="text-xs opacity-90">Sistema de permissões</p>
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
          { key: 'permissions', label: 'Permissões', icon: '🛡️' },
          { key: 'tests', label: 'Testes', icon: '🧪' },
          { key: 'logs', label: 'Logs', icon: '📝' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 text-sm font-medium ${
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
      <div className="p-4 overflow-y-auto max-h-64">
        {activeTab === 'permissions' && (
          <div className="space-y-3">
            {/* User Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">👤 Usuário Atual</h4>
              <div className="text-sm space-y-1">
                <div><strong>Nome:</strong> {user?.name || 'N/A'}</div>
                <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
                <div className="flex items-center gap-2">
                  <strong>Role:</strong>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user?.role === UserRole.SuperAdmin ? 'bg-red-100 text-red-800' :
                    user?.role === UserRole.Admin ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user?.role || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <strong>Função:</strong>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user?.user_function === 'Gestor' ? 'bg-blue-100 text-blue-800' :
                    user?.user_function === 'Closer' ? 'bg-green-100 text-green-800' :
                    user?.user_function === 'SDR' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user?.user_function || 'Não definida'}
                  </span>
                </div>
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="font-semibold text-gray-800 mb-2">🛡️ Matriz de Permissões</h4>
              <div className="space-y-2">
                {Object.entries(permissions).map(([key, granted]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {granted ? '✅ Permitido' : '❌ Negado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => window.location.href = '/opportunity-feedback'}
                disabled={!permissions.canSeeFeedback}
                className={`w-full text-sm px-3 py-2 rounded-lg font-medium ${
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
                className={`w-full text-sm px-3 py-2 rounded-lg font-medium ${
                  permissions.canSeeSettings 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ⚙️ Testar Acesso às Configurações
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">🧪 Testes de Sistema</h4>
            
            <div className="space-y-2">
              <button
                onClick={testDatabaseAccess}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 font-medium"
              >
                🗄️ Testar Acesso ao Banco
              </button>
              
              <button
                onClick={testUserPermissions}
                className="w-full bg-green-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-green-700 font-medium"
              >
                🛡️ Testar Permissões
              </button>
            </div>

            {/* Role Simulation */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h5 className="font-semibold text-yellow-800 mb-2">⚠️ Simulação de Roles</h5>
              <div className="space-y-1">
                {Object.values(UserRole).map(role => (
                  <button
                    key={role}
                    onClick={() => simulateRoleChange(role)}
                    className={`w-full text-xs px-2 py-1 rounded ${
                      user?.role === role 
                        ? 'bg-yellow-200 text-yellow-800 font-medium' 
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    {role === user?.role ? '➤ ' : ''}Simular {role}
                  </button>
                ))}
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                * Apenas simula - não altera dados reais
              </p>
            </div>

            {/* Test Results */}
            {Object.keys(testResults).length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h5 className="font-semibold text-gray-800 mb-2">📊 Resultados</h5>
                {Object.entries(testResults).map(([test, result]: [string, any]) => (
                  <div key={test} className="text-xs mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{test}:</span>
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.success ? '✅' : '❌'}
                      </span>
                    </div>
                    {result.error && (
                      <div className="text-red-600 mt-1">{result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">📝 Logs</h4>
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
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t px-4 py-2">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <span>Role: {user?.role}</span>
          <span>Logs: {logs.length}/20</span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedRoleTestPanel;
