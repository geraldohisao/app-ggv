import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import useCallsDebug from '../../hooks/useCallsDebug';

interface Call {
  id: string;
  company: string;
  duration: number;
  status: string;
  created_at: string;
  total_count: number;
}

export default function CallsListWithDebug() {
  const [data, setData] = useState<{ items: Call[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hook de debug de chamadas
  const {
    logApiCall,
    logApiSuccess,
    logApiError,
    logDatabaseCall,
    logDatabaseSuccess,
    logDatabaseError,
    withDebug,
    isAvailable
  } = useCallsDebug();

  const IS_UNDER_DEVELOPMENT = (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    typeof (import.meta as any).env.VITE_CALLS_UNDER_DEV !== 'undefined'
  ) ? ((import.meta as any).env.VITE_CALLS_UNDER_DEV === 'true') : true;

  // Função wrapper com debug automático
  const fetchCallsWithDebug = withDebug(
    async (limit: number, offset: number) => {
      if (!supabase) {
        throw new Error('Supabase não inicializado');
      }

      const { data: callsData, error: callsError } = await supabase
        .rpc('get_calls', { p_limit: limit, p_offset: offset });

      if (callsError) {
        throw callsError;
      }

      return callsData || [];
    },
    'database',
    'Chamadas carregadas com sucesso',
    'Erro ao carregar chamadas'
  );

  useEffect(() => {
    if (IS_UNDER_DEVELOPMENT) {
      logApiCall('Modo desenvolvimento ativo - evitando chamadas ao backend', { IS_UNDER_DEVELOPMENT });
      return;
    }

    const loadCalls = async () => {
      setLoading(true);
      setError(null);
      
      try {
        logApiCall('Iniciando carregamento de chamadas', { limit: 50, offset: 0 });
        
        const items = await fetchCallsWithDebug(50, 0);
        const total = items.length > 0 ? items[0].total_count : 0;

        setData({ items, total });
        
        logApiSuccess('Chamadas carregadas com sucesso', { 
          count: items.length, 
          total 
        });
        
      } catch (e: any) {
        const errorMessage = e?.message || 'Erro ao carregar';
        setError(errorMessage);
        
        logApiError('Falha ao carregar chamadas', e);
      } finally {
        setLoading(false);
      }
    };

    loadCalls();
  }, [IS_UNDER_DEVELOPMENT, logApiCall, logApiSuccess, logApiError, fetchCallsWithDebug]);

  // Função para processar uma chamada específica
  const processCall = async (callId: string) => {
    const processCallWithDebug = withDebug(
      async (id: string) => {
        logDatabaseCall('Processando chamada específica', { callId: id });
        
        // Simular processamento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Atualizar status no banco
        const { error: updateError } = await supabase
          .from('calls')
          .update({ status: 'processed' })
          .eq('id', id);
          
        if (updateError) {
          throw updateError;
        }
        
        return { id, status: 'processed' };
      },
      'database',
      'Chamada processada com sucesso',
      'Erro ao processar chamada',
      callId
    );

    try {
      await processCallWithDebug(callId);
      
      // Atualizar lista local
      setData(prev => ({
        ...prev,
        items: prev.items.map(call => 
          call.id === callId 
            ? { ...call, status: 'processed' }
            : call
        )
      }));
      
    } catch (error: any) {
      logDatabaseError('Falha ao processar chamada', error, callId);
    }
  };

  // Função para testar áudio
  const testAudio = async (recordingUrl: string) => {
    const testAudioWithDebug = withDebug(
      async (url: string) => {
        logAudioCall('Testando reprodução de áudio', { url });
        
        // Simular teste de áudio
        const audio = new Audio(url);
        await audio.load();
        
        return { 
          duration: audio.duration,
          canPlay: true 
        };
      },
      'audio',
      'Áudio testado com sucesso',
      'Erro ao testar áudio'
    );

    try {
      const result = await testAudioWithDebug(recordingUrl);
      logAudioSuccess('Teste de áudio concluído', result);
    } catch (error: any) {
      logAudioError('Falha no teste de áudio', error);
    }
  };

  // Função para analisar transcrição
  const analyzeTranscription = async (transcription: string, callId: string) => {
    const analyzeWithDebug = withDebug(
      async (text: string) => {
        logTranscriptionCall('Iniciando análise de transcrição', { 
          length: text.length,
          callId 
        });
        
        // Análise básica
        const wordCount = text.split(' ').length;
        const hasGreeting = text.toLowerCase().includes('bom dia') || 
                           text.toLowerCase().includes('boa tarde') ||
                           text.toLowerCase().includes('olá');
        const hasIntroduction = text.toLowerCase().includes('meu nome') ||
                               text.toLowerCase().includes('sou');
        const hasQuestions = (text.match(/\?/g) || []).length;
        
        const analysis = {
          wordCount,
          hasGreeting,
          hasIntroduction,
          questionCount: hasQuestions,
          score: (hasGreeting ? 2 : 0) + (hasIntroduction ? 2 : 0) + (hasQuestions * 1)
        };
        
        return analysis;
      },
      'transcription',
      'Transcrição analisada com sucesso',
      'Erro ao analisar transcrição',
      callId
    );

    try {
      const result = await analyzeWithDebug(transcription);
      logTranscriptionSuccess('Análise concluída', result, callId);
      return result;
    } catch (error: any) {
      logTranscriptionError('Falha na análise', error, callId);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando chamadas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Erro ao carregar chamadas</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Indicador de debug */}
      {isAvailable && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🔧</span>
            <span className="text-blue-800 font-medium">Debug de Chamadas Ativo</span>
            <span className="text-blue-600 text-sm">
              Use Ctrl+Shift+D para abrir o painel de debug
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Chamadas ({data.total})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {data.items.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <div className="text-2xl mb-2">📞</div>
              <p>Nenhuma chamada encontrada</p>
            </div>
          ) : (
            data.items.map((call) => (
              <div key={call.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{call.company}</h3>
                    <p className="text-sm text-gray-500">
                      Duração: {call.duration}s | Status: {call.status}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(call.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {call.status !== 'processed' && (
                      <button
                        onClick={() => processCall(call.id)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Processar
                      </button>
                    )}
                    
                    <button
                      onClick={() => testAudio('https://example.com/audio.mp3')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Testar Áudio
                    </button>
                    
                    <button
                      onClick={() => analyzeTranscription('Transcrição de teste...', call.id)}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      Analisar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
