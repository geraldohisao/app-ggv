import React, { useState, useEffect } from 'react';
import { StrategicMap, TrackingMetric } from '../../types';
import { saveStrategicMap, generateExecutiveAnalysis } from '../../services/okrAIService';
import { useUser } from '../../contexts/DirectUserContext';
import { validateStrategicMap, hasBlockingErrors, formatValidationErrors } from './utils/validation';
import { useAutoSave } from './hooks/useAutoSave';
import { retrySupabaseOperation } from './utils/retryWithBackoff';

interface StrategicMapBuilderProps {
  initialMap: StrategicMap;
  onBack: () => void;
  onSaveSuccess?: () => void;
  contextData?: string;
}

const StrategicMapBuilder: React.FC<StrategicMapBuilderProps> = ({ 
  initialMap, 
  onBack,
  onSaveSuccess,
  contextData 
}) => {
  const { user } = useUser();
  const [map, setMap] = useState<StrategicMap>(initialMap);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);

  // Auto-save no localStorage (não no servidor)
  const { saveDraft, loadDraft, clearDraft } = useAutoSave(map, user?.id || '');

  // Carregar draft ao montar componente
  useEffect(() => {
    if (!user) return;

    const draft = loadDraft();
    if (draft && !initialMap.id) {
      // Perguntar se quer restaurar draft
      const restore = window.confirm(
        'Encontramos um rascunho salvo automaticamente. Deseja restaurá-lo?'
      );
      
      if (restore) {
        setMap(draft);
        setShowDraftBanner(true);
        setTimeout(() => setShowDraftBanner(false), 5000);
      }
    }
  }, []);

  const handleSave = async () => {
    if (!user) {
      alert('❌ Usuário não autenticado');
      return;
    }

    // VALIDAÇÃO ANTES DE SALVAR
    const validationErrors = validateStrategicMap(map);
    
    if (hasBlockingErrors(validationErrors)) {
      // Tem erros críticos - não pode salvar
      const errorMessage = formatValidationErrors(validationErrors);
      alert(`❌ Não é possível salvar devido aos seguintes erros:\n\n${errorMessage}`);
      return;
    } else if (validationErrors.length > 0) {
      // Tem apenas warnings - perguntar se quer continuar
      const errorMessage = formatValidationErrors(validationErrors);
      const proceed = window.confirm(
        `⚠️ Há alguns avisos:\n\n${errorMessage}\n\nDeseja salvar mesmo assim?`
      );
      
      if (!proceed) return;
    }

    setIsSaving(true);
    try {
      // SALVAR COM RETRY E BACKOFF EXPONENCIAL
      const savedId = await retrySupabaseOperation(async () => {
        return await saveStrategicMap(map, user.id);
      });
      
      // Atualizar o map com o ID se for novo
      if (!map.id) {
        setMap({ ...map, id: savedId });
      }

      // Limpar draft do localStorage após salvar no servidor
      clearDraft();
      
      alert('✅ Mapa estratégico salvo com sucesso!');
      
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      
      // Mensagens de erro específicas
      let errorMessage = 'Erro ao salvar mapa estratégico.';
      
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Você não tem permissão para salvar este OKR.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'A operação demorou muito. Tente novamente.';
        }
      }
      
      alert(`❌ ${errorMessage}\n\nSeu trabalho está salvo localmente e não será perdido.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    setShowAnalysisModal(true);
    setAnalysis(null);

    try {
      const generatedAnalysis = await generateExecutiveAnalysis(map);
      setAnalysis(generatedAnalysis);
    } catch (error) {
      console.error('Erro ao gerar análise:', error);
      setAnalysis('❌ Erro ao gerar análise. Verifique se a API Key da OpenAI está configurada.');
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Draft Restored Banner */}
      {showDraftBanner && (
        <div className="bg-green-600 text-white py-3 px-6 text-center font-semibold animate-pulse">
          ✅ Rascunho restaurado! Suas alterações anteriores foram recuperadas.
        </div>
      )}

      {/* Auto-Save Indicator */}
      <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-sm z-50">
        💾 Salvamento automático ativo
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Mapa Estratégico</h1>
                <p className="text-sm text-slate-500">Planejamento Corporativo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Histórico de Versões */}
              {map.id && (
                <button 
                  onClick={() => setShowVersionHistory(true)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                  title="Histórico de Versões"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Versões
                </button>
              )}

              {/* Compartilhar */}
              {map.id && (
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                  title="Compartilhar OKR"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartilhar
                </button>
              )}

              {/* Exportar PDF */}
              <button 
                onClick={async () => {
                  try {
                    const { exportCompletePDF } = await import('./utils/exportToPDF');
                    await exportCompletePDF(map, analysis);
                    alert('✅ PDF exportado com sucesso!');
                  } catch (error) {
                    alert('❌ Para exportar PDF, instale: npm install html2canvas jspdf');
                  }
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                title="Exportar PDF"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                PDF
              </button>

              {/* Análise Avançada */}
              <button 
                onClick={() => setShowAdvancedAnalysis(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all flex items-center gap-2 font-semibold"
                title="Análise Avançada com IA"
              >
                <span className="text-lg">🎯</span>
                Análise Avançada
              </button>

              {/* Voltar */}
              <button 
                onClick={onBack}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Voltar ao Dashboard"
              >
                ← Meus Mapas
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3 space-y-6">
            {/* Identidade */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg">🎯</span>
                </div>
                <h2 className="font-bold text-slate-900">IDENTIDADE</h2>
              </div>
              <p className="text-sm text-slate-600">
                Fundamentos estratégicos que norteiam a operação.
              </p>
            </div>

            {/* Estratégias */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
                <h2 className="font-bold text-slate-900">ESTRATÉGIAS</h2>
              </div>
              <p className="text-sm text-slate-600">
                Motores de crescimento e iniciativas.
              </p>
            </div>
          </div>

          {/* Main Area */}
          <div className="col-span-9 space-y-6">
            {/* Department Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={map.company_name || 'Departamento X'}
                  onChange={(e) => setMap({ ...map, company_name: e.target.value })}
                  className="text-3xl font-bold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-2 py-1 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                📅 DATA:
                <input
                  type="date"
                  value={map.date}
                  onChange={(e) => setMap({ ...map, date: e.target.value })}
                  className="px-3 py-1 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Identity Section */}
            <div className="grid grid-cols-3 gap-4">
              <IdentityCard
                title="MISSÃO"
                value={map.mission}
                onChange={(value) => setMap({ ...map, mission: value })}
              />
              <IdentityCard
                title="VISÃO"
                value={map.vision}
                onChange={(value) => setMap({ ...map, vision: value })}
              />
              <IdentityCard
                title="VALORES"
                value={map.values?.join('\n')}
                onChange={(value) => setMap({ ...map, values: value.split('\n').filter(v => v.trim()) })}
              />
            </div>

            {/* Motors Section */}
            <div className="grid grid-cols-3 gap-4">
              <MotorCard title="MOTOR 1" />
              <MotorCard title="MOTOR 2" />
              <MotorCard title="MOTOR 3" />
            </div>

            {/* Objectives Section */}
            <div className="grid grid-cols-3 gap-4">
              <ObjectiveCard 
                title="OBJETIVO 1"
                subtitle="Aumentar a Satisfação do Cliente"
              />
              <ObjectiveCard 
                title="OBJETIVO 2"
                subtitle="Melhorar Eficiência Operacional"
              />
              <ObjectiveCard 
                title="OBJETIVO 3"
                subtitle="Expandir Base de Clientes"
              />
            </div>

            {/* Execution Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-lg">📋</span>
                </div>
                <h2 className="font-bold text-slate-900">EXECUÇÃO</h2>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-slate-600 mb-3">LEGENDA</div>
                <div className="flex gap-6 text-sm text-slate-600 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Papel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>Responsabilidade</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Métrica</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <RoleCard title="Gerente" />
                  <RoleCard title="Coordenador" />
                </div>
              </div>
            </div>

            {/* Rituals Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-lg">📅</span>
                </div>
                <h2 className="font-bold text-slate-900">RITUAIS</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Cadência de gestão e acompanhamento.
              </p>

              <div className="grid grid-cols-6 gap-4">
                {['DIÁRIO', 'SEMANAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'].map((freq) => (
                  <div key={freq} className="text-center">
                    <div className="text-xs font-semibold text-slate-500 mb-2">{freq}</div>
                    <div className="space-y-2">
                      <div className="bg-slate-50 rounded-lg p-3 text-xs">
                        <button className="text-slate-400 hover:text-blue-600">+ Adicionar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking/Acompanhamento Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <h2 className="font-bold text-slate-900">ACOMPANHAMENTO</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Performance mensal dos principais indicadores.
              </p>

              {/* Tracking Table */}
              <div className="overflow-x-auto">
                <TrackingTable map={map} setMap={setMap} />
              </div>

              <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-semibold">
                + Adicionar Linha de Acompanhamento
              </button>
            </div>

            {/* AI Analysis Card */}
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🤖</span>
                <h2 className="font-bold text-lg">ANÁLISE DE IA</h2>
              </div>
              <p className="text-slate-300 text-sm mb-6">
                Resumo executivo gerado por inteligência artificial analisando os resultados e o plano de ação.
              </p>
              <button 
                onClick={handleGenerateAnalysis}
                disabled={isGeneratingAnalysis}
                className="w-full px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isGeneratingAnalysis ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Gerar Análise Executiva</span>
                  </>
                )}
              </button>
            </div>

            {/* Save Button */}
            <div className="flex justify-between gap-3">
              <button
                onClick={onBack}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                ← Voltar ao Dashboard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {isSaving ? '⏳ Salvando...' : `💾 Salvar Versão (${map.company_name || 'Departamento X'} - ${map.date})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <h2 className="text-2xl font-bold">Análise Executiva</h2>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-white hover:text-slate-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-100px)]">
              {isGeneratingAnalysis ? (
                <div className="text-center py-12">
                  <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-slate-600">Gerando análise executiva...</p>
                  <p className="text-sm text-slate-500 mt-2">Isso pode levar alguns segundos</p>
                </div>
              ) : analysis ? (
                <div className="prose prose-slate max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-slate-700"
                    dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br/>') }}
                  />
                </div>
              ) : null}
            </div>
            <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
              >
                Fechar
              </button>
              {analysis && !isGeneratingAnalysis && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysis);
                    alert('✅ Análise copiada para a área de transferência!');
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  📋 Copiar Análise
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const IdentityCard: React.FC<{ 
  title: string; 
  value?: string;
  onChange: (value: string) => void;
}> = ({ title, value, onChange }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-slate-200 hover:border-blue-300 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full">
        {title}
      </span>
      <button className="text-slate-400 hover:text-red-500">✕</button>
    </div>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={title}
      className="w-full h-20 text-sm text-slate-700 resize-none outline-none"
    />
  </div>
);

