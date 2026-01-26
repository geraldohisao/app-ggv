import React, { useState } from 'react';
import * as transcriptService from '../../../../../services/googleMeetTranscriptService';

interface CheckinStep1InputProps {
  onSelectManual: () => void;
  onAnalyzeComplete: (result: any) => void;
  onAnalyzeStart: () => void;
  onAnalyzeError?: () => void;
  analyzeTranscription: (transcription: string) => Promise<any>;
  isAnalyzing: boolean;
  sprintId: string;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type InputMode = 'choice' | 'ai-options' | 'paste' | 'google-meet' | 'preview';

export const CheckinStep1Input: React.FC<CheckinStep1InputProps> = ({
  onSelectManual,
  onAnalyzeComplete,
  onAnalyzeStart,
  onAnalyzeError,
  analyzeTranscription,
  isAnalyzing,
  sprintId,
  addToast,
}) => {
  const [inputMode, setInputMode] = useState<InputMode>('choice');
  const [transcription, setTranscription] = useState('');
  
  // Google Meet state
  const [searchingTranscripts, setSearchingTranscripts] = useState(false);
  const [transcriptResults, setTranscriptResults] = useState<transcriptService.DriveFile[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState<{
    content: string;
    fileName: string;
    fileId: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchGoogleMeet = async (query?: string) => {
    setSearchingTranscripts(true);
    try {
      // Buscar com o termo de pesquisa se fornecido
      const results = await transcriptService.searchMeetTranscripts(
        query || undefined, 
        50, 
        180, // Últimos 6 meses
        false // Modo flexível (não apenas transcrições oficiais)
      );
      setTranscriptResults(results.files);
      if (results.files.length === 0) {
        addToast('Nenhum documento encontrado. Tente outro termo de busca.', 'info');
      }
    } catch (error) {
      addToast('Erro ao buscar transcrições. Verifique permissões do Google Drive.', 'error');
      console.error('Erro ao buscar transcrições:', error);
    } finally {
      setSearchingTranscripts(false);
    }
  };

  const handleSelectTranscript = async (file: transcriptService.DriveFile) => {
    setLoadingContent(true);
    try {
      const content = await transcriptService.getDocumentContent(file.id);
      setTranscriptPreview({
        content: content.content,
        fileName: content.fileName,
        fileId: file.id,
      });
      setInputMode('preview');
    } catch (error) {
      addToast('Erro ao carregar transcrição. Verifique permissões.', 'error');
      console.error('Erro ao carregar transcrição:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleAcceptPreview = async () => {
    if (!transcriptPreview) return;
    
    setTranscription(transcriptPreview.content);
    
    // Save transcript import (non-blocking, errors are logged but don't stop the flow)
    try {
      const saved = await transcriptService.saveTranscriptImport(sprintId, {
        fileId: transcriptPreview.fileId,
        fileName: transcriptPreview.fileName,
        content: transcriptPreview.content,
        webViewLink: `https://docs.google.com/document/d/${transcriptPreview.fileId}/view`,
      });
      if (saved) {
        await transcriptService.acceptTranscriptImport(saved.id!);
      }
    } catch (error) {
      console.error('Erro ao salvar transcrição (não crítico):', error);
    }
    
    // Analyze with AI
    try {
      await handleAnalyze(transcriptPreview.content);
    } catch (error) {
      console.error('Erro durante análise:', error);
      // handleAnalyze already handles its own errors, this is just a safety net
    }
  };

  const handleRejectPreview = async () => {
    if (!transcriptPreview) return;
    
    try {
      const saved = await transcriptService.saveTranscriptImport(sprintId, {
        fileId: transcriptPreview.fileId,
        fileName: transcriptPreview.fileName,
        content: transcriptPreview.content,
        webViewLink: `https://docs.google.com/document/d/${transcriptPreview.fileId}/view`,
      });
      if (saved) {
        await transcriptService.rejectTranscriptImport(saved.id!, 'Usuário rejeitou o conteúdo');
      }
    } catch (error) {
      console.error('Erro ao rejeitar transcrição:', error);
    }
    
    setTranscriptPreview(null);
    setInputMode('google-meet');
    addToast('Transcrição rejeitada.', 'info');
  };

  const handleAnalyze = async (text?: string) => {
    const textToAnalyze = text || transcription;
    
    if (!textToAnalyze || textToAnalyze.trim().length < 50) {
      addToast('Cole uma transcrição com pelo menos 50 caracteres.', 'error');
      return;
    }

    onAnalyzeStart();
    try {
      console.log('🤖 Iniciando análise com IA...', textToAnalyze.length, 'caracteres');
      const result = await analyzeTranscription(textToAnalyze);
      console.log('✅ Análise concluída:', result);
      
      // Show success toast first
      addToast('Transcrição analisada com sucesso!', 'success');
      
      // Then call the completion handler (wrapped in try-catch for safety)
      try {
        onAnalyzeComplete(result);
      } catch (completeError) {
        console.error('❌ Erro ao processar resultado:', completeError);
        addToast('Erro ao processar resultado. Tente novamente.', 'error');
        if (onAnalyzeError) {
          onAnalyzeError();
        }
      }
    } catch (error: any) {
      console.error('❌ Erro na análise:', error);
      addToast(`Erro ao analisar: ${error.message}`, 'error');
      // Reset analyzing state on error
      if (onAnalyzeError) {
        onAnalyzeError();
      }
    }
  };

  // Choice screen - AI vs Manual
  if (inputMode === 'choice') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="text-center mb-8">
          <h3 className="text-xl font-black text-slate-800 mb-2">
            Como você quer registrar o check-in?
          </h3>
          <p className="text-slate-500">
            Escolha a melhor forma para documentar o progresso do ciclo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Option */}
          <button
            type="button"
            onClick={() => setInputMode('ai-options')}
            className="group relative p-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="absolute top-4 right-4 px-2 py-1 bg-purple-100 rounded-full">
              <span className="text-[10px] font-bold text-purple-700 uppercase">Recomendado</span>
            </div>
            <div className="text-5xl mb-4">🤖</div>
            <h4 className="text-lg font-black text-purple-900 mb-2">
              Analisar com IA
            </h4>
            <p className="text-sm text-purple-700 leading-relaxed">
              Cole a transcrição da reunião ou importe do Google Meet. A IA extrairá automaticamente entregas, bloqueios e decisões.
            </p>
            <div className="mt-4 flex items-center gap-2 text-purple-600">
              <span className="text-sm font-bold">Começar</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Manual Option */}
          <button
            type="button"
            onClick={onSelectManual}
            className="group p-8 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-slate-400 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="text-5xl mb-4">✍️</div>
            <h4 className="text-lg font-black text-slate-800 mb-2">
              Preencher Manualmente
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Preencha os campos diretamente. Ideal para check-ins rápidos ou quando não há transcrição disponível.
            </p>
            <div className="mt-4 flex items-center gap-2 text-slate-600">
              <span className="text-sm font-bold">Começar</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // AI Options - Google Meet or Paste
  if (inputMode === 'ai-options') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <button
          type="button"
          onClick={() => setInputMode('choice')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl font-black text-slate-800 mb-2">
            De onde vem a transcrição?
          </h3>
          <p className="text-slate-500">
            Escolha a fonte da transcrição para análise
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Google Meet */}
          <button
            type="button"
            onClick={() => {
              setInputMode('google-meet');
              handleSearchGoogleMeet();
            }}
            className="group p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <div>
                <h4 className="font-black text-blue-900">Google Meet</h4>
                <p className="text-xs text-blue-600">Importar do Drive</p>
              </div>
            </div>
            <p className="text-sm text-blue-700">
              Selecione uma transcrição salva automaticamente pelo Google Meet.
            </p>
          </button>

          {/* Paste text */}
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            className="group p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h4 className="font-black text-purple-900">Colar Texto</h4>
                <p className="text-xs text-purple-600">Qualquer transcrição</p>
              </div>
            </div>
            <p className="text-sm text-purple-700">
              Cole texto de qualquer fonte: Zoom, Teams, Otter.ai, ou anotações.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // Paste transcription
  if (inputMode === 'paste') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <button
          type="button"
          onClick={() => setInputMode('ai-options')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h3 className="font-black text-purple-900">Cole a Transcrição</h3>
              <p className="text-xs text-purple-600">Mínimo 50 caracteres</p>
            </div>
          </div>

          <textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder={`Cole aqui a transcrição da reunião...\n\nExemplo:\n"Essa semana conseguimos concluir a integração com o CRM. Tivemos um problema com o servidor que ficou fora do ar por 2 dias. Decidimos contratar mais um SDR. Para a próxima semana vamos focar em fechar o pipeline de março."`}
            rows={10}
            className="w-full px-4 py-3 border-2 border-purple-200 bg-white rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none text-sm"
          />

          <div className="flex items-center justify-between mt-4">
            <span className={`text-xs font-medium ${transcription.length >= 50 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {transcription.length} / 50+ caracteres
            </span>
            
            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || transcription.trim().length < 50}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Analisando...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Analisar com IA
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Google Meet list
  if (inputMode === 'google-meet') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <button
          type="button"
          onClick={() => setInputMode('ai-options')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">📂</span>
              </div>
              <div>
                <h3 className="font-black text-blue-900">Documentos do Google Drive</h3>
                <p className="text-xs text-blue-600">Transcrições, notas de reunião, atas</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSearchGoogleMeet(searchQuery)}
              disabled={searchingTranscripts}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {searchingTranscripts ? 'Buscando...' : '🔄 Atualizar'}
            </button>
          </div>

          {/* Search input */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchGoogleMeet(searchQuery);
                  }
                }}
                placeholder="Buscar por nome do documento..."
                className="w-full px-4 py-2.5 pl-10 border-2 border-blue-200 bg-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              />
              <svg className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    handleSearchGoogleMeet('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-[10px] text-blue-600 mt-1">
              Pressione Enter para buscar ou clique em Atualizar
            </p>
          </div>

          {searchingTranscripts ? (
            <div className="flex items-center justify-center py-12 gap-3 text-blue-600">
              <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="font-medium">Buscando documentos...</span>
            </div>
          ) : transcriptResults.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-medium">Nenhum documento encontrado.</p>
              <p className="text-xs mt-2 text-slate-400 max-w-xs mx-auto">
                Tente buscar por outro termo ou verifique se você tem acesso aos documentos no Google Drive.
              </p>
              <button
                type="button"
                onClick={() => handleSearchGoogleMeet('')}
                className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200 transition-colors"
              >
                Buscar todos os documentos recentes
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-blue-600 mb-2">
                {transcriptResults.length} documento(s) encontrado(s) nos últimos 6 meses
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {transcriptResults.map((file) => {
                  const isTranscript = file.name.toLowerCase().includes('transcript') || file.name.toLowerCase().includes('transcrição');
                  return (
                    <button
                      type="button"
                      key={file.id}
                      onClick={() => handleSelectTranscript(file)}
                      disabled={loadingContent}
                      className="w-full text-left p-4 bg-white rounded-xl border-2 border-blue-100 hover:border-blue-300 hover:shadow-md transition-all disabled:opacity-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isTranscript ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          <span className="text-sm">{isTranscript ? '🎙️' : '📄'}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">{file.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-500">
                              {new Date(file.modifiedTime).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {isTranscript && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Transcrição
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Preview imported transcript
  if (inputMode === 'preview' && transcriptPreview) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <h3 className="font-black text-emerald-900">Transcrição Carregada</h3>
                <p className="text-xs text-emerald-600 truncate max-w-[200px]">
                  {transcriptPreview.fileName}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 max-h-80 overflow-y-auto border border-emerald-200">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {transcriptPreview.content}
            </pre>
          </div>
          <p className="text-xs text-emerald-600 mt-2">
            📄 {transcriptPreview.content.length.toLocaleString('pt-BR')} caracteres no total
          </p>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={handleAcceptPreview}
              disabled={isAnalyzing}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Analisando...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Analisar com IA
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRejectPreview}
              disabled={isAnalyzing}
              className="py-3 px-6 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors disabled:opacity-50"
            >
              Escolher Outra
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CheckinStep1Input;
