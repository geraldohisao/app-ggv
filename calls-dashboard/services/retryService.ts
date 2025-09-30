/**
 * ✅ MELHORIA: Sistema de retry automático
 * Implementa retry inteligente para falhas temporárias
 */

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableErrors: string[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1s
  maxDelay: 10000, // 10s
  backoffMultiplier: 2,
  retryableErrors: [
    'timeout',
    'network',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    '429', // Rate limit
    '500', // Server error
    '502', // Bad gateway
    '503', // Service unavailable
    '504'  // Gateway timeout
  ]
};

/**
 * Verificar se erro é retryable
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return DEFAULT_CONFIG.retryableErrors.some(pattern => 
    message.includes(pattern.toLowerCase())
  );
}

/**
 * Calcular delay para próxima tentativa
 */
function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_CONFIG): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Executar função com retry automático
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: string
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      console.log(`🔄 RETRY - Tentativa ${attempt}/${finalConfig.maxAttempts}${context ? ` para ${context}` : ''}`);
      
      const result = await fn();
      
      if (attempt > 1) {
        console.log(`✅ RETRY - Sucesso na tentativa ${attempt}${context ? ` para ${context}` : ''}`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error as Error;
      
      console.warn(`❌ RETRY - Tentativa ${attempt} falhou${context ? ` para ${context}` : ''}:`, error);
      
      // Se não é o último attempt e o erro é retryable
      if (attempt < finalConfig.maxAttempts && isRetryableError(lastError)) {
        const delay = calculateDelay(attempt, finalConfig);
        console.log(`⏱️ RETRY - Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Última tentativa ou erro não retryable
      break;
    }
  }

  console.error(`💥 RETRY - Todas as ${finalConfig.maxAttempts} tentativas falharam${context ? ` para ${context}` : ''}`);
  throw lastError;
}

/**
 * Retry específico para análises IA
 */
export async function retryAnalysis<T>(
  fn: () => Promise<T>,
  callId: string,
  callName?: string
): Promise<T> {
  const context = `${callName || 'chamada'} (${callId.substring(0, 8)}...)`;
  
  return withRetry(
    fn,
    {
      maxAttempts: 2, // Apenas 2 tentativas para análises (são mais demoradas)
      baseDelay: 3000, // 3s entre tentativas
      maxDelay: 5000 // Max 5s
    },
    context
  );
}

/**
 * Estatísticas de retry
 */
interface RetryStats {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageAttempts: number;
}

class RetryStatsTracker {
  private stats: RetryStats = {
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageAttempts: 0
  };

  recordRetry(attempts: number, success: boolean) {
    this.stats.totalRetries++;
    if (success) {
      this.stats.successfulRetries++;
    } else {
      this.stats.failedRetries++;
    }
    
    // Calcular média móvel
    this.stats.averageAttempts = 
      (this.stats.averageAttempts * (this.stats.totalRetries - 1) + attempts) / this.stats.totalRetries;
  }

  getStats(): RetryStats {
    return { ...this.stats };
  }

  reset() {
    this.stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0
    };
  }
}

export const retryStatsTracker = new RetryStatsTracker();
