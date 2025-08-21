import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicReport } from '../services/supabaseService';
import { LoadingSpinner, ErrorDisplay } from './ui/Feedback';
import { GGVInteligenciaBrand } from './ui/BrandLogos';

const PublicDiagnosticReport: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('t') || window.location.pathname.split('/r/')[1] || '';
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const row = await getPublicReport(token);
        if (!row) { setError('Relatório não encontrado ou expirado.'); return; }
        setData(row.report);
      } catch (e: any) {
        setError(e?.message || 'Falha ao carregar relatório público.');
      }
    })();
  }, [token]);

  if (!token) return <ErrorDisplay message="Token inválido." />;
  if (error) return <ErrorDisplay message={error} />;
  if (!data) return <div className="p-8"><LoadingSpinner text="Carregando relatório..." /></div>;

  const { companyData, segment, totalScore, maturity, summaryInsights, detailedAnalysis } = data;
  const isFull = (params.get('full') === '1');

  const topStrengths = useMemo(() => (detailedAnalysis?.strengths || []).slice(0, 3), [detailedAnalysis]);
  const nextSteps = useMemo(() => (detailedAnalysis?.nextSteps || []).slice(0, 3), [detailedAnalysis]);

  if (!isFull) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
        <div className="max-w-screen-sm mx-auto p-4 space-y-6">
          {/* Header com logo */}
          <div className="text-center pt-8 pb-4">
            <img 
              src="https://ggvinteligencia.com.br/wp-content/uploads/2023/12/image-1.svg" 
              alt="GGV Inteligência" 
              className="h-12 mx-auto mb-3"
            />
            <p className="text-slate-600 font-medium">Inteligência em Vendas</p>
          </div>

          {/* Card principal */}
          <section className="rounded-3xl p-8 text-white bg-gradient-to-br from-blue-900 via-teal-700 to-teal-500 shadow-2xl border border-white/20">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-extrabold leading-tight mb-2">Diagnóstico Comercial</h1>
              <p className="text-teal-100 text-lg font-medium">{companyData?.companyName}</p>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-center mb-4">
                <p className="text-sm text-teal-100 uppercase tracking-wider">Segmento</p>
                <p className="font-bold text-lg">{segment?.name || 'Geral'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-xs text-teal-100 uppercase tracking-wider mb-1">Maturidade</p>
                  <p className="text-3xl font-black text-white">{Math.round((totalScore/90)*100)}%</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-xs text-teal-100 uppercase tracking-wider mb-1">Nível</p>
                  <p className="text-xl font-bold text-white">{maturity?.level}</p>
                </div>
              </div>
            </div>
          </section>

          {summaryInsights && (
            <section className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold">📋</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Resumo Executivo</h2>
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{summaryInsights.specialistInsight}</p>
            </section>
          )}

          {topStrengths.length > 0 && (
            <section className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">✅</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Pontos Fortes</h2>
              </div>
              <ul className="space-y-3">
                {topStrengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-slate-700 leading-relaxed">{s}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {nextSteps.length > 0 && (
            <section className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold">🎯</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Próximos Passos</h2>
              </div>
              <ul className="space-y-3">
                {nextSteps.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold text-sm">{i + 1}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{s}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* CTA para relatório completo */}
          <div className="text-center pt-4 pb-8">
            <a href={`?full=1`} 
               className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-900 to-teal-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
              <span>📊</span>
              Ver relatório completo
            </a>
          </div>
        </div>
      </div>
    );
  }

  const CoverTab = React.lazy(() => import('./diagnostico/report/CoverTab').then(m => ({ default: m.CoverTab })));
  const DashboardTab = React.lazy(() => import('./diagnostico/report/DashboardTab').then(m => ({ default: m.DashboardTab })));
  const SegmentedAnalysisTab = React.lazy(() => import('./diagnostico/report/SegmentedAnalysisTab').then(m => ({ default: m.SegmentedAnalysisTab })));
  const TextualDiagnosisTab = React.lazy(() => import('./diagnostico/report/TextualDiagnosisTab').then(m => ({ default: m.TextualDiagnosisTab })));
  const AIAnalysisTab = React.lazy(() => import('./diagnostico/report/AIAnalysisTab').then(m => ({ default: m.AIAnalysisTab })));
  const scoresByArea = data.scoresByArea;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <Suspense fallback={<div className="p-6 bg-white rounded-2xl shadow"><LoadingSpinner text="Carregando..." /></div>}>
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
          <CoverTab companyData={companyData} specialistName={undefined} />
        </div>
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
          <DashboardTab maturity={maturity} totalScore={totalScore} scoresByArea={scoresByArea} segment={segment} />
        </div>
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
          <SegmentedAnalysisTab scoresByArea={scoresByArea} detailedAnalysis={detailedAnalysis} isLoading={false} />
        </div>
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
          <TextualDiagnosisTab summaryInsights={summaryInsights} isLoading={false} />
        </div>
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
          <AIAnalysisTab detailedAnalysis={detailedAnalysis} isGenerating={false} />
        </div>
      </Suspense>
    </div>
  );
};

export default PublicDiagnosticReport;


