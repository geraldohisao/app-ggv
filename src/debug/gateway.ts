/**
 * Gateway para envio de eventos de debug
 * Integra workers de sanitização e hashing em paralelo
 */

import type { DebugEvent } from './store';

export interface AlertPayload {
  title: string;
  message: string;
  level: string;
  category: string;
  timestamp: number;
  incidentHash: string;
  sanitized: boolean;
  context?: Record<string, any>;
  url?: string;
  userAgent?: string;
  environment: string;
}

export interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

// Cache de workers
let sanitizeWorker: Worker | null = null;
let hashWorker: Worker | null = null;

/**
 * Obtém ou cria worker de sanitização
 */
function getSanitizeWorker(): Worker {
  if (!sanitizeWorker) {
    sanitizeWorker = new Worker(
      new URL('./workers/sanitize.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return sanitizeWorker;
}

/**
 * Obtém ou cria worker de hashing
 */
function getHashWorker(): Worker {
  if (!hashWorker) {
    hashWorker = new Worker(
      new URL('./workers/hash.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return hashWorker;
}

/**
 * Sanitiza evento usando worker
 */
function sanitizeEvent(event: DebugEvent): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = getSanitizeWorker();
    const requestId = crypto.randomUUID();
    
    const timeout = setTimeout(() => {
      reject(new Error('Sanitize worker timeout'));
    }, 5000);
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.id === requestId) {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        
        if (event.data.sanitized) {
          resolve(event.data.payload);
        } else {
          reject(new Error(`Sanitization failed: ${event.data.warnings?.join(', ')}`));
        }
      }
    };
    
    worker.addEventListener('message', handleMessage);
    worker.postMessage({
      id: requestId,
      payload: {
        title: event.message,
        message: event.message,
        stack: event.context?.stack,
        url: event.context?.url,
        context: event.context,
        user: event.context?.user,
      },
    });
  });
}

/**
 * Gera hash do incidente usando worker
 */
function generateIncidentHash(event: DebugEvent): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = getHashWorker();
    const requestId = crypto.randomUUID();
    
    const timeout = setTimeout(() => {
      reject(new Error('Hash worker timeout'));
    }, 5000);
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.id === requestId) {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        resolve(event.data.hash);
      }
    };
    
    worker.addEventListener('message', handleMessage);
    worker.postMessage({
      id: requestId,
      data: {
        title: event.message,
        message: event.message,
        stack: event.context?.stack,
        url: event.context?.url,
        errorType: event.context?.errorType,
        componentStack: event.context?.componentStack,
        context: event.context,
      },
    });
  });
}

/**
 * Envia eventos para o servidor
 */
async function postAlerts(batch: AlertPayload[]): Promise<SendResult> {
  const result: SendResult = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    const response = await fetch('/.netlify/functions/alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Batch-Size': batch.length.toString(),
        'X-Debug-Environment': import.meta.env.MODE,
      },
      body: JSON.stringify({
        events: batch,
        timestamp: Date.now(),
        version: '2.0',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    result.sent = responseData.sent || batch.length;
    
  } catch (error) {
    result.success = false;
    result.failed = batch.length;
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

/**
 * Envia eventos com sanitização e hashing paralelos
 */
export async function sendEvents(events: DebugEvent[]): Promise<SendResult> {
  if (events.length === 0) {
    return { success: true, sent: 0, failed: 0, errors: [] };
  }

  try {
    // Processar eventos em paralelo
    const processingPromises = events.map(async (event) => {
      try {
        // Sanitizar e gerar hash em paralelo
        const [sanitizedPayload, incidentHash] = await Promise.all([
          sanitizeEvent(event),
          generateIncidentHash(event),
        ]);

        const alertPayload: AlertPayload = {
          title: sanitizedPayload.title || event.message,
          message: sanitizedPayload.message || event.message,
          level: event.level,
          category: event.category,
          timestamp: event.timestamp,
          incidentHash,
          sanitized: true,
          context: sanitizedPayload.context,
          url: sanitizedPayload.url,
          userAgent: navigator.userAgent,
          environment: import.meta.env.MODE,
        };

        return alertPayload;
      } catch (error) {
        console.error('❌ Failed to process event:', error);
        throw error;
      }
    });

    const processedPayloads = await Promise.all(processingPromises);
    
    // Enviar batch para o servidor
    return await postAlerts(processedPayloads);
    
  } catch (error) {
    return {
      success: false,
      sent: 0,
      failed: events.length,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Envia evento único (wrapper para compatibilidade)
 */
export async function sendEvent(event: DebugEvent): Promise<boolean> {
  const result = await sendEvents([event]);
  return result.success && result.sent > 0;
}

/**
 * Limpa recursos dos workers
 */
export function cleanupWorkers(): void {
  if (sanitizeWorker) {
    sanitizeWorker.terminate();
    sanitizeWorker = null;
  }
  
  if (hashWorker) {
    hashWorker.terminate();
    hashWorker = null;
  }
}

// Cleanup automático no unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupWorkers);
}
