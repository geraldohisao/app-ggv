import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { FinalUnifiedDebugPanel } from './FinalUnifiedDebugPanel';

/**
 * Painel de debug seguro para produção
 * - Só aparece em desenvolvimento ou para Super Admins
 * - Pode ser desabilitado via localStorage
 * - Interface minimalista em produção
 */
export const ProductionSafeDebugPanel: React.FC = () => {
  const { user } = useUser();
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Verificar ambiente
    const isProd = process.env.NODE_ENV === 'production';
    setIsProduction(isProd);

    // Verificar se é Super Admin
    const isSuperAdmin = user?.role === UserRole.SuperAdmin;

    // Verificar flag de localStorage (para Super Admins)
    const debugFlag = localStorage.getItem('ggv-debug-enabled');
    const debugEnabled = debugFlag === 'true';

    // Habilitar debug se:
    // 1. Não é produção, OU
    // 2. É Super Admin e flag está habilitada
    const shouldEnable = !isProd || (isSuperAdmin && debugEnabled);

    setIsDebugEnabled(shouldEnable);

    // Log de segurança
    if (isProd && isSuperAdmin && debugEnabled) {
      console.warn('🔒 DEBUG - Painel de debug habilitado em produção para Super Admin');
    }
  }, [user?.role]);

  // Em produção, mostrar apenas indicador minimalista para Super Admins
  if (isProduction && !isDebugEnabled) {
    return null;
  }

  // Em desenvolvimento ou Super Admin habilitado, mostrar painel completo
  if (!isProduction || isDebugEnabled) {
    return <FinalUnifiedDebugPanel />;
  }

  // Fallback: não mostrar nada
  return null;
};

/**
 * Hook para controlar debug em produção
 */
export const useDebugControl = () => {
  const { user } = useUser();
  const isSuperAdmin = user?.role === UserRole.SuperAdmin;
  const isProduction = process.env.NODE_ENV === 'production';

  const enableDebug = () => {
    if (isSuperAdmin) {
      localStorage.setItem('ggv-debug-enabled', 'true');
      window.location.reload();
    }
  };

  const disableDebug = () => {
    localStorage.removeItem('ggv-debug-enabled');
    window.location.reload();
  };

  const isDebugEnabled = () => {
    return !isProduction || localStorage.getItem('ggv-debug-enabled') === 'true';
  };

  return {
    isSuperAdmin,
    isProduction,
    isDebugEnabled: isDebugEnabled(),
    enableDebug,
    disableDebug
  };
};

/**
 * Componente de controle para Super Admins
 */
export const DebugControlPanel: React.FC = () => {
  const { isSuperAdmin, isProduction, isDebugEnabled, enableDebug, disableDebug } = useDebugControl();

  if (!isSuperAdmin || !isProduction) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-yellow-800 mb-2">
          🔧 Controle de Debug
        </div>
        <div className="space-y-2">
          <div className="text-xs text-yellow-700">
            Status: {isDebugEnabled ? '✅ Habilitado' : '❌ Desabilitado'}
          </div>
          <div className="flex gap-2">
            {!isDebugEnabled ? (
              <button
                onClick={enableDebug}
                className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
              >
                Habilitar Debug
              </button>
            ) : (
              <button
                onClick={disableDebug}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Desabilitar Debug
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
