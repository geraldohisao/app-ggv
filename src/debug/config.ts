/**
 * Configuração central do sistema de debug
 * Controla gating de produção, tree-shaking e permissões
 */

export const DEBUG_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEBUG_ENABLED === 'true';
export const DEBUG_STORE_SIZE = 500; // Ring buffer size
export const DEBUG_BATCH_SIZE = 20; // Max events per batch
export const DEBUG_BATCH_TIMEOUT = 2000; // Max time before flush (ms)
export const DEBUG_RATE_LIMIT = 3; // Max alerts per minute per incident

export type UserRole = 'superadmin' | 'admin' | 'user' | 'anon';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface DebugConfig {
  enabled: boolean;
  storeSize: number;
  batchSize: number;
  batchTimeout: number;
  rateLimit: number;
}

export const debugConfig: DebugConfig = {
  enabled: DEBUG_ENABLED,
  storeSize: DEBUG_STORE_SIZE,
  batchSize: DEBUG_BATCH_SIZE,
  batchTimeout: DEBUG_BATCH_TIMEOUT,
  rateLimit: DEBUG_RATE_LIMIT,
};

/**
 * Verifica se o debug pode ser usado baseado no ambiente e role do usuário
 */
export function canUseDebug(isProd: boolean, role: UserRole): boolean {
  if (!isProd) return true; // Sempre habilitado em desenvolvimento
  if (role === 'superadmin' && DEBUG_ENABLED) return true;
  return false;
}

/**
 * Verifica se o painel de debug deve ser carregado
 */
export function shouldLoadDebugPanel(isProd: boolean, role: UserRole): boolean {
  if (!canUseDebug(isProd, role)) return false;
  
  // Verificar localStorage para superadmin
  if (role === 'superadmin' && typeof window !== 'undefined') {
    return localStorage.getItem('ggv-debug-enabled') === 'true';
  }
  
  return true;
}

/**
 * Obtém configuração de rate limit por incidente
 */
export function getRateLimitConfig(): { maxPerMinute: number; windowMs: number } {
  return {
    maxPerMinute: DEBUG_RATE_LIMIT,
    windowMs: 60000, // 1 minuto
  };
}
