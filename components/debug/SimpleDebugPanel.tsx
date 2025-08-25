import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { UserRole } from '../../types';

export const SimpleDebugPanel: React.FC = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  // Log para debug
  console.log('🔥 SimpleDebugPanel - Renderizando sempre');
  console.log('🔥 User:', user);
  console.log('🔥 User role:', user?.role);

  // Verificar acesso (temporariamente mais permissivo)
  const hasAccess = user?.role === UserRole.SuperAdmin || 
                   user?.role === UserRole.Admin || 
                   user !== null; // Qualquer usuário logado

  console.log('🔥 Has access:', hasAccess);

  // SEMPRE renderizar algo para debug
  return (
    <div className="fixed top-20 right-4 z-50">
      {/* Indicador sempre visível */}
      <div className="bg-red-500 text-white p-2 rounded mb-2 text-xs">
        🔥 Debug: {user ? 'Logado' : 'Não logado'}
      </div>

      {/* Botão de acesso */}
      {hasAccess && (
        <button
          onClick={() => {
            console.log('🔥 Botão clicado!');
            setIsOpen(!isOpen);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg mb-2 block w-full"
        >
          {isOpen ? '❌ Fechar' : '🛡️ Debug Panel'}
        </button>
      )}

      {/* Painel principal */}
      {isOpen && hasAccess && (
        <div className="bg-white border-2 border-blue-500 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <h3 className="font-bold text-lg mb-3 text-blue-800">🛡️ Debug Panel</h3>
          
          {/* Info do usuário */}
          <div className="bg-gray-100 p-3 rounded mb-3">
            <h4 className="font-semibold mb-2">👤 Usuário</h4>
            <div className="text-sm space-y-1">
              <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
              <div><strong>Nome:</strong> {user?.name || 'N/A'}</div>
              <div><strong>Role:</strong> 
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded ml-2 text-xs">
                  {user?.role || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="space-y-2">
            <h4 className="font-semibold">🧪 Testes Rápidos</h4>
            
            <button
              onClick={() => {
                console.log('🔥 Teste 1: Log simples');
                alert('Teste 1: Log enviado para console!');
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm"
            >
              📝 Teste Log
            </button>

            <button
              onClick={async () => {
                console.log('🔥 Teste 2: Testando fetch...');
                try {
                  const response = await fetch('/api/test', { method: 'HEAD' });
                  console.log('🔥 Response status:', response.status);
                  alert(`Teste 2: Status ${response.status}`);
                } catch (error) {
                  console.log('🔥 Fetch error:', error);
                  alert('Teste 2: Erro na requisição (normal)');
                }
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded text-sm"
            >
              🌐 Teste API
            </button>

            <button
              onClick={() => {
                console.log('🔥 Teste 3: Info do sistema');
                const info = {
                  url: window.location.href,
                  userAgent: navigator.userAgent.slice(0, 50),
                  online: navigator.onLine,
                  language: navigator.language
                };
                console.log('🔥 System info:', info);
                alert('Teste 3: Info enviada para console!');
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-sm"
            >
              💻 Info Sistema
            </button>

            <button
              onClick={() => {
                console.log('🔥 Teste 4: Simulando erro...');
                try {
                  throw new Error('Erro simulado para teste');
                } catch (error) {
                  console.error('🔥 Erro capturado:', error);
                  alert('Teste 4: Erro simulado (veja console)');
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm"
            >
              💥 Simular Erro
            </button>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-600">
            <div>🕐 {new Date().toLocaleTimeString()}</div>
            <div>🌍 {window.location.hostname}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDebugPanel;