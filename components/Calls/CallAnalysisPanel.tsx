// components/Calls/CallAnalysisPanel.tsx
// Painel de análise de IA para ligações por deal

import React, { useState, useEffect, useRef } from 'react';
import { 
  analyzeDealCallsWithAI, 
  getDealTranscriptions, 
  getDealCallStats,
  getLatestAnalysis,
  getAnalysisHistory,
  CallTranscription,
  DealCallStats
} from '../../services/callAnalysisService';
// Ícones simples usando emojis e símbolos
const AlertCircle = () => <span className="text-red-500">⚠️</span>;
const Brain = () => <span className="text-blue-500">🧠</span>;
const BarChart3 = () => <span className="text-green-500">📊</span>;
const Clock = () => <span className="text-yellow-500">🕐</span>;
const Phone = () => <span className="text-blue-500">📞</span>;
const User = () => <span className="text-purple-500">👤</span>;
const TrendingUp = () => <span className="text-green-500">📈</span>;
const RefreshCw = () => <span className="text-blue-500">🔄</span>;

// Componentes UI simples inline
const Card = ({ children, className = '', ...props }: any) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-4 ${className}`} {...props}>
    {children}
  </div>
);

const Button = ({ children, className = '', disabled = false, onClick, ...props }: any) => (
  <button
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      disabled 
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
        : 'bg-blue-600 text-white hover:bg-blue-700'
    } ${className}`}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

