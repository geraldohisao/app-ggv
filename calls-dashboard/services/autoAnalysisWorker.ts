/**
 * 🤖 ANÁLISE AUTOMÁTICA EM BACKGROUND
 * Worker que monitora novas ligações e analisa automaticamente
 */

import { supabase } from '../../services/supabaseClient';
import { processCallAnalysis } from './callAnalysisBackendService';
import { shouldAnalyzeTranscription } from './transcriptionValidator';
import { retryAnalysis } from './retryService';
import { getCallsNeedingAnalysisUnified, processBatchAnalysisUnified } from './unifiedBatchAnalysisService';

interface AutoAnalysisConfig {
  enabled: boolean;
  interval: number; // ms
  batchSize: number;
  minDuration: number; // segundos
  maxRetries: number;
}

class AutoAnalysisWorker {
  private config: AutoAnalysisConfig = {
    enabled: false,
    interval: 30000, // 30 segundos
    batchSize: 5,
    minDuration: 180, // 3 minutos
    maxRetries: 2
  };

  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private stats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    lastRun: null as Date | null
  };

  /**
   * Iniciar worker automático
   */
  async start(): Promise<void> {
    if (this.intervalId) {
      console.log('🤖 AUTO ANALYSIS - Worker já está rodando');
      return;
    }

    // Verificar se está habilitado
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'auto_analysis_enabled')
      .single();

    const rawFlag = (settings as any)?.value;
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const parsedFlag = (rawFlag === true) || (rawFlag === 'true') || (rawFlag === '1');
    this.config.enabled = parsedFlag || isLocalhost; // habilitar automaticamente em dev/local

    if (!this.config.enabled) {
      console.log('🤖 AUTO ANALYSIS - Worker desabilitado via configuração (auto_analysis_enabled != true)');
      return;
    }

    console.log(`🤖 AUTO ANALYSIS - Iniciando worker (intervalo: ${this.config.interval}ms, enabled=${this.config.enabled}, rawFlag=${rawFlag})`);
    
    this.intervalId = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
    }, this.config.interval);

    // Processar imediatamente
    await this.processQueue();
  }

  /**
   * Parar worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🤖 AUTO ANALYSIS - Worker parado');
    }
  }

  /**
   * Processar fila de análises
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      console.log('🤖 AUTO ANALYSIS - Verificando ligações para análise...');
      
      // Buscar ligações elegíveis para análise
      const eligibleCalls = await this.getEligibleCalls();
      
      if (eligibleCalls.length === 0) {
        console.log('🤖 AUTO ANALYSIS - Nenhuma ligação elegível encontrada');
        return;
      }

      console.log(`🤖 AUTO ANALYSIS - ${eligibleCalls.length} ligações elegíveis encontradas`);

      // Processar em lotes
      const batch = eligibleCalls.slice(0, this.config.batchSize);
      await this.processBatch(batch);

    } catch (error) {
      console.error('🤖 AUTO ANALYSIS - Erro no worker:', error);
    } finally {
      this.isProcessing = false;
      this.stats.lastRun = new Date();
    }
  }

  /**
   * Buscar ligações elegíveis para análise
   * ✅ AGORA USA A MESMA LÓGICA DO PAINEL!
   */
  private async getEligibleCalls(): Promise<any[]> {
    try {
      // ✅ Usar a mesma função que o painel usa
      const calls = await getCallsNeedingAnalysisUnified(false, this.config.batchSize * 2);
      
      console.log(`🤖 AUTO ANALYSIS - ${calls.length} ligações encontradas pelo unifiedBatchAnalysisService`);
      
      // Filtrar ligações com transcrição de qualidade (validação extra)
      const filtered = calls.filter((call: any) => {
        if (!call.transcription) return false;
        
        const { should, reason } = shouldAnalyzeTranscription(call.transcription);
        if (!should) {
          console.log(`🤖 AUTO ANALYSIS - Ligação ${call.id} rejeitada: ${reason}`);
          return false;
        }
        
        return true;
      });

      console.log(`🤖 AUTO ANALYSIS - ${filtered.length}/${calls.length} ligações passaram na validação de qualidade`);
      return filtered;
      
    } catch (error) {
      console.error('🤖 AUTO ANALYSIS - Erro ao buscar ligações elegíveis:', error);
      return [];
    }
  }

  /**
   * Processar lote de ligações
   */
  private async processBatch(calls: any[]): Promise<void> {
    console.log(`🤖 AUTO ANALYSIS - Processando lote de ${calls.length} ligações`);

    const promises = calls.map(async (call) => {
      try {
        const displayName = call.enterprise || call.person || `Call ${call.id.substring(0, 8)}`;
        
        console.log(`🤖 AUTO ANALYSIS - Analisando: ${displayName}`);

        // Usar retry automático
        const result = await retryAnalysis(
          () => processCallAnalysis(
            call.id,
            call.transcription,
            call.agent_id || 'SDR',
            call.person || 'Cliente',
            false // Não forçar reprocessamento se já existe
          ),
          call.id,
          displayName
        );

        if (result && result.final_grade !== null) {
          this.stats.successful++;
          console.log(`✅ AUTO ANALYSIS - ${displayName} analisada: ${result.final_grade}/10`);
          
          // Atualizar status da ligação
          await supabase
            .from('calls')
            .update({ ai_status: 'completed' })
            .eq('id', call.id);
            
        } else {
          throw new Error('Análise retornou resultado inválido');
        }

      } catch (error) {
        this.stats.failed++;
        console.error(`❌ AUTO ANALYSIS - Falha ao analisar ${call.id}:`, error);
        
        // Marcar como falhada
        await supabase
          .from('calls')
          .update({ ai_status: 'failed' })
          .eq('id', call.id);
      }
    });

    // Aguardar conclusão de todas as análises do lote
    await Promise.allSettled(promises);
    
    this.stats.totalProcessed += calls.length;
    console.log(`🤖 AUTO ANALYSIS - Lote concluído. Stats: ${this.stats.successful} sucessos, ${this.stats.failed} falhas`);
  }

  /**
   * Obter estatísticas do worker
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.intervalId !== null,
      isProcessing: this.isProcessing,
      config: this.config
    };
  }

  /**
   * Atualizar configuração
   */
  async updateConfig(newConfig: Partial<AutoAnalysisConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Salvar no banco
    await supabase
      .from('app_settings')
      .upsert({
        key: 'auto_analysis_config',
        value: JSON.stringify(this.config)
      });

    console.log('🤖 AUTO ANALYSIS - Configuração atualizada:', this.config);
  }
}

// Instância singleton
export const autoAnalysisWorker = new AutoAnalysisWorker();

// Funções utilitárias
export const startAutoAnalysis = () => autoAnalysisWorker.start();
export const stopAutoAnalysis = () => autoAnalysisWorker.stop();
export const getAutoAnalysisStats = () => autoAnalysisWorker.getStats();
export const updateAutoAnalysisConfig = (config: Partial<AutoAnalysisConfig>) => 
  autoAnalysisWorker.updateConfig(config);

// Auto-iniciar em produção
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  // Aguardar um tempo antes de iniciar para não interferir no carregamento
  setTimeout(() => {
    console.log('🤖 AUTO ANALYSIS - Iniciando worker automático em produção...');
    startAutoAnalysis();
  }, 10000); // 10 segundos após carregamento
}