const MotorCard: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-slate-200">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold text-slate-600">● {title}</span>
      <button className="text-slate-400 hover:text-red-500">✕</button>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">●</span>
        <input
          type="text"
          placeholder="Estratégia 1"
          className="flex-1 outline-none text-slate-700"
        />
        <button className="text-slate-400 hover:text-red-500 text-xs">✕</button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">●</span>
        <input
          type="text"
          placeholder="Estratégia 2"
          className="flex-1 outline-none text-slate-700"
        />
        <button className="text-slate-400 hover:text-red-500 text-xs">✕</button>
      </div>
      <button className="text-xs text-slate-400 hover:text-blue-600 mt-2">+ Adicionar</button>
    </div>
  </div>
);

const ObjectiveCard: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200">
    <div className="border-b-4 border-slate-900 px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full">
          {title}
        </span>
        <button className="text-slate-400 hover:text-red-500">✕</button>
      </div>
      <div className="text-sm font-semibold text-slate-900 mt-2">{subtitle}</div>
    </div>
    <div className="p-4 space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">INDICADOR (KPI)</span>
          <span className="text-slate-500">FREQ.</span>
          <span className="text-slate-500">META</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">NPS</span>
          <span className="text-slate-600">Mensal</span>
          <span className="font-semibold text-slate-900">75</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">CSAT</span>
          <span className="text-slate-600">Semanal</span>
          <span className="font-semibold text-slate-900">4.5/5</span>
        </div>
      </div>
      <button className="text-xs text-slate-400 hover:text-blue-600">+ Adicionar KPI</button>
    </div>
  </div>
);

