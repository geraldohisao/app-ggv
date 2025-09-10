/**
 * Painel para Análise IA em Lote
 * Permite processar automaticamente todas as chamadas >3min
 */

import React, { useState, useEffect } from 'react';
import { 
  processBatchAnalysis, 
  getAnalysisStats, 
  BatchAnalysisProgress 
} from '../services/batchAnalysisService';

export default function BatchAnalysisPanel() {
  const [stats, setStats] = useState<any>(null);
  const [progress, setProgress] = useState<BatchAnalysisProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      console.log('📊 Carregando estatísticas de análise...');
      const analysisStats = await getAnalysisStats();
      console.log('📊 Estatísticas carregadas:', analysisStats);
      setStats(analysisStats);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const handleStartBatchAnalysis = async () => {
    if (isRunning) return;

    try {
      setIsRunning(true);
      setError(null);
      setProgress(null);

      console.log('🚀 Iniciando análise em lote...');

      await processBatchAnalysis((progressUpdate) => {
        setProgress(progressUpdate);
      });

      // Recarregar estatísticas após conclusão
      await loadStats();

    } catch (err: any) {
      console.error('Erro na análise em lote:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setIsRunning(false);
    }
  };

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">
          🤖 Análise IA Automática
        </h3>
        <button
          onClick={loadStats}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-800">{stats.totalCalls}</div>
          <div className="text-xs text-slate-600">Total Chamadas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.callsOver3Min}</div>
          <div className="text-xs text-slate-600">&gt;3 Minutos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.callsWithTranscription}</div>
          <div className="text-xs text-slate-600">Com Transcrição</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.callsNeedingAnalysis}</div>
          <div className="text-xs text-slate-600">Precisam Análise</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.callsAnalyzed}</div>
          <div className="text-xs text-slate-600">Já Analisadas</div>
        </div>
      </div>

      {/* Progresso */}
      {progress && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Processando: {progress.current}
            </span>
            <span className="text-sm text-slate-600">
              {progress.processed}/{progress.total}
            </span>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.processed / progress.total) * 100}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-slate-600">
            <span>
              {progress.errors > 0 && `❌ ${progress.errors} erros`}
            </span>
            <span>
              {Math.round((progress.processed / progress.total) * 100)}%
            </span>
          </div>
          
          {progress.completed && (
            <div className="mt-2 text-sm text-green-600 font-medium">
              ✅ Análise concluída!
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700 text-sm">❌ {error}</div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={handleStartBatchAnalysis}
          disabled={isRunning || stats.callsNeedingAnalysis === 0}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isRunning || stats.callsNeedingAnalysis === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processando...
            </span>
          ) : (
            `🚀 Analisar ${stats.callsNeedingAnalysis} Chamadas`
          )}
        </button>
      </div>

      {/* Informações */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-800">
          <strong>ℹ️ Como funciona:</strong>
          <ul className="mt-1 ml-4 list-disc text-xs space-y-1">
            <li>Analisa automaticamente chamadas com duração &gt; 3 minutos</li>
            <li>Gera notas de 0 a 10 baseadas na performance da SDR</li>
            <li>Salva resultados no banco para ranking dinâmico</li>
            <li>Processa em lotes para não sobrecarregar o sistema</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
