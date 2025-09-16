import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { UserRole } from '../../types';

/**
 * Componente temporário para facilitar teste do debug panel
 * Remove após os testes
 */
export const TestDebugAccess: React.FC = () => {
  const { user } = useUser();

  console.log('🧪 TestDebugAccess - User:', user);
  console.log('🧪 TestDebugAccess - NODE_ENV:', process.env.NODE_ENV);

  if (!user) {
    console.log('🧪 TestDebugAccess - No user, returning null');
    return null;
  }

  const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isDebugEnabled = user?.role === UserRole.SuperAdmin || 
                        (isLocalDevelopment && user !== null);

  console.log('🧪 TestDebugAccess - Debug enabled:', isDebugEnabled);

  return (
    <div className="fixed top-4 left-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 z-50 max-w-sm">
      <h3 className="font-bold text-yellow-800 mb-2">🧪 Debug Access Status</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Usuário:</strong> {user.email}
        </div>
        <div>
          <strong>Role:</strong> {user.role}
        </div>
        <div>
          <strong>Debug Habilitado:</strong> 
          <span className={isDebugEnabled ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
            {isDebugEnabled ? ' ✅ SIM' : ' ❌ NÃO'}
          </span>
        </div>
        <div>
          <strong>Ambiente:</strong> {process.env.NODE_ENV}
        </div>
      </div>
      
      {isDebugEnabled && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
          <div className="text-green-800 font-semibold mb-1">🎉 Debug Ativo!</div>
          <div className="text-xs text-green-700 mb-2">
            Pressione <kbd className="bg-white px-1 rounded">Ctrl+Shift+D</kbd> ou procure o botão 🛡️
          </div>
          <button
            onClick={() => {
              console.log('🧪 Botão de teste clicado!');
              // Tentar abrir o painel via JavaScript
              const event = new KeyboardEvent('keydown', {
                key: 'D',
                ctrlKey: true,
                shiftKey: true,
                bubbles: true
              });
              window.dispatchEvent(event);
            }}
            className="w-full px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            🛡️ Abrir Painel Debug
          </button>
        </div>
      )}

      {!isDebugEnabled && user.role === UserRole.User && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
          <div className="text-red-800 font-semibold mb-1">❌ Sem Acesso</div>
          <div className="text-xs text-red-700">
            Role atual: USER - Precisa ser SUPER_ADMIN ou ADMIN
          </div>
        </div>
      )}
    </div>
  );
};

export default TestDebugAccess;
