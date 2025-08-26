/**
 * Store de debug com RingBuffer e EventEmitter
 * Implementa useSyncExternalStore para evitar re-renders excessivos
 */

import { useSyncExternalStore } from 'react';
import type { LogLevel } from './config';

export interface DebugEvent {
  id: string;
  level: LogLevel;
  category: string;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  critical?: boolean;
  incidentHash?: string;
}

export interface DebugStore {
  events: DebugEvent[];
  count: number;
  lastEvent?: DebugEvent;
}

class RingBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    if (this.size === 0) return [];
    
    const result: T[] = [];
    let current = this.head;
    
    for (let i = 0; i < this.size; i++) {
      result.push(this.buffer[current]);
      current = (current + 1) % this.capacity;
    }
    
    return result;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }
}

class DebugStoreManager {
  private ringBuffer: RingBuffer<DebugEvent>;
  private subscribers = new Set<() => void>();
  private snapshot: DebugStore;

  constructor(capacity: number = 500) {
    this.ringBuffer = new RingBuffer<DebugEvent>(capacity);
    this.snapshot = this.createSnapshot();
  }

  private createSnapshot(): DebugStore {
    const events = this.ringBuffer.toArray();
    return {
      events,
      count: events.length,
      lastEvent: events[events.length - 1],
    };
  }

  private notifySubscribers(): void {
    this.snapshot = this.createSnapshot();
    this.subscribers.forEach(subscriber => subscriber());
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getSnapshot(): DebugStore {
    return this.snapshot;
  }

  log(event: Omit<DebugEvent, 'id' | 'timestamp'>): void {
    const debugEvent: DebugEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.ringBuffer.push(debugEvent);
    this.notifySubscribers();
  }

  clear(): void {
    this.ringBuffer.clear();
    this.notifySubscribers();
  }

  getEvents(): DebugEvent[] {
    return this.ringBuffer.toArray();
  }

  getEventCount(): number {
    return this.ringBuffer.length;
  }
}

// Instância singleton do store
const debugStore = new DebugStoreManager();

/**
 * Hook para usar o store de debug
 */
export function useDebugStore() {
  return useSyncExternalStore(
    debugStore.subscribe.bind(debugStore),
    debugStore.getSnapshot.bind(debugStore),
    debugStore.getSnapshot.bind(debugStore)
  );
}

/**
 * API para logging direto
 */
export const debugLogger = {
  log: debugStore.log.bind(debugStore),
  clear: debugStore.clear.bind(debugStore),
  getEvents: debugStore.getEvents.bind(debugStore),
  getEventCount: debugStore.getEventCount.bind(debugStore),
};

/**
 * Utilitários para logging
 */
export function logDebug(category: string, message: string, context?: Record<string, any>): void {
  debugLogger.log({ level: 'debug', category, message, context });
}

export function logInfo(category: string, message: string, context?: Record<string, any>): void {
  debugLogger.log({ level: 'info', category, message, context });
}

export function logWarn(category: string, message: string, context?: Record<string, any>): void {
  debugLogger.log({ level: 'warn', category, message, context });
}

export function logError(category: string, message: string, context?: Record<string, any>, critical = false): void {
  debugLogger.log({ level: 'error', category, message, context, critical });
}

export function logCritical(category: string, message: string, context?: Record<string, any>, incidentHash?: string): void {
  debugLogger.log({ level: 'critical', category, message, context, critical: true, incidentHash });
}
