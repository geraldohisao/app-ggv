import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicReport } from '../services/supabaseService';
import { LoadingSpinner, ErrorDisplay } from './ui/Feedback';
import { GGVInteligenciaBrand } from './ui/BrandLogos';
import MarkdownRenderer from './ui/MarkdownRenderer';

const PublicDiagnosticReport: React.FC = () => {
  const [params] = useSearchParams();
  // Apenas formato seguro: /r/{token}
  const token = params.get('t') || window.location.pathname.split('/r/')[1] || '';
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Todos os hooks devem estar no topo, antes de qualquer return condicional
  const isFull = (params.get('full') === '1');
  const topStrengths = useMemo(() => (data?.detailedAnalysis?.strengths || []).slice(0, 3), [data?.detailedAnalysis]);
  const nextSteps = useMemo(() => (data?.detailedAnalysis?.nextSteps || []).slice(0, 3), [data?.detailedAnalysis]);

  // Lazy imports - devem estar sempre no mesmo lugar
  const SalesBottlenecksTab = React.lazy(() => import('./diagnostico/report/SalesBottlenecksTab').then(m => ({ default: m.SalesBottlenecksTab })));
  const MarketComparisonTab = React.lazy(() => import('./diagnostico/report/MarketComparisonTab').then(m => ({ default: m.MarketComparisonTab })));
  const AIAnalysisTab = React.lazy(() => import('./diagnostico/report/AIAnalysisTab').then(m => ({ default: m.AIAnalysisTab })));

  useEffect(() => {
    // Scroll para o topo ao abrir relatório público
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    (async () => {
      try {
        console.log('🔍 PUBLIC_REPORT - Carregando relatório com token:', token);
        const row = await getPublicReport(token);
        if (!row) { 
          setError('Relatório não encontrado ou expirado.'); 
          return; 
        }
        console.log('✅ PUBLIC_REPORT - Relatório carregado com sucesso');
        setData(row.report);
      } catch (e: any) {
        console.error('❌ PUBLIC_REPORT - Erro ao carregar:', e);
        
        // Mensagem de erro mais específica
        let errorMessage = e?.message || 'Falha ao carregar relatório público.';
        
        // Se é um token antigo, dar instruções específicas
        if (errorMessage.includes('antes da implementação do novo sistema')) {
          errorMessage = `
            Este diagnóstico foi criado antes da atualização do sistema de armazenamento.
            
            Para recuperar seus resultados:
            1. Entre em contato com o suporte
            2. Refaça o diagnóstico se necessário
            3. Verifique se você tem o link correto
            
            Detalhes técnicos: ${errorMessage}
          `.trim();
        }
        
        setError(errorMessage);
      }
    })();
  }, [token]);

  // Meta Pixel Code - Adicionar ao head quando componente montar
  useEffect(() => {
    // Verificar se o Meta Pixel já foi carregado para evitar duplicação
    if ((window as any).fbq) return;

    // Criar e adicionar o script do Meta Pixel
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '1728364274068645');
      fbq('track', 'PageView');
    `;
    
    // Adicionar o script ao head
    document.head.appendChild(script);

    // Adicionar noscript fallback
    const noscript = document.createElement('noscript');
    noscript.innerHTML = '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1728364274068645&ev=PageView&noscript=1" />';
    document.head.appendChild(noscript);

    console.log('📊 Meta Pixel - Carregado na página de resultado público');

    // Cleanup quando componente desmontar
    return () => {
      // Remover scripts adicionados (opcional, pois geralmente queremos manter o pixel)
      console.log('📊 Meta Pixel - Componente desmontado');
    };
  }, []);

  if (!token) return <ErrorDisplay message="Token inválido." />;
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-red-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Ocorreu um Erro</h1>
            <p className="text-slate-600">Não foi possível carregar o relatório</p>
          </div>
          
          <div className="bg-red-50 rounded-2xl p-6 border border-red-200 mb-6">
            <h2 className="font-semibold text-red-800 mb-2">Detalhes do erro:</h2>
            <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border">{error}</pre>
          </div>
          
          <div className="text-center space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
            
            <div className="text-sm text-slate-500">
              <p>Se o problema persistir, entre em contato com o suporte.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  if (!data) return <div className="p-8"><LoadingSpinner text="Carregando relatório..." /></div>;

  const { companyData, segment, totalScore, maturity, summaryInsights, detailedAnalysis } = data;

  if (!isFull) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
        <div className="max-w-screen-sm mx-auto p-4 space-y-6">
          {/* Header com logo */}
          <div className="text-center pt-8 pb-4">
            <img 
              src="https://ggvinteligencia.com.br/wp-content/uploads/2023/12/image-1.svg" 
              alt="GGV Inteligência" 
              className="h-16 mx-auto mb-3"
            />
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
              <MarkdownRenderer text={summaryInsights.specialistInsight} className="text-slate-700 leading-relaxed" />
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
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2.5 flex-shrink-0"></div>
                    <div className="text-slate-700 leading-relaxed flex-1">
                      <MarkdownRenderer text={s} inline={true} />
                    </div>
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
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-600 font-bold text-sm">{i + 1}</span>
                    </div>
                    <div className="text-slate-700 leading-relaxed flex-1">
                      <MarkdownRenderer text={s} inline={true} />
                    </div>
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

  const scoresByArea = data.scoresByArea;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <Suspense fallback={<div className="p-6 bg-white rounded-2xl shadow"><LoadingSpinner text="Carregando..." /></div>}>
        {/* Pontos de Atenção - Inclui capa com maturidade + pontos de atenção */}
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
          <SalesBottlenecksTab companyData={companyData} maturity={maturity} totalScore={totalScore} segment={segment} scoresByArea={scoresByArea} detailedAnalysis={detailedAnalysis} summaryInsights={summaryInsights} specialistName={undefined} isLoading={false} />
        </div>
        {/* Comparativo de Mercado - Gráficos de benchmark e radar */}
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
          <MarketComparisonTab scoresByArea={scoresByArea} summaryInsights={summaryInsights} />
        </div>
        {/* Análise IA */}
        <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-lg border border-slate-200/50">
          <AIAnalysisTab detailedAnalysis={detailedAnalysis} isGenerating={false} />
        </div>
      </Suspense>
    </div>
  );
};

export default PublicDiagnosticReport;


