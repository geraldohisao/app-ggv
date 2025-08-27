import { useCallback } from 'react';

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

export const useCallsDebug = () => {
  // Função para adicionar logs de chamadas
  const addCallLog = useCallback((
    status: CallLog['status'], 
    source: CallLog['source'], 
    message: string, 
    data?: any, 
    callId?: string, 
    company?: string, 
    duration?: number
  ) => {
    if (typeof window !== 'undefined' && (window as any).callsDebug?.log) {
      (window as any).callsDebug.log(status, source, message, data, callId, company, duration);
    } else {
      // Fallback para console se o sistema de debug não estiver disponível
      const colors = {
        success: 'color: #10b981',
        error: 'color: #ef4444',
        warning: 'color: #f59e0b',
        info: 'color: #3b82f6'
      };
      console.log(`%c[CALLS-${source.toUpperCase()}] ${message}`, colors[status], data);
    }
  }, []);

  // Função para adicionar erros de chamadas
  const addCallError = useCallback((
    errorType: CallError['errorType'], 
    message: string, 
    details?: any, 
    callId?: string, 
    stack?: string
  ) => {
    if (typeof window !== 'undefined' && (window as any).callsDebug?.error) {
      (window as any).callsDebug.error(errorType, message, details, callId, stack);
    } else {
      // Fallback para console se o sistema de debug não estiver disponível
      console.error(`[CALLS-${errorType.toUpperCase()}] ${message}`, details);
    }
  }, []);

  // Função para marcar erro como resolvido
  const resolveCallError = useCallback((errorId: string) => {
    if (typeof window !== 'undefined' && (window as any).callsDebug?.resolve) {
      (window as any).callsDebug.resolve(errorId);
    }
  }, []);

  // Função para atualizar estatísticas
  const updateStats = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).callsDebug?.stats) {
      (window as any).callsDebug.stats();
    }
  }, []);

  // Função para executar testes
  const runTest = useCallback((testName: 'database' | 'api' | 'audio' | 'transcription') => {
    if (typeof window !== 'undefined' && (window as any).callsDebug?.test?.[testName]) {
      return (window as any).callsDebug.test[testName]();
    } else {
      console.warn(`Teste ${testName} não disponível`);
      return Promise.resolve({ success: false, error: 'Teste não disponível' });
    }
  }, []);

  // Funções de conveniência para logs comuns
  const logApiCall = useCallback((message: string, data?: any, callId?: string, company?: string, duration?: number) => {
    addCallLog('info', 'api', message, data, callId, company, duration);
  }, [addCallLog]);

  const logApiSuccess = useCallback((message: string, data?: any, callId?: string, company?: string, duration?: number) => {
    addCallLog('success', 'api', message, data, callId, company, duration);
  }, [addCallLog]);

  const logApiError = useCallback((message: string, error?: any, callId?: string) => {
    addCallLog('error', 'api', message, error, callId);
    addCallError('api_error', message, error, callId);
  }, [addCallLog, addCallError]);

  const logDatabaseCall = useCallback((message: string, data?: any, callId?: string) => {
    addCallLog('info', 'database', message, data, callId);
  }, [addCallLog]);

  const logDatabaseSuccess = useCallback((message: string, data?: any, callId?: string) => {
    addCallLog('success', 'database', message, data, callId);
  }, [addCallLog]);

  const logDatabaseError = useCallback((message: string, error?: any, callId?: string) => {
    addCallLog('error', 'database', message, error, callId);
    addCallError('database_error', message, error, callId);
  }, [addCallLog, addCallError]);

  const logAudioCall = useCallback((message: string, data?: any, callId?: string) => {
    addCallLog('info', 'audio', message, data, callId);
  }, [addCallLog]);

  const logAudioSuccess = useCallback((message: string, data?: any, callId?: string) => {
    addCallLog('success', 'audio', message, data, callId);
  }, [addCallLog]);

  const logAudioError = useCallback((message: string, error?: any, callId?: string) => {
    addCallLog('error', 'audio', message, error, callId);
    addCallError('audio_error', message, error, callId);
  }, [addCallLog, addCallError]);

  const logTranscriptionCall = useCallback((message: string, data?: any, callId?: string) => {
    addCallLog('info', 'transcription', message, data, callId);
  }, [addCallLog]);

  const logTranscriptionSuccess = useCallback((message: string, data?: any, callId?: string) => {
    addCallLog('success', 'transcription', message, data, callId);
  }, [addCallLog]);

  const logTranscriptionError = useCallback((message: string, error?: any, callId?: string) => {
    addCallLog('error', 'transcription', message, error, callId);
    addCallError('transcription_error', message, error, callId);
  }, [addCallLog, addCallError]);

  const logAnalysisCall = useCallback((message: string, data?: any, callId?: string) => {
    addCallLog('info', 'analysis', message, data, callId);
  }, [addCallLog]);

  const logAnalysisSuccess = useCallback((message: string, data?: any, callId?: string) => {
    addCallLog('success', 'analysis', message, data, callId);
  }, [addCallLog]);

  const logAnalysisError = useCallback((message: string, error?: any, callId?: string) => {
    addCallLog('error', 'analysis', message, error, callId);
    addCallError('analysis_error', message, error, callId);
  }, [addCallLog, addCallError]);

  // Função wrapper para operações com try/catch automático
  const withDebug = useCallback(<T extends any[], R>(
    operation: (...args: T) => Promise<R>,
    source: CallLog['source'],
    successMessage: string,
    errorMessage: string,
    callId?: string
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        addCallLog('info', source, `Iniciando: ${successMessage}`, { args }, callId);
        const result = await operation(...args);
        addCallLog('success', source, successMessage, { result }, callId);
        return result;
      } catch (error: any) {
        addCallLog('error', source, errorMessage, { error, args }, callId);
        addCallError(
          `${source}_error` as CallError['errorType'], 
          errorMessage, 
          error, 
          callId, 
          error.stack
        );
        throw error;
      }
    };
  }, [addCallLog, addCallError]);

  return {
    // Funções básicas
    addCallLog,
    addCallError,
    resolveCallError,
    updateStats,
    runTest,
    
    // Funções de conveniência por fonte
    logApiCall,
    logApiSuccess,
    logApiError,
    logDatabaseCall,
    logDatabaseSuccess,
    logDatabaseError,
    logAudioCall,
    logAudioSuccess,
    logAudioError,
    logTranscriptionCall,
    logTranscriptionSuccess,
    logTranscriptionError,
    logAnalysisCall,
    logAnalysisSuccess,
    logAnalysisError,
    
    // Wrapper para operações
    withDebug,
    
    // Verificar se o sistema está disponível
    isAvailable: typeof window !== 'undefined' && !!(window as any).callsDebug
  };
};

export default useCallsDebug;
