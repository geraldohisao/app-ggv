import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipos para o estado da análise em massa
interface BulkAnalysisState {
  id: string;
  status: 'idle' | 'starting' | 'processing' | 'fetching' | 'finalizing' | 'completed' | 'failed';
  progress: number;
  message: string;
  details: string;
  leadsProcessed: number;
  totalLeads: number;
  startTime: number;
  estimatedTime: number;
  workflowId?: string;
  error?: string;
}

interface BulkAnalysisContextType {
  currentAnalysis: BulkAnalysisState | null;
  isRunning: boolean;
  startAnalysis: (data: {
    proprietario: string;
    filtro: string;
    cadencia: string;
    numero_negocio: number;
  }) => Promise<void>;
  stopAnalysis: () => void;
  updateProgress: (updates: Partial<BulkAnalysisState>) => void;
  clearAnalysis: () => void;
}

const BulkAnalysisContext = createContext<BulkAnalysisContextType | null>(null);

// Chaves para localStorage
const BULK_ANALYSIS_STATE_KEY = 'ggv_bulk_analysis_state';
const BULK_ANALYSIS_TIMESTAMP_KEY = 'ggv_bulk_analysis_timestamp';

// Duração máxima da análise (30 minutos)
const MAX_ANALYSIS_DURATION = 30 * 60 * 1000;

export const BulkAnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentAnalysis, setCurrentAnalysis] = useState<BulkAnalysisState | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Carregar estado persistido ao inicializar
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const savedState = localStorage.getItem(BULK_ANALYSIS_STATE_KEY);
        const savedTimestamp = localStorage.getItem(BULK_ANALYSIS_TIMESTAMP_KEY);
        
        if (savedState && savedTimestamp) {
          const state = JSON.parse(savedState);
          const timestamp = parseInt(savedTimestamp);
          const now = Date.now();
          
          // Verificar se a análise ainda é válida (não expirou)
          if (now - timestamp < MAX_ANALYSIS_DURATION) {
            setCurrentAnalysis(state);
            setIsRunning(state.status !== 'completed' && state.status !== 'failed' && state.status !== 'idle');
            
            console.log('🔄 BULK ANALYSIS - Estado persistido carregado:', state);
          } else {
            // Limpar estado expirado
            clearPersistedState();
            console.log('⏰ BULK ANALYSIS - Estado expirado, limpo');
          }
        }
      } catch (error) {
        console.error('❌ BULK ANALYSIS - Erro ao carregar estado persistido:', error);
        clearPersistedState();
      }
    };

    loadPersistedState();
  }, []);

  // Persistir estado no localStorage sempre que mudar
  useEffect(() => {
    if (currentAnalysis) {
      try {
        localStorage.setItem(BULK_ANALYSIS_STATE_KEY, JSON.stringify(currentAnalysis));
        localStorage.setItem(BULK_ANALYSIS_TIMESTAMP_KEY, currentAnalysis.startTime.toString());
        console.log('💾 BULK ANALYSIS - Estado persistido:', currentAnalysis);
      } catch (error) {
        console.error('❌ BULK ANALYSIS - Erro ao persistir estado:', error);
      }
    }
  }, [currentAnalysis]);

  // Função para limpar estado persistido
  const clearPersistedState = () => {
    localStorage.removeItem(BULK_ANALYSIS_STATE_KEY);
    localStorage.removeItem(BULK_ANALYSIS_TIMESTAMP_KEY);
  };

  // Função para iniciar análise
  const startAnalysis = async (data: {
    proprietario: string;
    filtro: string;
    cadencia: string;
    numero_negocio: number;
  }) => {
    const analysisId = `bulk_${Date.now()}`;
    const now = Date.now();
    
    const newAnalysis: BulkAnalysisState = {
      id: analysisId,
      status: 'starting',
      progress: 0,
      message: 'Iniciando análise em massa...',
      details: 'Preparando dados e conectando com o N8N',
      leadsProcessed: 0,
      totalLeads: data.numero_negocio,
      startTime: now,
      estimatedTime: 30000, // 30 segundos estimados
    };

    setCurrentAnalysis(newAnalysis);
    setIsRunning(true);

    console.log('🚀 BULK ANALYSIS - Iniciando análise:', data);

    // Simular progresso da análise (em produção, isso viria do N8N)
    simulateAnalysisProgress(analysisId, data);
  };

  // Função para simular progresso da análise
  const simulateAnalysisProgress = async (analysisId: string, data: any) => {
    const stages = [
      { status: 'starting', progress: 10, message: 'Conectando com N8N...', details: 'Estabelecendo conexão segura', delay: 2000 },
      { status: 'processing', progress: 25, message: 'Buscando leads...', details: 'Consultando base de dados do Pipedrive', delay: 3000 },
      { status: 'fetching', progress: 50, message: 'Processando leads...', details: 'Aplicando filtros e cadência', delay: 4000 },
      { status: 'processing', progress: 75, message: 'Enviando para SDRs...', details: 'Distribuindo leads para as equipes', delay: 3000 },
      { status: 'finalizing', progress: 90, message: 'Finalizando...', details: 'Salvando resultados e gerando relatório', delay: 2000 },
      { status: 'completed', progress: 100, message: 'Análise concluída!', details: 'Todos os leads foram processados com sucesso', delay: 1000 },
    ];

    for (const stage of stages) {
      if (currentAnalysis?.id !== analysisId) {
        console.log('🛑 BULK ANALYSIS - Análise cancelada ou substituída');
        return;
      }

      updateProgress({
        status: stage.status as any,
        progress: stage.progress,
        message: stage.message,
        details: stage.details,
        leadsProcessed: Math.floor((stage.progress / 100) * data.numero_negocio),
      });

      await new Promise(resolve => setTimeout(resolve, stage.delay));
    }

    // Marcar como concluída
    setIsRunning(false);
    console.log('✅ BULK ANALYSIS - Análise concluída');
  };

  // Função para atualizar progresso
  const updateProgress = (updates: Partial<BulkAnalysisState>) => {
    setCurrentAnalysis(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev, ...updates };
      
      // Se chegou ao final, parar de rodar
      if (updated.status === 'completed' || updated.status === 'failed') {
        setIsRunning(false);
      }
      
      return updated;
    });
  };

  // Função para parar análise
  const stopAnalysis = () => {
    if (currentAnalysis) {
      updateProgress({
        status: 'failed',
        message: 'Análise interrompida pelo usuário',
        details: 'Processo cancelado manualmente',
      });
      setIsRunning(false);
      console.log('🛑 BULK ANALYSIS - Análise interrompida');
    }
  };

  // Função para limpar análise
  const clearAnalysis = () => {
    setCurrentAnalysis(null);
    setIsRunning(false);
    clearPersistedState();
    console.log('🧹 BULK ANALYSIS - Estado limpo');
  };

  const value: BulkAnalysisContextType = {
    currentAnalysis,
    isRunning,
    startAnalysis,
    stopAnalysis,
    updateProgress,
    clearAnalysis,
  };

  return (
    <BulkAnalysisContext.Provider value={value}>
      {children}
    </BulkAnalysisContext.Provider>
  );
};

export const useBulkAnalysis = (): BulkAnalysisContextType => {
  const context = useContext(BulkAnalysisContext);
  if (!context) {
    throw new Error('useBulkAnalysis deve ser usado dentro de BulkAnalysisProvider');
  }
  return context;
};
