import React, { useState } from 'react';
import { CallItem } from '../types';
import { 
  ScorecardAnalysisResult, 
  CriterionAnalysis 
} from '../services/scorecardAnalysisService';
import { 
  processCallAnalysis, 
  getCallAnalysisFromDatabase,
  hasExistingAnalysis 
} from '../services/callAnalysisBackendService';

interface ScorecardAnalysisProps {
  call: CallItem;
  onAnalysisComplete?: (analysis: ScorecardAnalysisResult) => void;
}

export default function ScorecardAnalysis({ call, onAnalysisComplete }: ScorecardAnalysisProps) {
  const [analysis, setAnalysis] = useState<ScorecardAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState<boolean>(false);

  // Verificar se já existe análise ao carregar
  React.useEffect(() => {
    const checkExistingAnalysis = async () => {
      try {
        const existing = await getCallAnalysisFromDatabase(call.id);
        if (existing) {
          setAnalysis(existing);
          setHasExisting(true);
          console.log('✅ Análise carregada do banco:', existing.final_grade);
          // Notificar componente pai
          onAnalysisComplete?.(existing);
        }
      } catch (err) {
        console.warn('⚠️ Erro ao verificar análise existente:', err);
      }
    };

    if (call.transcription?.trim()) {
      checkExistingAnalysis();
    }
  }, [call.id, call.transcription]);

  const handleAnalyze = async () => {
    if (!call.transcription?.trim()) {
      setError('Transcrição não disponível para análise');
      return;
    }

    // Calcular duração real para análise
    let realDuration = call.durationSec;
    if (call.duration_formated && call.duration_formated !== '00:00:00') {
      const parts = call.duration_formated.split(':');
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      realDuration = hours * 3600 + minutes * 60 + seconds;
    }

    if (realDuration < 60) {
      setError('Chamada muito curta para análise (mínimo 1 minuto)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🎯 Iniciando análise de scorecard para:', call.id);
      
      // Processar com backend (salva automaticamente no banco)
      const result = await processCallAnalysis(
        call.id,
        call.transcription,
        call.sdr?.name,
        call.person_name || 'Cliente',
        hasExisting // forceReprocess se já existe
      );
      
      if (result) {
        setAnalysis(result);
        setHasExisting(true);
        console.log('✅ Análise processada e salva:', result.final_grade);
        // Notificar componente pai
        onAnalysisComplete?.(result);
      } else {
        throw new Error('Falha no processamento da análise');
      }
      
    } catch (err) {
      console.error('❌ Erro na análise:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido na análise');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (grade >= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-800">🎯 Análise de Scorecard</h3>
          <p className="text-sm text-slate-600">
            Avaliação detalhada da performance da chamada
          </p>
        </div>
        
        <div className="flex gap-2">
          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={loading || !call.transcription?.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processando...
                </>
              ) : (
                <>
                  🎯 Analisar com IA
                </>
              )}
            </button>
          )}
          
          {analysis && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Reprocessando...
                </>
              ) : (
                <>
                  🔄 Reprocessar
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Resultado da Análise */}
      {analysis && (
        <div className="space-y-6">
          {/* Nota Geral */}
          <div className={`border rounded-lg p-4 ${getGradeColor(analysis.final_grade)}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">📊 Nota Geral</h4>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {analysis.final_grade.toFixed(1)}/10
                </div>
                {analysis.confidence && (
                  <div className="text-xs text-slate-500">
                    {Math.round(analysis.confidence * 100)}% confiança
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm">{analysis.general_feedback}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span>Pontuação: {analysis.overall_score}/{analysis.max_possible_score}</span>
              {analysis.scorecard_used && (
                <span className="text-slate-500">
                  Scorecard: {analysis.scorecard_used.name}
                </span>
              )}
            </div>
          </div>

          {/* Análise por Critério */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-800 mb-4">📋 Análise Detalhada</h4>
            <div className="space-y-4">
              {analysis.criteria_analysis.map((criterion, index) => (
                <div key={criterion.criterion_id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-slate-700">{criterion.criterion_name}</h5>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {criterion.achieved_score}/{criterion.max_score}
                      </span>
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getScoreColor(criterion.percentage)}`}
                          style={{ width: `${criterion.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {criterion.percentage}%
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2">{criterion.analysis}</p>
                  
                  {/* Evidências */}
                  {criterion.evidence && criterion.evidence.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                      <div className="text-xs font-medium text-green-700 mb-1">✅ Evidências encontradas:</div>
                      <ul className="text-xs text-green-600 space-y-1">
                        {criterion.evidence.map((evidence, idx) => (
                          <li key={idx} className="italic">"{evidence}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Sugestões */}
                  {criterion.suggestions.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <div className="text-xs font-medium text-blue-700 mb-1">💡 Sugestões:</div>
                      <ul className="text-xs text-blue-600 space-y-1">
                        {criterion.suggestions.map((suggestion, idx) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pontos Fortes e Melhorias */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pontos Fortes */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">✅ Pontos Fortes</h4>
              <ul className="text-sm text-green-700 space-y-1">
                {analysis.strengths.map((strength, index) => (
                  <li key={index}>• {strength}</li>
                ))}
              </ul>
            </div>

            {/* Oportunidades de Melhoria */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">🎯 Oportunidades</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {analysis.improvements.map((improvement, index) => (
                  <li key={index}>• {improvement}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Ações Recomendadas */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-800 mb-2">🚀 Próximos Passos</h4>
            <div className="text-sm text-slate-600 space-y-1">
              <p>• Revisar gravação focando nos critérios com menor pontuação</p>
              <p>• Praticar técnicas de descoberta de necessidades</p>
              <p>• Aplicar feedback em próximas chamadas similares</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
