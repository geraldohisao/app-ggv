import React, { useState, useEffect } from 'react';
import { generateAdvancedAnalysis, getOpenAIApiKey } from '../../../services/okrAdvancedAnalysis';
import { StrategicMap } from '../../../types';

interface AdvancedAnalysisModalProps {
  map: StrategicMap;
  apiKey: string;
  onClose: () => void;
}

interface AnalysisResult {
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  score: number;
}

const AdvancedAnalysisModal: React.FC<AdvancedAnalysisModalProps> = ({
  map,
  apiKey: providedApiKey,
  onClose
}) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Buscar API Key se não foi fornecida
      let apiKey = providedApiKey;
      if (!apiKey) {
        const key = await getOpenAIApiKey();
        if (!key) {
          throw new Error('API Key da OpenAI não configurada');
        }
        apiKey = key;
      }

      const result = await generateAdvancedAnalysis(map, apiKey);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar análise');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🎯</span>
            <div>
              <h2 className="text-2xl font-bold">Análise Estratégica Avançada</h2>
              <p className="text-sm text-blue-100">Análise SWOT + Tendências + Benchmarks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {!analysis && !loading && !error && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Análise Estratégica Completa
              </h3>
              <p className="text-slate-600 max-w-2xl mx-auto mb-8">
                A IA irá analisar seu mapa estratégico gerando uma análise SWOT completa.
              </p>
              <button
                onClick={handleGenerate}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-lg"
              >
                ✨ Gerar Análise Avançada
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <svg className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Analisando...</h3>
              <p className="text-slate-600">Processando dados históricos e tendências</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Erro na Análise</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
              >
                🔄 Tentar Novamente
              </button>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Score */}
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
                <div className="text-sm text-slate-600 mb-2">SCORE ESTRATÉGICO</div>
                <div className={`text-6xl font-bold ${getScoreColor(analysis.score)} inline-block px-8 py-4 rounded-2xl`}>
                  {analysis.score}/100
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Resumo Executivo
                </h3>
                <p className="text-slate-700 leading-relaxed">{analysis.executiveSummary}</p>
              </div>

              {/* SWOT Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-green-50 border-2 border-green-200 rounded-xl">
                  <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">💪</span>
                    Pontos Fortes
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((item, i) => (
                      <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 bg-red-50 border-2 border-red-200 rounded-xl">
                  <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    Pontos Fracos
                  </h3>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((item, i) => (
                      <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">×</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">🚀</span>
                    Oportunidades
                  </h3>
                  <ul className="space-y-2">
                    {analysis.opportunities.map((item, i) => (
                      <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 bg-orange-50 border-2 border-orange-200 rounded-xl">
                  <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    Ameaças
                  </h3>
                  <ul className="space-y-2">
                    {analysis.threats.map((item, i) => (
                      <li key={i} className="text-sm text-orange-800 flex items-start gap-2">
                        <span className="text-orange-600 mt-0.5">!</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  Recomendações Prioritárias
                </h3>
                <ol className="space-y-3">
                  {analysis.recommendations.map((item, i) => (
                    <li key={i} className="text-sm text-purple-800 flex items-start gap-3">
                      <span className="font-bold text-purple-600 bg-purple-200 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
          {analysis && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const text = `
ANÁLISE ESTRATÉGICA - ${map.company_name}
Score: ${analysis.score}/100

RESUMO EXECUTIVO:
${analysis.executiveSummary}

PONTOS FORTES:
${analysis.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

PONTOS FRACOS:
${analysis.weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')}

OPORTUNIDADES:
${analysis.opportunities.map((o, i) => `${i + 1}. ${o}`).join('\n')}

AMEAÇAS:
${analysis.threats.map((t, i) => `${i + 1}. ${t}`).join('\n')}

RECOMENDAÇÕES:
${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
                  `.trim();
                  
                  navigator.clipboard.writeText(text);
                  alert('✅ Análise copiada para área de transferência!');
                }}
                className="px-6 py-3 border-2 border-blue-300 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                📋 Copiar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalysisModal;

