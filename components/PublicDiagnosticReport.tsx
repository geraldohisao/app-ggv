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
      <div className="max-w-screen-sm mx-auto p-4 space-y-5">
        <section className="rounded-2xl p-6 text-white bg-gradient-to-br from-blue-900 via-teal-700 to-teal-500 shadow-xl">
          <div className="flex justify-center mb-4"><GGVInteligenciaBrand className="h-8" /></div>
          <h1 className="text-2xl font-extrabold leading-tight">Diagnóstico Comercial</h1>
          <p className="text-teal-100">{companyData?.companyName}</p>
          <div className="mt-4 bg-white/15 rounded-xl p-4">
            <p className="text-sm text-teal-100">Segmento</p>
            <p className="font-semibold">{segment?.name || '-'}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-teal-100">Maturidade</p>
                <p className="text-2xl font-black">{Math.round((totalScore/90)*100)}%</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-teal-100">Nível</p>
                <p className="text-xl font-bold">{maturity?.level}</p>
              </div>
            </div>
          </div>
        </section>

        {summaryInsights && (
          <section className="bg-white rounded-2xl p-4 shadow border border-slate-200/50">
            <h2 className="text-base font-bold mb-2">Resumo</h2>
            <p className="text-slate-700 text-sm whitespace-pre-wrap">{summaryInsights.specialistInsight}</p>
          </section>
        )}

        {topStrengths.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow border border-slate-200/50">
            <h2 className="text-base font-bold mb-2">Pontos fortes</h2>
            <ul className="list-disc pl-5 text-sm space-y-1 text-slate-700">
              {topStrengths.map((s: string, i: number) => (<li key={i}>{s}</li>))}
            </ul>
          </section>
        )}

        {nextSteps.length > 0 && (
          <section className="bg-white rounded-2xl p-4 shadow border border-slate-200/50">
            <h2 className="text-base font-bold mb-2">Próximos passos</h2>
            <ul className="list-disc pl-5 text-sm space-y-1 text-slate-700">
              {nextSteps.map((s: string, i: number) => (<li key={i}>{s}</li>))}
            </ul>
          </section>
        )}

        <div className="text-center">
          <a href={`?full=1`} className="inline-block bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold">Ver relatório completo</a>
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


