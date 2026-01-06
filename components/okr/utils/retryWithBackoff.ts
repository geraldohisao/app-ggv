/**
 * Retry com backoff exponencial
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt + 1}/${maxRetries + 1}`);
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        console.error('❌ Todas as tentativas falharam');
        throw error;
      }

      const currentDelay = Math.min(delay, maxDelay);
      console.log(`⏳ Aguardando ${currentDelay}ms antes de tentar novamente...`);
      
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      delay *= backoffFactor;
    }
  }

  throw lastError;
};

export const retrySupabaseOperation = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return retryWithBackoff(operation, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2
  });
};

