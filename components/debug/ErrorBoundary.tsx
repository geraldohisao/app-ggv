import React from 'react';

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo: ErrorInfo; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class EnhancedErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ERROR BOUNDARY] Erro capturado:', error);
    console.error('[ERROR BOUNDARY] Info do componente:', errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Enviar erro para o sistema de debug
    if (typeof window !== 'undefined' && (window as any).debugLog) {
      (window as any).debugLog(
        `Erro no componente: ${error.message}`,
        'error',
        'error-boundary',
        {
          error: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }
      );
    }

    // Callback customizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry após 5 segundos para erros não críticos
    if (!this.isRecoverableError(error)) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, 5000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isRecoverableError(error: Error): boolean {
    // Lista de erros que não devem ter retry automático
    const nonRecoverableErrors = [
      'ChunkLoadError',
      'Loading chunk',
      'Loading CSS chunk',
      'Script error'
    ];

    return !nonRecoverableErrors.some(pattern => 
      error.message.includes(pattern) || error.name.includes(pattern)
    );
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (typeof window !== 'undefined' && (window as any).debugLog) {
      (window as any).debugLog(
        'Tentativa de recuperação automática do erro',
        'info',
        'error-boundary'
      );
    }
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Se há um componente de fallback personalizado, usar ele
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            retry={this.handleRetry}
          />
        );
      }

      // Fallback padrão
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg m-4">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Ops! Algo deu errado
            </h3>
            <p className="text-red-600 text-sm mb-4">
              {this.state.error.message || 'Ocorreu um erro inesperado'}
            </p>
            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                🔄 Tentar Novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium ml-2"
              >
                🔃 Recarregar Página
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-red-700 hover:text-red-800">
                  Ver detalhes técnicos
                </summary>
                <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto">
                  <div className="mb-2">
                    <strong>Erro:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.error.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </div>
                  )}
                  <div>
                    <strong>Componente:</strong>
                    <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para capturar erros em componentes funcionais
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    console.error('[USE ERROR HANDLER] Erro capturado:', error);
    
    if (typeof window !== 'undefined' && (window as any).debugLog) {
      (window as any).debugLog(
        `Erro capturado: ${error.message}`,
        'error',
        'error-handler',
        {
          error: error.toString(),
          stack: error.stack,
          errorInfo
        }
      );
    }
  }, []);

  // Configurar handler global para promises rejeitadas
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { reason: event.reason }
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [handleError]);

  return { handleError };
};

// Componente wrapper para facilitar o uso
export const ErrorBoundaryWrapper: React.FC<{
  children: React.ReactNode;
  name?: string;
}> = ({ children, name = 'Component' }) => {
  return (
    <EnhancedErrorBoundary
      onError={(error, errorInfo) => {
        if (typeof window !== 'undefined' && (window as any).debugLog) {
          (window as any).debugLog(
            `Erro no ${name}: ${error.message}`,
            'error',
            'component-error',
            {
              componentName: name,
              error: error.toString(),
              stack: error.stack,
              componentStack: errorInfo.componentStack
            }
          );
        }
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  );
};

export default EnhancedErrorBoundary;
