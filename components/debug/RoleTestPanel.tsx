import React, { useState } from 'react';
import { useUser } from '../../contexts/DirectUserContext';

/**
 * Painel de debug para testar diferentes roles e funções
 * Útil para verificar se as restrições de acesso estão funcionando
 */
export const RoleTestPanel: React.FC = () => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-16 right-4 bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600 z-50"
      >
        Debug Roles
      </button>
    );
  }

  const canSeeFeedback = user?.role === 'SUPER_ADMIN' ||
                        user?.role === 'ADMIN' ||
                        user?.user_function === 'Closer' ||
                        user?.user_function === 'Gestor';

  return (
    <div className="fixed bottom-16 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Debug Roles & Acesso</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>Usuário:</strong> {user?.name || 'N/A'}
        </div>
        
        <div>
          <strong>Email:</strong> {user?.email || 'N/A'}
        </div>
        
        <div>
          <strong>Role:</strong>{' '}
          <span className={`px-2 py-1 rounded text-xs ${
            user?.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' :
            user?.role === 'ADMIN' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {user?.role || 'N/A'}
          </span>
        </div>
        
        <div>
          <strong>Função Comercial:</strong>{' '}
          <span className={`px-2 py-1 rounded text-xs ${
            user?.user_function === 'Gestor' ? 'bg-blue-100 text-blue-800' :
            user?.user_function === 'Closer' ? 'bg-green-100 text-green-800' :
            user?.user_function === 'SDR' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {user?.user_function || 'Não definida'}
          </span>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="mb-2">
            <strong>Permissões:</strong>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Feedback de Oportunidade:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                canSeeFeedback ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {canSeeFeedback ? 'Permitido' : 'Negado'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Configurações:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') ? 'Permitido' : 'Negado'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <strong>Regras de Acesso:</strong>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• <strong>Feedback:</strong> Admin, SuperAdmin, Closer, Gestor</li>
              <li>• <strong>Configurações:</strong> Admin, SuperAdmin</li>
              <li>• <strong>SDR:</strong> Acesso limitado (sem feedback)</li>
            </ul>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => window.location.href = '/feedback'}
            className={`w-full text-xs px-3 py-2 rounded ${
              canSeeFeedback 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!canSeeFeedback}
          >
            Testar Acesso ao Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleTestPanel;
