// callsServiceV2.ts - Service Layer Otimizado
import { supabase } from '../../services/supabaseClient';

// =========================================
// TIPOS REFINADOS E MODULARES
// =========================================

export namespace CallsAPI {
  // Base types
  export interface BaseCall {
    readonly id: string;
    readonly provider_call_id: string;
    readonly deal_id: string;
    readonly created_at: string;
    readonly updated_at: string;
  }

  export interface CallMetadata {
    readonly company_name: string;
    readonly person_name: string;
    readonly person_email: string | null;
    readonly sdr_name: string;
    readonly sdr_email: string;
    readonly sdr_avatar_url: string;
  }

  export interface CallContent {
    readonly status: CallStatus;
    readonly duration: number;
    readonly call_type: string;
    readonly direction: 'inbound' | 'outbound';
    readonly audio_url: string | null;
    readonly transcription: string | null;
    readonly score: number | null;
  }

  export interface CallDetails extends BaseCall, CallMetadata, CallContent {
    readonly recording_url: string | null;
    readonly audio_bucket: string | null;
    readonly audio_path: string | null;
    readonly transcript_status: string;
    readonly ai_status: string;
    readonly insights: Record<string, unknown>;
    readonly scorecard: Record<string, unknown>;
    readonly from_number: string | null;
    readonly to_number: string | null;
    readonly agent_id: string;
    readonly processed_at: string | null;
    readonly comments?: Comment[];
    readonly detailed_scores?: DetailedScore[];
  }

  export interface CallListItem extends BaseCall, CallMetadata, CallContent {
    readonly total_count?: number;
  }

  export type CallStatus = 
    | 'received' 
    | 'processing' 
    | 'processed' 
    | 'failed' 
    | 'answered' 
    | 'missed' 
    | 'voicemail' 
    | 'analyzed';

  export interface Comment {
    readonly id: string;
    readonly text: string;
    readonly at_seconds: number;
    readonly author_name: string;
    readonly created_at: string;
  }

  export interface DetailedScore {
    readonly criterion_id: string;
    readonly score: number;
    readonly justification: string;
  }

  export interface SdrUser {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly avatarUrl: string;
    readonly callCount: number;
    readonly lastCallDate: string;
    readonly avgDuration: number;
    readonly successRate: number;
  }

  export interface DashboardMetrics {
    readonly total_calls: number;
    readonly answered_calls: number;
    readonly answered_rate: number;
    readonly avg_duration: number;
    readonly total_sdrs: number;
    readonly period_start: string;
    readonly period_end: string;
  }

  // Filter types
  export interface CallsFilters {
    readonly sdr_email?: string;
    readonly status?: CallStatus;
    readonly start_date?: string;
    readonly end_date?: string;
    readonly search?: string;
    readonly limit?: number;
    readonly offset?: number;
  }

  export interface PaginatedResponse<T> {
    readonly data: readonly T[];
    readonly totalCount: number;
    readonly hasMore: boolean;
    readonly currentPage: number;
    readonly totalPages: number;
  }

  // Search types
  export interface SearchResult {
    readonly id: string;
    readonly company_name: string;
    readonly person_name: string;
    readonly sdr_name: string;
    readonly deal_id: string;
    readonly created_at: string;
    readonly rank: number;
  }
}

// =========================================
// CLASSE DE ERRO CUSTOMIZADA
// =========================================

export class CallsServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CallsServiceError';
  }

  static fromSupabaseError(error: any): CallsServiceError {
    return new CallsServiceError(
      error.message || 'Erro desconhecido',
      error.code || 'UNKNOWN_ERROR',
      error
    );
  }
}

// =========================================
// CACHE MANAGER
// =========================================

class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set<T>(key: string, data: T, ttlMs: number = 300000): void { // 5 min default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// =========================================
// SERVICE PRINCIPAL
// =========================================

export class CallsService {
  private static instance: CallsService;
  private cache = new CacheManager();

  private constructor() {}

  static getInstance(): CallsService {
    if (!CallsService.instance) {
      CallsService.instance = new CallsService();
    }
    return CallsService.instance;
  }

  // =========================================
  // MÉTODOS PRINCIPAIS
  // =========================================

  async getDashboardMetrics(days: number = 14): Promise<CallsAPI.DashboardMetrics> {
    const cacheKey = `dashboard_metrics_${days}`;
    const cached = this.cache.get<CallsAPI.DashboardMetrics>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_dashboard_metrics_cached', {
        p_days: days
      });

      if (error) throw CallsServiceError.fromSupabaseError(error);
      if (!data?.[0]) throw new CallsServiceError('Nenhuma métrica encontrada', 'NO_DATA');

