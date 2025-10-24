import React, { useEffect, useState } from 'react';
import { AiInsight, CallItem } from '../types';
import { analyzeCallWithAI } from '../services/geminiService';
import type { ScorecardAnalysisResult } from '../services/scorecardAnalysisService';

interface Props { 
  call: CallItem;
  analysis?: ScorecardAnalysisResult | null | undefined;
  loading?: boolean;
}

export default function AiAssistant({ call, analysis, loading = false }: Props) {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Enquanto ainda estamos aguardando a análise (undefined), manter loading e não executar nada
    if (analysis === undefined) {
      setInsights([]);
      setIsLoading(true);
      return () => { cancelled = true; };
    }

    // Se temos análise persistida, gerar insights a partir dela
    if (analysis) {
      const summary: AiInsight[] = [];

      summary.push({
        title: `Análise IA - Score: ${analysis.final_grade?.toFixed(1) ?? 'N/A'}/10`,
        content: analysis.general_feedback || 'Análise concluída com sucesso.',
        severity: analysis.final_grade && analysis.final_grade >= 7 ? 'success' : 
                  analysis.final_grade && analysis.final_grade >= 5 ? 'warning' : 'error'
      });

      if (analysis.scorecard_used) {
        summary.push({
          title: `Scorecard utilizado`,
          content: `${analysis.scorecard_used.name} • ${analysis.criteria_analysis.length} critérios avaliados.`,
          severity: 'info'
        });
      }

      summary.push({
        title: 'Resumo de Pontos Fortes',
        content: analysis.strengths.length > 0 ? analysis.strengths.join(' • ') : 'Sem pontos fortes destacados.',
        severity: 'success'
      });

      summary.push({
        title: 'Oportunidades de Melhoria',
        content: analysis.improvements.length > 0 ? analysis.improvements.join(' • ') : 'Sem oportunidades destacadas.',
        severity: 'warning'
      });

      setInsights(summary);
      setIsLoading(false);
      return () => { cancelled = true; };
    }

    // Se análise é null (não existe), NÃO mostrar nada
    // Usuário deve clicar em "Analisar com IA" para gerar análise real
    setInsights([]);
    setIsLoading(false);
    return () => { cancelled = true; };
  }, [call, analysis]);

  const renderLoading = loading || isLoading;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">Análise IA</h3>
        {renderLoading && <span className="text-xs text-slate-500">Analisando...</span>}
      </div>
      <div className="space-y-2">
        {insights.map((i, idx) => (
          <div key={idx} className={`p-3 rounded border text-sm ${
            i.severity === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            i.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            i.severity === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="font-medium">{i.title}</div>
            <div className="text-slate-700 whitespace-pre-line">{i.content}</div>
          </div>
        ))}
        {!renderLoading && insights.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-2">🤖</div>
            <p className="font-medium">Nenhuma análise disponível</p>
            <p className="text-xs mt-1">Clique em "Analisar com IA" para gerar análise detalhada</p>
          </div>
        )}
      </div>
    </div>
  );
}


