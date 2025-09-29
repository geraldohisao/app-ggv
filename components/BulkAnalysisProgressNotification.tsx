import React, { useEffect, useState } from 'react';
import { useBulkAnalysis } from '../contexts/BulkAnalysisContext';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from './ui/icons';

export const BulkAnalysisProgressNotification: React.FC = () => {
  const { currentAnalysis, isRunning, stopAnalysis, clearAnalysis } = useBulkAnalysis();
  const [showNotification, setShowNotification] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-hide para notificações de início (3 segundos)
  useEffect(() => {
    // Verificar se há análise ativa
    if (!currentAnalysis || (!isRunning && currentAnalysis.status === 'idle')) {
      setShowNotification(false);
      return;
    }

    // Limpar timer anterior se existir
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }

    if (currentAnalysis.status === 'starting' && isRunning) {
      setShowNotification(true);
      // Auto-hide após 3 segundos
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);
      setAutoHideTimer(timer);
    } else if (currentAnalysis.status === 'completed' || currentAnalysis.status === 'failed') {
      setShowNotification(true);
      // Auto-hide após 5 segundos para notificações de fim
      const timer = setTimeout(() => {
        setShowNotification(false);
        // Usar setTimeout para evitar dependência circular
        setTimeout(() => {
          clearAnalysis();
        }, 100);
      }, 5000);
      setAutoHideTimer(timer);
    }

    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [currentAnalysis?.status, isRunning, currentAnalysis]); // Removida dependência clearAnalysis

  // Não mostrar se não há análise ativa ou notificação foi escondida
  if (!currentAnalysis || (!isRunning && currentAnalysis.status === 'idle') || !showNotification) {
    return null;
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      starting: {
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        barColor: 'bg-blue-500',
        icon: '🚀',
        label: 'Iniciando'
      },
      processing: {
        color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        barColor: 'bg-indigo-500',
        icon: '⚙️',
        label: 'Processando'
      },
      fetching: {
        color: 'bg-purple-50 border-purple-200 text-purple-800',
        barColor: 'bg-purple-500',
        icon: '🔍',
        label: 'Buscando'
      },
      finalizing: {
        color: 'bg-orange-50 border-orange-200 text-orange-800',
        barColor: 'bg-orange-500',
        icon: '📝',
        label: 'Finalizando'
      },
      completed: {
        color: 'bg-green-50 border-green-200 text-green-800',
        barColor: 'bg-green-500',
        icon: '✅',
        label: 'Concluído'
      },
      failed: {
        color: 'bg-red-50 border-red-200 text-red-800',
        barColor: 'bg-red-500',
        icon: '❌',
        label: 'Falhou'
      }
    };

    return configs[status as keyof typeof configs] || configs.processing;
  };

  const config = getStatusConfig(currentAnalysis.status);
  const isCompleted = currentAnalysis.status === 'completed';
  const isFailed = currentAnalysis.status === 'failed';
  const isActive = isRunning && !isCompleted && !isFailed;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`${config.color} border rounded-xl shadow-lg p-4 transition-all duration-300`}>
        {/* Header simples */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <div>
              <h3 className="font-semibold text-sm">Reativação de Leads</h3>
              <p className="text-xs opacity-80">{config.label}</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              setShowNotification(false);
              if (isCompleted || isFailed) {
                clearAnalysis();
              }
            }}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
            title="Fechar notificação"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Mensagem principal */}
        <p className="text-sm font-medium mb-2">{currentAnalysis.message}</p>
        
        {/* Detalhes apenas para início */}
        {currentAnalysis.status === 'starting' && currentAnalysis.details && (
          <p className="text-xs opacity-80 mb-2">{currentAnalysis.details}</p>
        )}

        {/* Status final */}
        {isCompleted && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircleIcon className="w-4 h-4" />
            <span>Reativação iniciada com sucesso! Verifique o histórico em alguns minutos.</span>
          </div>
        )}
        
        {isFailed && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>Falha na reativação. Tente novamente.</span>
          </div>
        )}

        {/* Indicador de processamento em background apenas para início */}
        {currentAnalysis.status === 'starting' && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>Processando em background...</span>
          </div>
        )}
      </div>
    </div>
  );
};
