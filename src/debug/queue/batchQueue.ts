/**
 * Sistema de batching para eventos de debug
 * Implementa rate limiting, backoff exponencial e cancelamento
 */

import type { DebugEvent } from '../store';
import { debugConfig } from '../config';

export interface BatchConfig {
  maxItems: number;
  maxMillis: number;
  maxBytes: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface BatchItem {
  event: DebugEvent;
  attempts: number;
  lastAttempt: number;
}

export interface BatchResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  consume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

class BatchQueue {
  private queue: BatchItem[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private rateLimiters: Map<string, TokenBucket> = new Map();
  private config: BatchConfig;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxItems: debugConfig.batchSize,
      maxMillis: debugConfig.batchTimeout,
      maxBytes: 60 * 1024, // 60KB
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  private getRateLimiter(key: string): TokenBucket {
    if (!this.rateLimiters.has(key)) {
      const { maxPerMinute } = require('../config').getRateLimitConfig();
      const refillRate = maxPerMinute / (60 * 1000); // tokens per millisecond
      this.rateLimiters.set(key, new TokenBucket(maxPerMinute, refillRate));
    }
    return this.rateLimiters.get(key)!;
  }

  private canSendEvent(event: DebugEvent): boolean {
    const key = event.incidentHash || event.category;
    const rateLimiter = this.getRateLimiter(key);
    
    // Eventos críticos sempre passam
    if (event.critical) return true;
    
    return rateLimiter.consume();
  }

  private calculateBatchSize(batch: BatchItem[]): number {
    return JSON.stringify(batch.map(item => item.event)).length;
  }

  private shouldFlush(): boolean {
    if (this.queue.length === 0) return false;
    
    // Flush por tamanho
    if (this.queue.length >= this.config.maxItems) return true;
    
    // Flush por tamanho em bytes
    if (this.calculateBatchSize(this.queue) >= this.config.maxBytes) return true;
    
    // Flush por evento crítico
    if (this.queue.some(item => item.event.critical)) return true;
    
    return false;
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) return;
    
    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, this.config.maxMillis);
  }

  private async retryWithBackoff(item: BatchItem): Promise<boolean> {
    if (item.attempts >= this.config.retryAttempts) {
      return false;
    }

    const delay = this.config.retryDelay * Math.pow(2, item.attempts - 1);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
    
    return true;
  }

  enqueue(event: DebugEvent): void {
    // Verificar rate limit
    if (!this.canSendEvent(event)) {
      console.warn('🚫 Rate limit exceeded for event:', event.category);
      return;
    }

    const batchItem: BatchItem = {
      event,
      attempts: 0,
      lastAttempt: Date.now(),
    };

    this.queue.push(batchItem);

    if (this.shouldFlush()) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  async flush(): Promise<BatchResult> {
    if (this.queue.length === 0) {
      return { success: true, sent: 0, failed: 0, errors: [] };
    }

    // Cancelar timeout se existir
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Cancelar request anterior se existir
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    const batch = [...this.queue];
    this.queue = [];

    const result: BatchResult = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [],
    };

    // Processar cada item do batch
    for (const item of batch) {
      try {
        item.attempts++;
        item.lastAttempt = Date.now();

        const success = await this.sendEvent(item.event);
        
        if (success) {
          result.sent++;
        } else {
          result.failed++;
          
          // Tentar novamente se ainda há tentativas
          if (await this.retryWithBackoff(item)) {
            this.queue.push(item);
          }
        }
      } catch (error) {
        result.failed++;
        result.errors.push(error instanceof Error ? error.message : String(error));
        
        // Tentar novamente se ainda há tentativas
        if (await this.retryWithBackoff(item)) {
          this.queue.push(item);
        }
      }
    }

    // Agendar próximo flush se ainda há itens
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }

    return result;
  }

  private async sendEvent(event: DebugEvent): Promise<boolean> {
    try {
      const { sendEvents } = await import('../gateway');
      await sendEvents([event]);
      return true;
    } catch (error) {
      console.error('❌ Failed to send event:', error);
      return false;
    }
  }

  clear(): void {
    this.queue = [];
    
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getQueueStats(): { size: number; oldestItem: number | null } {
    if (this.queue.length === 0) {
      return { size: 0, oldestItem: null };
    }
    
    const oldestTimestamp = Math.min(...this.queue.map(item => item.lastAttempt));
    return { size: this.queue.length, oldestItem: oldestTimestamp };
  }
}

// Instância singleton
export const batchQueue = new BatchQueue();

/**
 * Hook para usar o batch queue
 */
export function useBatchQueue() {
  return {
    enqueue: batchQueue.enqueue.bind(batchQueue),
    flush: batchQueue.flush.bind(batchQueue),
    clear: batchQueue.clear.bind(batchQueue),
    getStats: batchQueue.getQueueStats.bind(batchQueue),
  };
}
