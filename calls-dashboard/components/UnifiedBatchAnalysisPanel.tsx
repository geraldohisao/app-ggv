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

// Componente de estatística compacta
const StatItem = ({ value, label, color = 'slate' }: { value: number; label: string; color?: string }) => {
  const colors: Record<string, string> = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-lg font-bold ${colors[color]}`}>{value.toLocaleString('pt-BR')}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
};

export default function UnifiedBatchAnalysisPanel() {
  const [stats, setStats] = useState<BatchAnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [results, setResults] = useState<any>(null);
  const [showCriteria, setShowCriteria] = useState(false);
  
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
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Carregando análise...</span>
        </div>
      </div>
    );
  }

  // Calcular porcentagem de análise
  const analysisPercentage = stats && stats.callsEligibleForAnalysis > 0 
    ? Math.round((stats.callsAlreadyAnalyzed / stats.callsEligibleForAnalysis) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header compacto com estatísticas principais */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Título e métricas principais */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Análise IA</h3>
                <p className="text-xs text-slate-500">Processamento automático</p>
              </div>
            </div>
            
            {/* Métricas em linha */}
            {stats && (
              <div className="hidden md:flex items-center gap-6 pl-6 border-l border-slate-200">
                <StatItem value={stats.callsEligibleForAnalysis} label="elegíveis" color="indigo" />
                <StatItem value={stats.callsAlreadyAnalyzed} label="analisadas" color="emerald" />
                <StatItem value={stats.callsNeedingAnalysis} label="pendentes" color={stats.callsNeedingAnalysis > 0 ? 'amber' : 'slate'} />
              </div>
            )}
          </div>

          {/* Ações compactas */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              disabled={loading || analyzing}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Atualizar estatísticas"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowCriteria(!showCriteria)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Ver critérios de análise"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Botão principal de análise */}
            <button
              onClick={() => startBatchAnalysis(false)}
              disabled={analyzing || (stats?.callsNeedingAnalysis || 0) === 0}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${analyzing || (stats?.callsNeedingAnalysis || 0) === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                }
              `}
            >
              {analyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analisando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analisar {stats?.callsNeedingAnalysis || 0}
                </>
              )}
            </button>

            {/* Botão secundário de re-análise */}
            <button
              onClick={() => startBatchAnalysis(true)}
              disabled={analyzing || (stats?.callsEligibleForAnalysis || 0) === 0}
              className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${analyzing || (stats?.callsEligibleForAnalysis || 0) === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }
              `}
              title={`Re-analisar ${stats?.callsEligibleForAnalysis || 0} chamadas elegíveis`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-analisar
            </button>
          </div>
        </div>

        {/* Métricas mobile */}
        {stats && (
          <div className="flex md:hidden items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            <StatItem value={stats.callsEligibleForAnalysis} label="elegíveis" color="indigo" />
            <StatItem value={stats.callsAlreadyAnalyzed} label="analisadas" color="emerald" />
            <StatItem value={stats.callsNeedingAnalysis} label="pendentes" color={stats.callsNeedingAnalysis > 0 ? 'amber' : 'slate'} />
          </div>
        )}
      </div>

      {/* Barra de progresso de análise (sempre visível) */}
      {stats && stats.callsEligibleForAnalysis > 0 && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Progresso de análise</span>
            <span>{analysisPercentage}% concluído</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${analysisPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Progresso da análise em tempo real */}
      {progress && progress.isRunning && (
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-indigo-700">Processando análises...</span>
            </div>
            <span className="text-sm text-indigo-600">
              {progress.current}/{progress.total} ({progress.percentage}%)
            </span>
          </div>
          <div className="w-full bg-indigo-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-indigo-600 mt-1 truncate">
            {progress.currentCall}
          </p>
        </div>
      )}

      {/* Resultados da análise */}
      {results && !progress?.isRunning && (
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-emerald-700">Análise concluída</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-emerald-600">{results.successful} sucessos</span>
              {results.failed > 0 && <span className="text-red-600">{results.failed} falhas</span>}
            </div>
          </div>
        </div>
      )}

      {/* Critérios (colapsável) */}
      {showCriteria && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
          <p className="font-medium text-slate-700 mb-2">Critérios para elegibilidade:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Atendida
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              Duração maior que 3 min
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Com transcrição
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
              10+ segmentos
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
