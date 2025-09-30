/**
 * ✅ MELHORIA: Sistema de cache para análises IA
 * Evita reprocessar análises recentes e melhora performance
 */

interface CacheEntry {
  callId: string;
  result: any;
  timestamp: number;
  scorecard_id: string;
}

class AnalysisCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos

  /**
   * Gerar chave de cache baseada no call_id e scorecard
   */
  private getCacheKey(callId: string, scorecardId: string): string {
    return `${callId}_${scorecardId}`;
  }

  /**
   * Verificar se entrada do cache é válida
   */
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < this.CACHE_TTL;
  }

  /**
   * Buscar análise do cache
   */
  get(callId: string, scorecardId: string): any | null {
    const key = this.getCacheKey(callId, scorecardId);
    const entry = this.cache.get(key);
    
    if (entry && this.isValid(entry)) {
      console.log('🎯 CACHE HIT - Análise encontrada no cache:', callId);
      return entry.result;
    }
    
    if (entry) {
      // Entrada expirada
      this.cache.delete(key);
      console.log('⏰ CACHE EXPIRED - Entrada removida:', callId);
    }
    
    return null;
  }

  /**
   * Salvar análise no cache
   */
  set(callId: string, scorecardId: string, result: any): void {
    const key = this.getCacheKey(callId, scorecardId);
    const entry: CacheEntry = {
      callId,
      result,
      timestamp: Date.now(),
      scorecard_id: scorecardId
    };
    
    this.cache.set(key, entry);
    console.log('💾 CACHE SET - Análise salva no cache:', callId);
    
    // Limpar entradas expiradas periodicamente
    this.cleanup();
  }

  /**
   * Limpar entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 CACHE CLEANUP - ${removed} entradas expiradas removidas`);
    }
  }

  /**
   * Limpar cache específico de uma call
   */
  invalidate(callId: string): void {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.callId === callId) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🗑️ CACHE INVALIDATE - ${removed} entradas removidas para call:`, callId);
    }
  }

  /**
   * Estatísticas do cache
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implementar tracking de hit rate
    };
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ CACHE CLEAR - ${size} entradas removidas`);
  }
}

// Instância singleton
export const analysisCache = new AnalysisCache();

// Funções utilitárias
export const getCachedAnalysis = (callId: string, scorecardId: string) => 
  analysisCache.get(callId, scorecardId);

export const setCachedAnalysis = (callId: string, scorecardId: string, result: any) => 
  analysisCache.set(callId, scorecardId, result);

export const invalidateAnalysisCache = (callId: string) => 
  analysisCache.invalidate(callId);

export const getCacheStats = () => 
  analysisCache.getStats();

export const clearAnalysisCache = () => 
  analysisCache.clear();
