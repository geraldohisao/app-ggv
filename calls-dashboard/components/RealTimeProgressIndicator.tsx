/**
 * ✅ MELHORIA: Indicador de progresso em tempo real
 * Mostra progresso detalhado da análise em lote
 */

import React, { useState, useEffect } from 'react';

interface ProgressStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  details?: string;
  startTime?: number;
  endTime?: number;
}

interface RealTimeProgressProps {
  isVisible: boolean;
  totalCalls: number;
  currentCall: number;
  currentCallName?: string;
  steps: ProgressStep[];
  onCancel?: () => void;
}

export const RealTimeProgressIndicator: React.FC<RealTimeProgressProps> = ({
  isVisible,
  totalCalls,
  currentCall,
  currentCallName,
  steps,
  onCancel
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  if (!isVisible) return null;

  const overallProgress = totalCalls > 0 ? (currentCall / totalCalls) * 100 : 0;
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '🔄';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              🤖 Análise IA em Progresso
            </h3>
            <p className="text-sm text-gray-500">
              {currentCall} de {totalCalls} ligações • {formatTime(elapsedTime)} decorridos
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progresso geral */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progresso Geral
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Chamada atual */}
        {currentCallName && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <div className="animate-spin">🔄</div>
              <div>
                <p className="font-medium text-blue-900">
                  Analisando: {currentCallName}
                </p>
                <p className="text-sm text-blue-700">
                  Chamada {currentCall} de {totalCalls}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Steps detalhados */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">Etapas do Processo:</h4>
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusColor(step.status)}`}
            >
              <div className="text-lg">{getStatusIcon(step.status)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{step.name}</span>
                  {step.progress > 0 && (
                    <span className="text-sm">{step.progress}%</span>
                  )}
                </div>
                {step.details && (
                  <p className="text-sm mt-1 opacity-75">{step.details}</p>
                )}
                {step.progress > 0 && step.progress < 100 && (
                  <div className="mt-2 w-full bg-white bg-opacity-50 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${step.progress}%`,
                        backgroundColor: 'currentColor'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Estatísticas */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {steps.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-green-700">Concluídas</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {steps.filter(s => s.status === 'processing').length}
            </div>
            <div className="text-sm text-blue-700">Em andamento</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {steps.filter(s => s.status === 'failed').length}
            </div>
            <div className="text-sm text-red-700">Falharam</div>
          </div>
        </div>

        {/* Estimativa de tempo */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Tempo decorrido:</span>
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>
          {currentCall > 0 && currentCall < totalCalls && (
            <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
              <span>Tempo estimado restante:</span>
              <span className="font-mono">
                {formatTime((elapsedTime / currentCall) * (totalCalls - currentCall))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
};

export default RealTimeProgressIndicator;