const RoleCard: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xs text-slate-500 mb-1">PAPEL</div>
        <div className="font-bold text-slate-900">{title}</div>
      </div>
      <button className="text-slate-400 hover:text-red-500">✕</button>
    </div>
    
    <div className="space-y-3">
      <div>
        <div className="text-xs text-slate-500 mb-1">RESPONSABILIDADE</div>
        <textarea 
          placeholder="Coordenar"
          className="w-full text-sm text-slate-700 outline-none resize-none h-12"
        />
      </div>
      
      <div>
        <div className="text-xs text-slate-500 mb-2">MÉTRICA</div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-700">NPS</span>
          <span className="font-semibold">&gt; 75</span>
        </div>
      </div>
      
      <button className="text-xs text-slate-400 hover:text-blue-600">+ Add Métrica (1/5)</button>
    </div>
  </div>
);

// Optimized Tracking Cell with React.memo and debounce
const TrackingCell = React.memo<{
  value: number;
  onChange: (value: number) => void;
  type: 'real' | 'meta';
}>(({ value, onChange, type }) => {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Debounce de 500ms para evitar updates excessivos
  const handleChange = (newValue: string) => {
    const numValue = Number(newValue);
    setLocalValue(numValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(numValue);
    }, 500);
  };

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <input
      type="number"
      value={localValue || ''}
      onChange={(e) => handleChange(e.target.value)}
      className={`w-full text-center bg-transparent outline-none ${
        type === 'real' ? 'font-normal' : 'font-normal'
      }`}
    />
  );
});

TrackingCell.displayName = 'TrackingCell';

// Tracking Table Component (otimizado)
const TrackingTable: React.FC<{ 
  map: StrategicMap; 
  setMap: React.Dispatch<React.SetStateAction<StrategicMap>>;
}> = React.memo(({ map, setMap }) => {
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  
  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-green-100 text-green-800';
    if (percentage >= 85) return 'bg-yellow-100 text-yellow-800';
    if (percentage >= 70) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const calculatePercentage = (real: number, meta: number): string => {
    if (!meta || meta === 0) return '0%';
    const pct = ((real / meta) * 100).toFixed(0);
    return `${pct}%`;
  };

  // Dados de exemplo (podem vir do map.tracking)
  const trackingData = [
    {
      indicator: 'Faturamento',
      type: 'Moeda (R$)',
      data: {
        real: [5000, 4000, 3800, 1200, 8700, 4200, 2500, 7500, 2900, 9900, 6800, 7700],
        meta: [9500, 900, 4500, 2200, 7300, 9700, 7600, 2400, 6600, 3400, 800, 7800]
      },
      average: 5350,
      total: 64200
    },
    {
      indicator: 'Atendimentos',
      type: 'Quantidade (#)',
      data: {
        real: [8049, 2867, 3363, 377, 3683, 3631, 8749, 1289, 3440, 9729, 5287, 4499],
        meta: [3439, 1252, 3071, 9159, 39, 5456, 9809, 3133, 7779, 1327, 2505, 1280]
      },
      average: 4580,
      total: 54963
    }
  ];

  return (
    <div className="min-w-full">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-600">INDICADOR</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-600">DADO</th>
            {months.map((month) => (
              <th key={month} className="text-center py-3 px-2 font-semibold text-slate-600">
                {month}
              </th>
            ))}
            <th className="text-center py-3 px-3 font-semibold text-slate-600">MÉDIA</th>
            <th className="text-center py-3 px-3 font-semibold text-slate-600">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {trackingData.map((item, idx) => (
            <React.Fragment key={idx}>
              {/* Indicator Name Row */}
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 font-semibold text-slate-900" rowSpan={3}>
                  {item.indicator}
                  <div className="text-xs text-slate-500 font-normal mt-1">{item.type}</div>
                </td>
                <td className="py-2 px-3 text-slate-600 bg-slate-50">REAL</td>
                {item.data.real.map((value, i) => (
                  <td key={i} className="py-2 px-2 text-center bg-slate-50">
                    <TrackingCell
                      value={value}
                      type="real"
                      onChange={(newValue) => {
                        console.log(`Real value updated: ${newValue}`);
                      }}
                    />
                  </td>
                ))}
                <td className="py-2 px-3 text-center font-semibold bg-slate-50">
                  {item.average.toLocaleString('pt-BR')}
                </td>
                <td className="py-2 px-3 text-center font-semibold bg-slate-50">
                  {item.type.includes('R$') ? `R$ ${item.total.toLocaleString('pt-BR')}` : item.total.toLocaleString('pt-BR')}
                </td>
              </tr>
              
              {/* Meta Row */}
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 text-slate-600 bg-blue-50">META</td>
                {item.data.meta.map((value, i) => (
                  <td key={i} className="py-2 px-2 text-center bg-blue-50">
                    <TrackingCell
                      value={value}
                      type="meta"
                      onChange={(newValue) => {
                        console.log(`Meta value updated: ${newValue}`);
                      }}
                    />
                  </td>
                ))}
                <td className="py-2 px-3 text-center bg-blue-50"></td>
                <td className="py-2 px-3 text-center bg-blue-50"></td>
              </tr>
              
              {/* Percentage Row */}
              <tr className="border-b border-slate-200">
                <td className="py-2 px-3 text-slate-600">%</td>
                {item.data.real.map((real, i) => {
                  const meta = item.data.meta[i];
                  const percentage = meta > 0 ? ((real / meta) * 100) : 0;
                  return (
                    <td key={i} className="py-2 px-2 text-center">
                      <span className={`px-2 py-1 rounded font-semibold text-xs ${getPercentageColor(percentage)}`}>
                        {calculatePercentage(real, meta)}
                      </span>
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-center"></td>
                <td className="py-2 px-3 text-center"></td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
});

TrackingTable.displayName = 'TrackingTable';

export default StrategicMapBuilder;

