import React from 'react';
import { useBulkAnalysis } from '../contexts/BulkAnalysisContext';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from './ui/icons';

export const BulkAnalysisProgressNotification: React.FC = () => {
  const { currentAnalysis, isRunning, stopAnalysis, clearAnalysis } = useBulkAnalysis();

  // Não mostrar se não há análise ativa
  if (!currentAnalysis || (!isRunning && currentAnalysis.status === 'idle')) {
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
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <div>
              <h3 className="font-semibold text-sm">Análise em Massa</h3>
              <p className="text-xs opacity-80">{config.label}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {isActive && (
              <button
                onClick={stopAnalysis}
                className="p-1 hover:bg-black/10 rounded-full transition-colors"
                title="Parar análise"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
            {(isCompleted || isFailed) && (
              <button
                onClick={clearAnalysis}
                className="p-1 hover:bg-black/10 rounded-full transition-colors"
                title="Fechar notificação"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mensagem principal */}
        <p className="text-sm font-medium mb-2">{currentAnalysis.message}</p>
        
        {/* Detalhes */}
        {currentAnalysis.details && (
          <p className="text-xs opacity-80 mb-3">{currentAnalysis.details}</p>
        )}

        {/* Barra de progresso */}
        <div className="w-full bg-white/50 rounded-full h-2 mb-3">
          <div 
            className={`${config.barColor} h-2 rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${currentAnalysis.progress}%` }}
          />
        </div>

        {/* Informações detalhadas */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
              {currentAnalysis.leadsProcessed}/{currentAnalysis.totalLeads} leads
            </span>
            <span className="font-mono">{currentAnalysis.progress}%</span>
          </div>
          
          {/* Tempo estimado ou status final */}
          {isActive && (
            <span className="opacity-70">
              ~{Math.max(0, Math.ceil((100 - currentAnalysis.progress) / 10))}s
            </span>
          )}
          
          {isCompleted && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircleIcon className="w-3 h-3" />
              <span>Concluído</span>
            </div>
          )}
          
          {isFailed && (
            <div className="flex items-center gap-1 text-red-600">
              <ExclamationTriangleIcon className="w-3 h-3" />
              <span>Falhou</span>
            </div>
          )}
        </div>

        {/* Indicador de atividade */}
        {isActive && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>Processando em background...</span>
          </div>
        )}

        {/* Ações para análise concluída */}
        {isCompleted && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-80">
                ✅ {currentAnalysis.leadsProcessed} leads processados com sucesso
              </span>
              <button
                onClick={() => {
                  // Redirecionar para a página de histórico
                  window.location.href = '/reativacao';
                }}
                className="text-xs bg-current/20 hover:bg-current/30 px-2 py-1 rounded transition-colors"
              >
                Ver histórico
              </button>
            </div>
          </div>
        )}

        {/* Ações para análise falhada */}
        {isFailed && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-80">
                ❌ Análise interrompida ou falhou
              </span>
              <button
                onClick={() => {
                  // Redirecionar para a página de reativação para tentar novamente
                  window.location.href = '/reativacao';
                }}
                className="text-xs bg-current/20 hover:bg-current/30 px-2 py-1 rounded transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
