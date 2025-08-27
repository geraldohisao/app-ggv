import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../contexts/DirectUserContext';
import { UserRole } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface CallLog {
  id: string;
  timestamp: Date;
  callId?: string;
  company?: string;
  duration?: number;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
  source: 'api' | 'database' | 'audio' | 'transcription' | 'analysis' | 'system';
}

interface CallError {
  id: string;
  timestamp: Date;
  callId?: string;
  errorType: 'api_error' | 'database_error' | 'audio_error' | 'transcription_error' | 'analysis_error' | 'permission_error';
  message: string;
  details?: any;
  stack?: string;
  resolved: boolean;
}

interface CallsStats {
  total: number;
  processed: number;
  errors: number;
  pending: number;
  lastUpdate: Date;
}

export const CallsDebugPanel: React.FC = () => {
  const { user } = useUser();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [callErrors, setCallErrors] = useState<CallError[]>([]);
  const [callsStats, setCallsStats] = useState<CallsStats>({
    total: 0,
    processed: 0,
    errors: 0,
    pending: 0,
    lastUpdate: new Date()
  });
  const [activeView, setActiveView] = useState<'logs' | 'errors'>('logs');
  const logCounter = useRef(0);

  // Verificar se é super admin
  const isSuperAdmin = user?.role === UserRole.SuperAdmin;

  // Função para adicionar logs de chamadas
  const addCallLog = (status: CallLog['status'], source: CallLog['source'], message: string, data?: any, callId?: string, company?: string, duration?: number) => {
    const newCallLog: CallLog = {
      id: `call-${Date.now()}-${++logCounter.current}`,
      timestamp: new Date(),
      callId,
      company,
      duration,
      status,
      message,
      data,
      source
    };
    
    setCallLogs(prev => [...prev.slice(-49), newCallLog]); // Manter últimos 50 logs
    
    // Log no console
    const colors = {
      success: 'color: #10b981',
      error: 'color: #ef4444',
      warning: 'color: #f59e0b',
      info: 'color: #3b82f6'
    };
    console.log(`%c[CALLS-${source.toUpperCase()}] ${message}`, colors[status], data);
  };

  // Função para adicionar erros de chamadas
  const addCallError = (errorType: CallError['errorType'], message: string, details?: any, callId?: string, stack?: string) => {
    const newCallError: CallError = {
      id: `call-error-${Date.now()}-${++logCounter.current}`,
      timestamp: new Date(),
      callId,
      errorType,
      message,
      details,
      stack,
      resolved: false
    };
    
    setCallErrors(prev => [...prev.slice(-24), newCallError]); // Manter últimos 25 erros
    
    // Atualizar estatísticas
    setCallsStats(prev => ({
      ...prev,
      errors: prev.errors + 1,
      lastUpdate: new Date()
    }));
    
    // Log no console
    console.error(`%c[CALLS-${errorType.toUpperCase()}] ${message}`, 'color: #ef4444', details);
  };

  // Função para marcar erro como resolvido
  const resolveCallError = (errorId: string) => {
    setCallErrors(prev => prev.map(error => 
      error.id === errorId ? { ...error, resolved: true } : error
    ));
  };

  // Função para buscar estatísticas de chamadas
  const fetchCallsStats = async () => {
    try {
      if (!supabase) {
        addCallError('database_error', 'Supabase não inicializado');
        return;
      }

      // Buscar estatísticas básicas
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('id, status, created_at')
        .limit(1000);

      if (callsError) {
        addCallError('database_error', `Erro ao buscar chamadas: ${callsError.message}`, callsError);
        return;
      }

      const calls = callsData || [];
      const stats = {
        total: calls.length,
        processed: calls.filter(c => c.status === 'processed').length,
        errors: calls.filter(c => c.status === 'error').length,
        pending: calls.filter(c => c.status === 'pending' || c.status === 'received').length,
        lastUpdate: new Date()
      };

      setCallsStats(stats);
      addCallLog('success', 'database', `Estatísticas atualizadas: ${stats.total} total, ${stats.processed} processadas`, stats);
    } catch (error: any) {
      addCallError('database_error', `Erro ao buscar estatísticas: ${error.message}`, error);
    }
  };

  // Testes específicos para chamadas
  const runCallTest = async (testName: string, testFn: () => Promise<any>) => {
    const startTime = performance.now();
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      addCallLog('success', 'system', `Teste ${testName} executado com sucesso`, { duration, result });
      return { success: true, duration, result };
    } catch (error: any) {
      const duration = performance.now() - startTime;
      addCallError('analysis_error', `Erro no teste ${testName}: ${error.message}`, error);
      return { success: false, duration, error: error.message };
    }
  };

  const tests = {
    database: async () => {
      if (!supabase) throw new Error('Supabase não inicializado');
      
      const { data: callsData, error: callsError } = await supabase
        .rpc('get_calls', { p_limit: 5, p_offset: 0 });
      
      if (callsError) throw callsError;
      
      return { count: callsData?.length || 0 };
    },
    api: async () => {
      // Simular teste de API de chamadas
      const mockCallId = 'test-call-' + Date.now();
      const mockCallData = {
        id: mockCallId,
        company: 'Empresa Teste',
        duration: 180,
        status: 'processed',
        recording_url: 'https://example.com/audio.mp3',
        transcription: 'Transcrição de teste...'
      };
      
      return { callId: mockCallId, data: mockCallData };
    },
    audio: async () => {
      // Teste de conversão de URL de áudio
      const testUrl = 'https://drive.google.com/file/d/1BxGKJ8vQZgJ4mVcX2nP9rL7sK3fH6wE/view?usp=sharing';
      const convertedUrl = testUrl.replace('/file/d/', '/uc?export=download&id=').replace('/view?usp=sharing', '');
      
      return { original: testUrl, converted: convertedUrl };
    },
    transcription: async () => {
      // Teste de análise de transcrição
      const testTranscription = 'Bom dia! Meu nome é João Silva do Grupo GGV. Estou entrando em contato com a TechCorp para falar sobre soluções de vendas.';
      
      const wordCount = testTranscription.split(' ').length;
      const hasGreeting = testTranscription.toLowerCase().includes('bom dia');
      const hasIntroduction = testTranscription.toLowerCase().includes('meu nome');
      
      return {
        wordCount,
        hasGreeting,
        hasIntroduction,
        score: (hasGreeting ? 2 : 0) + (hasIntroduction ? 2 : 0)
      };
    }
  };

  // Configuração inicial
  useEffect(() => {
    if (!isSuperAdmin) return;

    addCallLog('success', 'system', '📞 Sistema de Debug de Chamadas iniciado');
    fetchCallsStats();

    // Atualizar estatísticas periodicamente
    const statsInterval = setInterval(fetchCallsStats, 30000); // A cada 30 segundos

    // Disponibilizar funções globalmente
    (window as any).callsDebug = {
      log: addCallLog,
      error: addCallError,
      resolve: resolveCallError,
      stats: fetchCallsStats,
      test: {
        database: () => runCallTest('database', tests.database),
        api: () => runCallTest('api', tests.api),
        audio: () => runCallTest('audio', tests.audio),
        transcription: () => runCallTest('transcription', tests.transcription)
      }
    };

    return () => {
      clearInterval(statsInterval);
      delete (window as any).callsDebug;
    };
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-800">📞 Sistema de Chamadas</h4>
        <div className="flex gap-2">
          <button
            onClick={fetchCallsStats}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            🔄 Atualizar
          </button>
          <button
            onClick={() => {
              setCallLogs([]);
              setCallErrors([]);
              addCallLog('info', 'system', 'Logs de chamadas limpos');
            }}
            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
          >
            🗑️ Limpar
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h5 className="font-semibold text-blue-800 mb-1">📊 Estatísticas</h5>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-mono">{callsStats.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Processadas:</span>
              <span className="font-mono text-green-600">{callsStats.processed}</span>
            </div>
            <div className="flex justify-between">
              <span>Pendentes:</span>
              <span className="font-mono text-yellow-600">{callsStats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>Erros:</span>
              <span className="font-mono text-red-600">{callsStats.errors}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h5 className="font-semibold text-green-800 mb-1">🧪 Testes Rápidos</h5>
          <div className="space-y-1">
            <button
              onClick={() => runCallTest('database', tests.database)}
              className="w-full bg-green-600 text-white py-1 px-2 rounded text-xs hover:bg-green-700"
            >
              🗄️ Banco
            </button>
            <button
              onClick={() => runCallTest('api', tests.api)}
              className="w-full bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700"
            >
              🔌 API
            </button>
            <button
              onClick={() => runCallTest('audio', tests.audio)}
              className="w-full bg-purple-600 text-white py-1 px-2 rounded text-xs hover:bg-purple-700"
            >
              🎵 Áudio
            </button>
            <button
              onClick={() => runCallTest('transcription', tests.transcription)}
              className="w-full bg-orange-600 text-white py-1 px-2 rounded text-xs hover:bg-orange-700"
            >
              📝 Transcrição
            </button>
          </div>
        </div>
      </div>

      {/* Tabs internas */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveView('logs')}
          className={`px-3 py-2 text-sm font-medium ${
            activeView === 'logs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
          }`}
        >
          📝 Logs ({callLogs.length})
        </button>
        <button
          onClick={() => setActiveView('errors')}
          className={`px-3 py-2 text-sm font-medium ${
            activeView === 'errors' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-600'
          }`}
        >
          🚨 Erros ({callErrors.filter(e => !e.resolved).length})
        </button>
      </div>

      {/* Logs de Chamadas */}
      {activeView === 'logs' && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {callLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-2xl mb-2">📞</div>
              <div>Nenhum log de chamada ainda</div>
              <div className="text-xs mt-2">Use window.callsDebug.log() no console</div>
            </div>
          ) : (
            callLogs.slice().reverse().map(log => (
              <div
                key={log.id}
                className={`p-2 rounded text-xs border-l-4 ${
                  log.status === 'error' ? 'bg-red-50 border-red-500' :
                  log.status === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  log.status === 'success' ? 'bg-green-50 border-green-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{log.source}</span>
                    {log.callId && (
                      <span className="text-gray-500 text-xs">ID: {log.callId.slice(0, 8)}...</span>
                    )}
                    {log.company && (
                      <span className="text-gray-600 text-xs">({log.company})</span>
                    )}
                  </div>
                  <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="text-gray-800">{log.message}</div>
                {log.data && (
                  <pre className="mt-1 text-gray-600 overflow-x-auto">
                    {JSON.stringify(log.data, null, 2).slice(0, 100)}...
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Erros de Chamadas */}
      {activeView === 'errors' && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {callErrors.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-2xl mb-2">✅</div>
              <div>Nenhum erro de chamada</div>
            </div>
          ) : (
            callErrors.slice().reverse().map(error => (
              <div
                key={error.id}
                className={`p-2 rounded text-xs border-l-4 ${
                  error.resolved ? 'bg-gray-50 border-gray-400' : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${error.resolved ? 'text-gray-600' : 'text-red-600'}`}>
                      {error.errorType}
                    </span>
                    {error.callId && (
                      <span className="text-gray-500 text-xs">ID: {error.callId.slice(0, 8)}...</span>
                    )}
                    {error.resolved && (
                      <span className="text-green-600 text-xs">✅ Resolvido</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">{error.timestamp.toLocaleTimeString()}</span>
                    {!error.resolved && (
                      <button
                        onClick={() => resolveCallError(error.id)}
                        className="text-green-600 hover:text-green-800 text-xs"
                        title="Marcar como resolvido"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-gray-800">{error.message}</div>
                {error.details && (
                  <pre className="mt-1 text-gray-600 overflow-x-auto">
                    {JSON.stringify(error.details, null, 2).slice(0, 100)}...
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CallsDebugPanel;
