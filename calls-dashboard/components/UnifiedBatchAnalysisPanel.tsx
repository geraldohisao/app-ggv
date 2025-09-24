import React, { useState, useEffect } from 'react';
import { getUnifiedBatchAnalysisStats, getCallsNeedingAnalysisUnified, processBatchAnalysisUnified, BatchAnalysisStats, CallForAnalysis } from '../services/unifiedBatchAnalysisService';
import { useAdminFeatures } from '../../hooks/useAdminPermissions';

interface AnalysisProgress {
  current: number;
  total: number;
  currentCall: string;
  percentage: number;
  isRunning: boolean;
}

export default function UnifiedBatchAnalysisPanel() {
  const [stats, setStats] = useState<BatchAnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [results, setResults] = useState<any>(null);
  
  // 🔐 Verificar permissões de administrador
  const { canAccessManualAnalysis, canAccessBulkOperations, user } = useAdminFeatures();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const newStats = await getUnifiedBatchAnalysisStats();
      setStats(newStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const startBatchAnalysis = async (forceReprocess: boolean = false) => {
    if (analyzing) return;

    try {
      setAnalyzing(true);
      setProgress({ current: 0, total: 0, currentCall: 'Preparando...', percentage: 0, isRunning: true });
      setResults(null);

      console.log(`🚀 Iniciando análise em lote (forceReprocess: ${forceReprocess})`);

      // Buscar chamadas para análise
      const callsToAnalyze = await getCallsNeedingAnalysisUnified(forceReprocess, 100);
      
      if (callsToAnalyze.length === 0) {
        alert(forceReprocess ? 
          'Nenhuma chamada elegível encontrada (>3min, >10 segmentos, com transcrição)' : 
          'Todas as chamadas elegíveis já foram analisadas! Use "Re-analisar Todas" se quiser reprocessar.'
        );
        return;
      }

      console.log(`📊 Encontradas ${callsToAnalyze.length} chamadas para análise`);

      // Processar com callback de progresso
      const batchResults = await processBatchAnalysisUnified(
        callsToAnalyze,
        (current, total, currentCall) => {
          const percentage = Math.round((current / total) * 100);
          setProgress({
            current,
            total,
            currentCall,
            percentage,
            isRunning: true
          });
        }
      );

      setResults(batchResults);
      setProgress(prev => prev ? { ...prev, isRunning: false } : null);

      // Recarregar estatísticas
      await loadStats();

      console.log('🎉 Análise em lote concluída:', batchResults);

    } catch (error) {
      console.error('💥 Erro na análise em lote:', error);
      alert('Erro na análise em lote: ' + (error as any)?.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // 🔐 Verificar se usuário tem permissão para acessar análise manual
  // Se não tiver permissão, não renderizar nada (ocultar completamente)
  if (!canAccessManualAnalysis) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-center text-slate-600">Carregando estatísticas...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            🤖 Análise IA Automática
          </h3>
          <p className="text-sm text-slate-600">Sistema unificado de análise em massa</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading || analyzing}
          className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-xl font-bold text-slate-800">{stats.totalCalls}</div>
            <div className="text-xs text-slate-600">Total Chamadas</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">{stats.callsAnswered}</div>
            <div className="text-xs text-slate-600">Atendidas</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">{stats.callsWithTranscription}</div>
            <div className="text-xs text-slate-600">Com Transcrição</div>
          </div>
          
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-xl font-bold text-indigo-600">{stats.callsOver3Min}</div>
            <div className="text-xs text-slate-600">&gt;3 Minutos</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-xl font-bold text-purple-600">{stats.callsWithMinSegments}</div>
            <div className="text-xs text-slate-600">&gt;10 Segmentos</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xl font-bold text-orange-600">{stats.callsEligibleForAnalysis}</div>
            <div className="text-xs text-slate-600">Elegíveis IA</div>
          </div>
          
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-xl font-bold text-emerald-600">{stats.callsAlreadyAnalyzed}</div>
            <div className="text-xs text-slate-600">Já Analisadas</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xl font-bold text-red-600">{stats.callsNeedingAnalysis}</div>
            <div className="text-xs text-slate-600">Precisam Análise</div>
          </div>
        </div>
      )}

      {/* Progresso da análise */}
      {progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-800">
              {progress.isRunning ? '🔄 Analisando...' : '✅ Análise Concluída'}
            </h4>
            <span className="text-sm text-blue-600">
              {progress.current} de {progress.total} ({progress.percentage}%)
            </span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          
          <div className="text-sm text-blue-700">
            Processando: {progress.currentCall}
          </div>
        </div>
      )}

      {/* Resultados */}
      {results && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">📊 Resultados da Análise:</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-green-600">{results.successful}</div>
              <div className="text-slate-600">Sucessos</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{results.failed}</div>
              <div className="text-slate-600">Falhas</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-slate-800">{results.total}</div>
              <div className="text-slate-600">Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={() => startBatchAnalysis(false)}
          disabled={analyzing || (stats?.callsNeedingAnalysis || 0) === 0}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            analyzing || (stats?.callsNeedingAnalysis || 0) === 0
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {analyzing ? 'Analisando...' : `⚡ Analisar ${stats?.callsNeedingAnalysis || 0} Novas`}
        </button>
        
        <button
          onClick={() => startBatchAnalysis(true)}
          disabled={analyzing || (stats?.callsEligibleForAnalysis || 0) === 0}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
            analyzing || (stats?.callsEligibleForAnalysis || 0) === 0
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          {analyzing ? 'Analisando...' : `🔄 Re-analisar ${stats?.callsEligibleForAnalysis || 0} Todas`}
        </button>
      </div>

      {/* Critérios */}
      <div className="text-xs text-slate-500 bg-slate-50 rounded p-3">
        <strong>Critérios para Análise IA:</strong>
        <ul className="mt-1 space-y-1">
          <li>• <strong>Status:</strong> Chamada atendida (status_voip = normal_clearing)</li>
          <li>• <strong>Duração:</strong> Mínimo 3 minutos (usando duration_formated)</li>
          <li>• <strong>Segmentos:</strong> Mínimo 10 segmentos (baseado em pontuação)</li>
          <li>• <strong>Transcrição:</strong> Mínimo 100 caracteres válidos</li>
          <li>• <strong>Scorecard:</strong> Seleção inteligente automática</li>
        </ul>
      </div>
    </div>
  );
}
