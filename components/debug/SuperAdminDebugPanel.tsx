import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';

// Ícones usando Unicode
const Icons = {
  bug: '🐛',
  system: '⚙️',
  network: '🌐',
  storage: '💾',
  auth: '🔐',
  database: '🗄️',
  api: '🔌',
  diagnostic: '📊',
  n8n: '🔄',
  close: '✕',
  clear: '🗑️',
  export: '📤',
  refresh: '🔄',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  debug: '🔧',
  success: '✅',
  expand: '📋',
  minimize: '📄',
  test: '🧪',
  shield: '🛡️',
  check: '✓'
};

export const SuperAdminDebugPanel: React.FC = () => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('system');
  const [isMinimized, setIsMinimized] = useState(false);

  // Verificar se o usuário é super admin
  // Só permitir acesso para SuperAdmin ou em desenvolvimento local (localhost)
  const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isSuperAdmin = user?.role === UserRole.SuperAdmin || 
                       (isLocalDevelopment && user !== null);

  console.log('🛡️ SuperAdminDebugPanel - User:', user);
  console.log('🛡️ SuperAdminDebugPanel - isSuperAdmin:', isSuperAdmin);
  console.log('🛡️ SuperAdminDebugPanel - NODE_ENV:', process.env.NODE_ENV);
  console.log('🛡️ SuperAdminDebugPanel - isVisible:', isVisible);
  console.log('🛡️ SuperAdminDebugPanel - Renderizando componente...');

  // Configurar captura de logs
  useEffect(() => {
    if (!isSuperAdmin) return;

    console.log('🛡️ SuperAdminDebugPanel - Inicializando...');

    // Função global para adicionar logs
    (window as any).superDebugLog = (
      level: string = 'debug',
      category: string = 'Manual',
      message: string,
      data?: any
    ) => {
      console.log(`[${level.toUpperCase()}] ${category}: ${message}`, data);
    };

    // Atalhos de teclado
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        console.log('🛡️ Atalho Ctrl+Shift+D pressionado!');
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      delete (window as any).superDebugLog;
    };
  }, [isSuperAdmin]);

  // Se não for super admin, não mostrar nada
  if (!isSuperAdmin) {
    console.log('🛡️ SuperAdminDebugPanel - Usuário não é super admin, não renderizando');
    return null;
  }

  // Botão flutuante quando minimizado
  if (!isVisible) {
    return (
      <div
        className="fixed bottom-4 left-4"
        style={{ zIndex: 99999 }}
      >
        <button
          onClick={() => {
            console.log('🛡️ Botão flutuante clicado!');
            setIsVisible(true);
          }}
          className="w-20 h-20 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-700 flex items-center justify-center text-3xl border-4 border-yellow-400 animate-pulse"
          title="Super Admin Debug Panel (Ctrl+Shift+D)"
        >
          🛡️
        </button>
        <div className="absolute -top-12 -left-8 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap">
          Super Debug
        </div>
      </div>
    );
  }

  const testDatabase = async () => {
    console.log('🧪 Testando conexão com banco...');
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) {
        console.error('❌ Erro no banco:', error);
      } else {
        console.log('✅ Banco OK:', data);
      }
    } catch (err) {
      console.error('❌ Exceção no banco:', err);
    }
  };

  const testN8N = async () => {
    console.log('🧪 Testando N8N...');
    const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('⚠️ URL do webhook N8N não configurada');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, source: 'debug-panel' })
      });
      
      if (response.ok) {
        console.log('✅ N8N OK');
      } else {
        console.error('❌ N8N Erro:', response.status);
      }
    } catch (err) {
      console.error('❌ N8N Exceção:', err);
    }
  };

  const runAllTests = async () => {
    console.log('🚀 Executando todos os testes...');
    await testDatabase();
    await testN8N();
    console.log('🎉 Todos os testes concluídos!');
  };

  return (
    <div 
      className="fixed inset-y-0 right-0 bg-white shadow-2xl border-l-4 border-red-500 flex flex-col"
      style={{ 
        width: isMinimized ? '80px' : '500px',
        zIndex: 9999,
        transition: 'width 0.3s ease-in-out'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-purple-50">
        {!isMinimized && (
          <div className="flex items-center gap-3">
            <span className="text-2xl">{Icons.shield}</span>
            <div>
              <h2 className="font-bold text-gray-900">Super Admin Debug</h2>
              <p className="text-xs text-gray-600">Painel de debug avançado</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? Icons.expand : Icons.minimize}
          </button>
          <button
            onClick={() => {
              console.log('🛡️ Fechando painel');
              setIsVisible(false);
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Fechar"
          >
            {Icons.close}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
            {[
              { key: 'system', label: 'Sistema', icon: Icons.system },
              { key: 'auth', label: 'Auth', icon: Icons.auth },
              { key: 'database', label: 'DB', icon: Icons.database },
              { key: 'n8n', label: 'N8N', icon: Icons.n8n },
              { key: 'tests', label: 'Testes', icon: Icons.test }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-red-600 border-b-2 border-red-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'system' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Informações do Sistema</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Ambiente</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
                    <div><strong>URL:</strong> {window.location.href}</div>
                    <div><strong>User Agent:</strong> {navigator.userAgent.slice(0, 50)}...</div>
                    <div><strong>Online:</strong> {navigator.onLine ? '🟢 Sim' : '🔴 Não'}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'auth' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Autenticação</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Usuário Atual</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Email:</strong> {user?.email}</div>
                    <div><strong>Nome:</strong> {user?.name}</div>
                    <div><strong>Role:</strong> 
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded ml-2 text-xs">
                        {user?.role}
                      </span>
                    </div>
                    <div><strong>ID:</strong> {user?.id}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Banco de Dados</h3>
                  <button
                    onClick={testDatabase}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    {Icons.test} Testar
                  </button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Clique em "Testar" para verificar a conexão com o Supabase.
                    Os resultados aparecerão no console do navegador.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'n8n' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Integração N8N</h3>
                  <button
                    onClick={testN8N}
                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                  >
                    {Icons.test} Testar
                  </button>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">Configuração</h4>
                  <div className="text-sm">
                    <strong>Webhook URL:</strong> {
                      process.env.REACT_APP_N8N_WEBHOOK_URL ? 
                      `${Icons.check} Configurada` : 
                      `${Icons.error} Não configurada`
                    }
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Bateria de Testes</h3>
                <button
                  onClick={runAllTests}
                  className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                    {Icons.test} Executar Todos os Testes
                  </div>
                  <div className="text-sm opacity-90 mt-1">
                    Testa banco, N8N e outras funcionalidades
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={testDatabase}
                    className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    {Icons.database} Banco
                  </button>
                  <button
                    onClick={testN8N}
                    className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                  >
                    {Icons.n8n} N8N
                  </button>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">Console do Navegador</h4>
                  <p className="text-sm text-yellow-800">
                    Abra o Console (F12) para ver os resultados detalhados dos testes.
                    Todos os logs são exibidos lá com emojis para fácil identificação.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>Ctrl+Shift+D: Toggle</span>
                <span>F12: Console</span>
              </div>
              <div>
                Super Admin: {user?.email}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminDebugPanel;