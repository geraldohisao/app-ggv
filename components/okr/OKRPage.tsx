import React, { useState } from 'react';
import OKRDashboard from './OKRDashboard';
import OKRContextForm from './OKRContextForm';
import StrategicMapBuilder from './StrategicMapBuilder';
import { StrategicMap } from '../../types';
import { generateStrategicMapWithAI } from '../../services/okrAIService';

type ViewMode = 'dashboard' | 'initial' | 'context-form' | 'map-builder' | 'generating';

const OKRPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [currentMap, setCurrentMap] = useState<StrategicMap | null>(null);
  const [contextData, setContextData] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleCreateWithAI = () => {
    setViewMode('context-form');
  };

  const handleCreateFromScratch = () => {
    // Criar mapa vazio
    const emptyMap: StrategicMap = {
      company_name: 'Empresa',
      date: new Date().toISOString().split('T')[0],
      mission: '',
      vision: '',
      values: [],
      motors: [],
      objectives: [],
      actionPlans: [],
      roles: [],
      rituals: [],
      tracking: []
    };
    setCurrentMap(emptyMap);
    setViewMode('map-builder');
  };

  const handleContextSubmit = async (context: string) => {
    setContextData(context);
    setIsGenerating(true);
    setGenerationError(null);
    setViewMode('generating');
    
    try {
      console.log('🎯 Gerando mapa estratégico com IA...');
      const generatedMap = await generateStrategicMapWithAI(context);
      console.log('✅ Mapa gerado:', generatedMap);
      
      setCurrentMap(generatedMap);
      setViewMode('map-builder');
    } catch (error) {
      console.error('❌ Erro ao gerar mapa:', error);
      setGenerationError(error instanceof Error ? error.message : 'Erro desconhecido ao gerar mapa estratégico');
      setViewMode('context-form');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setCurrentMap(null);
    setContextData('');
  };

  const handleBackToInitial = () => {
    setViewMode('initial');
  };

  const handleCreateNew = () => {
    setCurrentMap(null);
    setContextData('');
    setViewMode('initial');
  };

  const handleEditMap = (map: StrategicMap) => {
    setCurrentMap(map);
    setViewMode('map-builder');
  };

  // Dashboard View
  if (viewMode === 'dashboard') {
    return (
      <OKRDashboard 
        onCreateNew={handleCreateNew}
        onEditMap={handleEditMap}
      />
    );
  }

  if (viewMode === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="mb-6">
            <svg className="animate-spin h-16 w-16 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            ✨ Gerando seu Plano Estratégico
          </h2>
          <p className="text-slate-600">
            A IA está analisando o contexto e criando um mapa estratégico completo para você...
          </p>
          <div className="mt-6 text-sm text-slate-500">
            Isso pode levar alguns segundos
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'context-form') {
    return (
      <OKRContextForm 
        onSubmit={handleContextSubmit}
        onBack={handleBackToInitial}
        initialContext={contextData}
        onContextChange={setContextData}
      />
    );
  }

  if (viewMode === 'map-builder' && currentMap) {
    return (
      <StrategicMapBuilder
        initialMap={currentMap}
        onBack={handleBackToDashboard}
        onSaveSuccess={handleBackToDashboard}
        contextData={contextData}
      />
    );
  }

  // Initial View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Construção Estratégica
          </h1>
          <p className="text-lg text-slate-600">
            Vamos começar pelo contexto. Descreva sua empresa, desafios ou faça upload de documentos.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Context Input Area */}
          <div className="mb-8">
            <textarea
              value={contextData}
              onChange={(e) => setContextData(e.target.value)}
              className="w-full h-48 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-slate-700 placeholder-slate-400"
              placeholder="Digite sobre o contexto da empresa aqui... (Ex: Somos uma consultoria querendo dobrar o faturamento...)"
            />
            
            {/* Upload Button Only */}
            <div className="flex gap-3 mt-3 justify-end">
              <button className="px-6 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2 font-semibold text-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload de Arquivos
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleCreateWithAI}
              className="flex items-center justify-between p-6 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-all shadow-lg hover:shadow-xl group"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">✨</div>
                <div className="text-left">
                  <div className="font-bold text-lg">Gerar Plano com IA</div>
                  <div className="text-sm text-slate-300">Baseado no contexto</div>
                </div>
              </div>
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={handleCreateFromScratch}
              className="flex items-center justify-between p-6 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-xl transition-all hover:border-slate-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">📋</div>
                <div className="text-left">
                  <div className="font-bold text-lg">Construir do Zero</div>
                  <div className="text-sm text-slate-500">Quadro em branco</div>
                </div>
              </div>
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OKRPage;