const LoadingSpinner = ({ size = 'md', className = '' }: any) => (
  <div className={`inline-flex items-center justify-center ${className}`}>
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${
      size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
    }`}></div>
  </div>
);

interface CallAnalysisPanelProps {
  dealId: string;
  className?: string;
}

interface AnalysisState {
  isAnalyzing: boolean;
  analysisContent: string;
  error: string | null;
  isComplete: boolean;
  cachedAnalysis: any;
}

export const CallAnalysisPanel: React.FC<CallAnalysisPanelProps> = ({ 
  dealId, 
  className = '' 
}) => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    analysisContent: '',
    error: null,
    isComplete: false,
    cachedAnalysis: null
  });

  const [analysisHistory, setAnalysisHistory] = useState<CallAnalysisResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [transcriptions, setTranscriptions] = useState<CallTranscription[]>([]);
  const [stats, setStats] = useState<DealCallStats | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  
  const analysisRef = useRef<HTMLDivElement>(null);

  // Carregar dados iniciais
  useEffect(() => {
    if (dealId) {
      loadInitialData();
    }
  }, [dealId]);

  // Scroll automático durante análise
  useEffect(() => {
    if (analysisState.isAnalyzing && analysisRef.current) {
      analysisRef.current.scrollTop = analysisRef.current.scrollHeight;
    }
  }, [analysisState.analysisContent]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      console.log('📊 CALL ANALYSIS - Carregando dados para deal:', dealId);
      
      // Buscar dados em paralelo
      const [transcriptionsData, statsData, latestAnalysis, historyData] = await Promise.all([
        getDealTranscriptions(dealId),
        getDealCallStats(dealId),
        getLatestAnalysis(dealId),
        getAnalysisHistory(dealId)
      ]);

      setTranscriptions(transcriptionsData);
      setStats(statsData);
      setAnalysisHistory(historyData);
      setAnalysisState(prev => ({ ...prev, cachedAnalysis: latestAnalysis }));

      console.log('✅ CALL ANALYSIS - Dados carregados:', {
        transcriptions: transcriptionsData.length,
        hasStats: !!statsData,
        hasLatest: !!latestAnalysis,
        historyCount: historyData.length
      });
    } catch (error) {
      console.error('❌ CALL ANALYSIS - Erro ao carregar dados:', error);
      setAnalysisState(prev => ({ 
        ...prev, 
        error: `Erro ao carregar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }));
    } finally {
      setIsLoadingData(false);
    }
  };

  const startAnalysis = async () => {
    console.log('🔍 DEBUG - startAnalysis chamada com:', { dealId, transcriptionsLength: transcriptions.length, customPrompt });
    
    if (!transcriptions.length) {
      console.log('❌ DEBUG - Nenhuma transcrição disponível');
      setAnalysisState(prev => ({ 
        ...prev, 
        error: 'Nenhuma transcrição disponível para análise' 
      }));
      return;
    }

    setAnalysisState({
      isAnalyzing: true,
      analysisContent: '',
      error: null,
      isComplete: false,
      cachedAnalysis: null
    });

    try {
      console.log('🤖 CALL ANALYSIS - Iniciando análise IA...');
      console.log('🔍 DEBUG - Chamando analyzeDealCallsWithAI com:', { dealId, customPrompt });
      
      const analysisGenerator = analyzeDealCallsWithAI(dealId, customPrompt || undefined);
      console.log('🔍 DEBUG - Generator criado:', analysisGenerator);
      
      let chunkCount = 0;
      for await (const chunk of analysisGenerator) {
        chunkCount++;
        console.log(`🔍 DEBUG - Chunk ${chunkCount}:`, chunk.substring(0, 100) + '...');
        setAnalysisState(prev => ({
          ...prev,
          analysisContent: prev.analysisContent + chunk
        }));
      }

      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        isComplete: true
      }));

      console.log(`✅ CALL ANALYSIS - Análise concluída com ${chunkCount} chunks`);
    } catch (error) {
      console.error('❌ CALL ANALYSIS - Erro na análise:', error);
      console.error('❌ DEBUG - Stack trace:', error instanceof Error ? error.stack : 'No stack');
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: `Erro na análise: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }));
    }
  };

  const clearAnalysis = () => {
    setAnalysisState({
      isAnalyzing: false,
      analysisContent: '',
      error: null,
      isComplete: false,
      cachedAnalysis: null
    });
    setCustomPrompt('');
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoadingData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Carregando dados das ligações...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            Análise Inteligente das Ligações
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {analysisHistory.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-blue-600 hover:text-blue-800"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Histórico ({analysisHistory.length})
            </Button>
          )}
          {analysisState.isComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAnalysis}
              className="text-gray-600 hover:text-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Nova Análise
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas do Deal */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Phone className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-sm font-medium text-gray-600">Total de Ligações</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total_calls}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-sm font-medium text-gray-600">Duração Total</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatDuration(stats.total_duration)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600 mr-1" />
              <span className="text-sm font-medium text-gray-600">Duração Média</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatDuration(stats.avg_duration)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <User className="w-4 h-4 text-orange-600 mr-1" />
              <span className="text-sm font-medium text-gray-600">Agentes Envolvidos</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Object.keys(stats.agents_involved || {}).length}
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Análises */}
      {showHistory && analysisHistory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Histórico de Análises ({analysisHistory.length})
          </h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {analysisHistory.map((analysis, index) => (
              <div key={analysis.id} className="p-4 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Análise #{analysisHistory.length - index}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(analysis.created_at)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {analysis.transcription_summary} • {formatDuration(analysis.total_duration)}
                </div>
                {analysis.custom_prompt && (
                  <div className="text-xs text-blue-600 mb-2">
                    <strong>Prompt:</strong> {analysis.custom_prompt.slice(0, 100)}...
                  </div>
                )}
                <div className="text-sm text-gray-700 line-clamp-3">
                  {analysis.analysis_content.slice(0, 200)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Transcrições */}
      {transcriptions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Transcrições Disponíveis ({transcriptions.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {transcriptions.map((call, index) => (
              <div key={call.call_id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">
                      Ligação {index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(call.created_at)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {call.direction}
                    </span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {call.agent_id} • {call.provider_call_id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Personalizado */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt Personalizado (opcional)
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Digite um prompt personalizado para focar a análise em aspectos específicos..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            onClick={startAnalysis}
            disabled={analysisState.isAnalyzing || transcriptions.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {analysisState.isAnalyzing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Analisando...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Analisar Ligações
              </>
            )}
          </Button>
          
          {transcriptions.length === 0 && (
            <div className="flex items-center text-amber-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">Nenhuma transcrição disponível</span>
            </div>
          )}
        </div>
      </div>

      {/* Última Análise Disponível */}
      {analysisState.cachedAnalysis && !analysisState.analysisContent && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-2">
            <Clock className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">
              Última Análise Disponível
            </span>
          </div>
          <p className="text-sm text-green-700">
            Encontrada análise anterior para este deal (salva permanentemente). Clique em "Analisar Ligações" para gerar uma nova análise.
          </p>
          <div className="text-xs text-green-600 mt-1">
            Data: {formatDate(analysisState.cachedAnalysis.created_at)}
          </div>
        </div>
      )}

      {/* Erro */}
      {analysisState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-sm font-medium text-red-800">Erro na Análise</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{analysisState.error}</p>
        </div>
      )}

      {/* Conteúdo da Análise */}
      {analysisState.analysisContent && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-blue-600" />
              Análise Gerada
              {analysisState.isAnalyzing && (
                <LoadingSpinner size="sm" className="ml-2" />
              )}
            </h4>
            {analysisState.isComplete && (
              <span className="text-sm text-green-600 font-medium">
                ✓ Análise Concluída
              </span>
            )}
          </div>
          
          <div
            ref={analysisRef}
            className="prose prose-sm max-w-none bg-white border rounded-lg p-6 max-h-96 overflow-y-auto"
          >
            <div className="whitespace-pre-wrap text-gray-800">
              {analysisState.analysisContent}
            </div>
          </div>
        </div>
      )}

      {/* Informações Adicionais */}
      {transcriptions.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-700 mb-2">
            Informações Técnicas
          </h5>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Deal ID: {dealId}</div>
            <div>• Transcrições processadas: {transcriptions.length}</div>
            <div>• Período: {stats?.first_call_date ? formatDate(stats.first_call_date) : 'N/A'} a {stats?.last_call_date ? formatDate(stats.last_call_date) : 'N/A'}</div>
            <div>• Análise gerada em: {new Date().toLocaleString('pt-BR')}</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CallAnalysisPanel;

