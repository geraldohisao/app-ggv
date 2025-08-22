import React, { useState, useEffect } from 'react';
import { getSessionInfo } from '../../utils/sessionUtils';

/**
 * Painel de debug para informações da sessão
 * Útil para verificar se o sistema de 100h está funcionando
 */
export const SessionDebugPanel: React.FC = () => {
  const [sessionInfo, setSessionInfo] = useState(getSessionInfo());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionInfo(getSessionInfo());
    }, 1000); // Atualizar a cada segundo

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 z-50"
      >
        Debug Sessão
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Debug da Sessão</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>Status:</strong>{' '}
          <span className={sessionInfo.isLoggedIn ? 'text-green-600' : 'text-red-600'}>
            {sessionInfo.isLoggedIn ? 'Logado' : 'Não logado'}
          </span>
        </div>
        
        {sessionInfo.isLoggedIn && (
          <>
            <div>
              <strong>Usuário:</strong> {sessionInfo.user?.email}
            </div>
            
            <div>
              <strong>Sessão válida:</strong>{' '}
              <span className={sessionInfo.isValid ? 'text-green-600' : 'text-red-600'}>
                {sessionInfo.isValid ? 'Sim' : 'Não'}
              </span>
            </div>
            
            <div>
              <strong>Idade da sessão:</strong> {sessionInfo.ageHours}h
            </div>
            
            <div>
              <strong>Tempo restante:</strong>{' '}
              <span className={sessionInfo.remainingHours > 24 ? 'text-green-600' : sessionInfo.remainingHours > 12 ? 'text-yellow-600' : 'text-red-600'}>
                {sessionInfo.remainingHours}h
              </span>
            </div>
            
            <div className="mt-3 bg-gray-100 rounded p-2">
              <div className="text-xs text-gray-600 mb-1">Progresso da sessão:</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    sessionInfo.remainingHours > 50 ? 'bg-green-500' :
                    sessionInfo.remainingHours > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.max(0, (sessionInfo.remainingHours / 100) * 100)}%`
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                {sessionInfo.remainingHours}/100 horas restantes
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionDebugPanel;