      const metrics = data[0] as CallsAPI.DashboardMetrics;
      this.cache.set(cacheKey, metrics, 300000); // 5 min cache
      return metrics;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro ao buscar métricas', 'FETCH_ERROR', error);
    }
  }

  async getCalls(
    filters: CallsAPI.CallsFilters = {}
  ): Promise<CallsAPI.PaginatedResponse<CallsAPI.CallListItem>> {
    const { limit = 50, offset = 0, ...otherFilters } = filters;
    const cacheKey = `calls_${JSON.stringify(filters)}`;
    const cached = this.cache.get<CallsAPI.PaginatedResponse<CallsAPI.CallListItem>>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_calls_optimized', {
        p_limit: limit,
        p_offset: offset,
        p_sdr_email: otherFilters.sdr_email || null,
        p_status: otherFilters.status || null,
        p_start_date: otherFilters.start_date ? new Date(otherFilters.start_date).toISOString() : null,
        p_end_date: otherFilters.end_date ? new Date(otherFilters.end_date).toISOString() : null,
        p_search: otherFilters.search || null
      });

      if (error) throw CallsServiceError.fromSupabaseError(error);

      const calls = (data || []) as CallsAPI.CallListItem[];
      const totalCount = calls[0]?.total_count || 0;
      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(totalCount / limit);

      const response: CallsAPI.PaginatedResponse<CallsAPI.CallListItem> = {
        data: calls,
        totalCount,
        hasMore: offset + limit < totalCount,
        currentPage,
        totalPages
      };

      this.cache.set(cacheKey, response, 60000); // 1 min cache
      return response;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro ao buscar calls', 'FETCH_ERROR', error);
    }
  }

  async getCallDetails(callId: string): Promise<CallsAPI.CallDetails> {
    const cacheKey = `call_details_${callId}`;
    const cached = this.cache.get<CallsAPI.CallDetails>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_call_details', {
        p_call_id: callId
      });

      if (error) throw CallsServiceError.fromSupabaseError(error);
      if (!data?.[0]) throw new CallsServiceError('Call não encontrada', 'NOT_FOUND');

      const callDetails = data[0] as CallsAPI.CallDetails;
      this.cache.set(cacheKey, callDetails, 300000); // 5 min cache
      return callDetails;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro ao buscar detalhes da call', 'FETCH_ERROR', error);
    }
  }

  async getUniqueSdrs(): Promise<readonly CallsAPI.SdrUser[]> {
    const cacheKey = 'unique_sdrs';
    const cached = this.cache.get<readonly CallsAPI.SdrUser[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_unique_sdrs');

      if (error) throw CallsServiceError.fromSupabaseError(error);

      const sdrs = (data || []).map((sdr: any): CallsAPI.SdrUser => ({
        id: sdr.sdr_email,
        name: sdr.sdr_name,
        email: sdr.sdr_email,
        avatarUrl: sdr.sdr_avatar_url,
        callCount: sdr.call_count,
        lastCallDate: sdr.last_call_date,
        avgDuration: sdr.avg_duration || 0,
        successRate: sdr.success_rate || 0
      }));

      this.cache.set(cacheKey, sdrs, 600000); // 10 min cache
      return sdrs;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro ao buscar SDRs', 'FETCH_ERROR', error);
    }
  }

  async searchCalls(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<readonly CallsAPI.SearchResult[]> {
    if (!query.trim()) return [];

    const cacheKey = `search_${query}_${limit}_${offset}`;
    const cached = this.cache.get<readonly CallsAPI.SearchResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('search_calls_fulltext', {
        p_query: query.trim(),
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw CallsServiceError.fromSupabaseError(error);

      const results = (data || []) as CallsAPI.SearchResult[];
      this.cache.set(cacheKey, results, 120000); // 2 min cache
      return results;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro na busca', 'SEARCH_ERROR', error);
    }
  }

  // =========================================
  // MÉTODOS DE CACHE
  // =========================================

  invalidateCache(pattern?: string): void {
    if (pattern) {
      this.cache.invalidate(pattern);
    } else {
      this.cache.clear();
    }
  }

  async refreshCache(): Promise<void> {
    try {
      await supabase.rpc('refresh_calls_cache');
      this.cache.clear();
    } catch (error) {
      throw new CallsServiceError('Erro ao atualizar cache', 'CACHE_REFRESH_ERROR', error);
    }
  }

  // =========================================
  // MÉTODOS DE CONVENIÊNCIA
  // =========================================

  async getCallsByStatus(status: CallsAPI.CallStatus, limit: number = 50): Promise<readonly CallsAPI.CallListItem[]> {
    const response = await this.getCalls({ status, limit });
    return response.data;
  }

  async getCallsBySdr(sdrEmail: string, limit: number = 50): Promise<readonly CallsAPI.CallListItem[]> {
    const response = await this.getCalls({ sdr_email: sdrEmail, limit });
    return response.data;
  }

  async getRecentCalls(hours: number = 24, limit: number = 50): Promise<readonly CallsAPI.CallListItem[]> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const response = await this.getCalls({ start_date: startDate, limit });
    return response.data;
  }
}

// =========================================
// HOOKS PARA REACT (OPCIONAL)
// =========================================

export const useCallsService = () => {
  return CallsService.getInstance();
};

// Export da instância singleton
export const callsService = CallsService.getInstance();

// Export dos tipos para uso externo
export type { CallsAPI };
