import React from 'react';
import { EnhancedErrorBoundary } from '../debug/ErrorBoundary';
import { postCriticalAlert } from '../../src/utils/net';

type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // keep error logs minimal in prod; rely on monitoring if present
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          Ocorreu um erro. Tente novamente.
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrapper que usa o sistema de debug aprimorado
export const AppErrorBoundaryEnhanced: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <EnhancedErrorBoundary
      onError={(error, errorInfo) => {
        // Log para o sistema de debug
        if (typeof window !== 'undefined' && (window as any).debugLog) {
          (window as any).debugLog(
            `Erro na aplicação: ${error.message}`,
            'error',
            'app-error',
            {
              error: error.toString(),
              stack: error.stack,
              componentStack: errorInfo.componentStack
            }
          );
        }

        // Enviar alerta crítico
        try {
          postCriticalAlert({
            title: 'Erro na aplicação',
            message: error?.message || String(error),
            context: {
              url: typeof window !== 'undefined' ? window.location.href : '',
              stack: error?.stack || '',
              componentStack: errorInfo.componentStack,
              // Include logged user if available (stored by auth/session utilities)
              user: ((): any => {
                try {
                  const raw = localStorage.getItem('ggv-user') || sessionStorage.getItem('ggv-user') || localStorage.getItem('ggv-emergency-user');
                  return raw ? JSON.parse(raw) : undefined;
                } catch {
                  return undefined;
                }
              })(),
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
              appVersion: (typeof window !== 'undefined' && (window as any).__APP_VERSION__) || ''
            }
          });
        } catch {}
      }}
      fallback={({ error, retry }) => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <div className="text-6xl mb-4">🚨</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Oops! Algo deu errado
            </h1>
            <p className="text-gray-600 mb-6">
              Encontramos um problema inesperado. Nossa equipe foi notificada.
            </p>
            <div className="space-y-3">
              <button
                onClick={retry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
              >
                🔄 Tentar Novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 font-medium"
              >
                🔃 Recarregar Página
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Detalhes do erro (dev)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                  {error.toString()}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    >
      {children}
    </EnhancedErrorBoundary>
  );
};

export default AppErrorBoundary;


