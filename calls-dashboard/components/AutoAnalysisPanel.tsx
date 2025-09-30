/**
 * 🤖 PAINEL DE CONTROLE DA ANÁLISE AUTOMÁTICA
 * Interface para monitorar e controlar o worker automático
 */

import React, { useState, useEffect } from 'react';
import { startAutoAnalysis, stopAutoAnalysis, getAutoAnalysisStats, updateAutoAnalysisConfig } from '../services/autoAnalysisWorker';

export const AutoAnalysisPanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Atualizar stats a cada 10 segundos
  useEffect(() => {
    const updateStats = () => {
      try {
        const currentStats = getAutoAnalysisStats();
        setStats(currentStats);
      } catch (error) {
        console.warn('Erro ao obter stats do worker:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleWorker = async () => {
    try {
      if (stats?.isRunning) {
        stopAutoAnalysis();
        console.log('🤖 Worker automático parado pelo usuário');
      } else {
        await startAutoAnalysis();
        console.log('🤖 Worker automático iniciado pelo usuário');
      }
    } catch (error) {
      console.error('Erro ao controlar worker:', error);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Nunca';
    return date.toLocaleTimeString('pt-BR');
  };

  const getStatusColor = (isRunning: boolean, isProcessing: boolean) => {
    if (isProcessing) return 'bg-blue-500';
    if (isRunning) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusText = (isRunning: boolean, isProcessing: boolean) => {
    if (isProcessing) return 'Processando';
    if (isRunning) return 'Ativo';
    return 'Inativo';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${getStatusColor(stats?.isRunning, stats?.isProcessing)}`}
            />
            <span className="font-medium text-gray-900">
              🤖 Análise Automática
            </span>
            <span className="text-sm text-gray-500">
              {getStatusText(stats?.isRunning, stats?.isProcessing)}
            </span>
          </div>
          
          {stats && (
            <div className="text-sm text-gray-600">
              ✅ {stats.successful} | ❌ {stats.failed} | 🕐 {formatTime(stats.lastRun)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleWorker}
            className={`px-3 py-1 rounded text-sm font-medium ${
              stats?.isRunning
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {stats?.isRunning ? '⏹️ Parar' : '▶️ Iniciar'}
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? '🔼' : '🔽'}
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {isExpanded && stats && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalProcessed}</div>
              <div className="text-sm text-blue-700">Total Processadas</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
              <div className="text-sm text-green-700">Sucessos</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-red-700">Falhas</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.successful > 0 ? Math.round((stats.successful / stats.totalProcessed) * 100) : 0}%
              </div>
              <div className="text-sm text-purple-700">Taxa de Sucesso</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">⚙️ Configuração</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Intervalo: {stats.config?.interval / 1000}s</div>
                <div>Lote: {stats.config?.batchSize} ligações</div>
                <div>Duração mín: {stats.config?.minDuration}s</div>
                <div>Max retries: {stats.config?.maxRetries}</div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">📊 Status</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Estado: {stats.isRunning ? '🟢 Rodando' : '🔴 Parado'}</div>
                <div>Processando: {stats.isProcessing ? '🔄 Sim' : '⏸️ Não'}</div>
                <div>Última execução: {formatTime(stats.lastRun)}</div>
                <div>Próxima execução: {stats.isRunning ? `~${Math.round(stats.config?.interval / 1000)}s` : 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Como funciona</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• Monitora automaticamente ligações recentes (últimas 24h)</div>
              <div>• Analisa ligações ≥ 3min com transcrição de qualidade</div>
              <div>• Processa em lotes de {stats.config?.batchSize} a cada {stats.config?.interval / 1000}s</div>
              <div>• Retry automático para falhas temporárias</div>
              <div>• Não reprocessa ligações já analisadas</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoAnalysisPanel;
