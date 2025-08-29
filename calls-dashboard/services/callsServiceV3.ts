// callsServiceV3.ts - Service Layer com Zod Validation
import { z } from 'zod';
import { supabase } from '../../services/supabaseClient';

// =========================================
// SCHEMAS ZOD PARA VALIDAÇÃO
// =========================================

// Schema base para validação de entrada
const CallStatusSchema = z.enum([
  'received', 'processing', 'processed', 'failed', 
  'answered', 'missed', 'voicemail', 'analyzed'
]);

const CallsFiltersSchema = z.object({
  sdr_email: z.string().email().optional(),
  status: CallStatusSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().min(2).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

const SearchFiltersSchema = z.object({
  query: z.string().min(2),
  search_type: z.enum(['smart', 'exact', 'fuzzy', 'semantic']).default('smart'),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0)
});

// Schemas para resposta (validação de saída)
const CallListItemSchema = z.object({
  id: z.string().uuid(),
  provider_call_id: z.string().nullable(),
  deal_id: z.string().nullable(),
  company_name: z.string(),
  person_name: z.string(),
  person_email: z.string().email().nullable(),
  sdr_name: z.string(),
  sdr_email: z.string().email(),
  sdr_avatar_url: z.string().url(),
  status: CallStatusSchema,
  duration: z.number().int().min(0),
  call_type: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  audio_url: z.string().url().nullable(),
  transcription: z.string().nullable(),
  score: z.number().int().min(0).max(100).nullable(),
  created_at: z.string().datetime(),
  total_count: z.number().int().min(0).optional()
});

const CallDetailsSchema = CallListItemSchema.extend({
  recording_url: z.string().url().nullable(),
  audio_bucket: z.string().nullable(),
  audio_path: z.string().nullable(),
  transcript_status: z.string(),
  ai_status: z.string(),
  insights: z.record(z.unknown()),
  scorecard: z.record(z.unknown()),
  from_number: z.string().nullable(),
  to_number: z.string().nullable(),
  agent_id: z.string(),
  updated_at: z.string().datetime(),
  processed_at: z.string().datetime().nullable(),
  comments: z.array(z.object({
    id: z.string().uuid(),
    text: z.string(),
    at_seconds: z.number().int().min(0),
    author_name: z.string(),
    created_at: z.string().datetime()
  })).optional(),
  detailed_scores: z.array(z.object({
    criterion_id: z.string(),
    score: z.number().int().min(0).max(10),
    justification: z.string()
  })).optional()
});

const DashboardMetricsSchema = z.object({
  total_calls: z.number().int().min(0),
  answered_calls: z.number().int().min(0),
  answered_rate: z.number().min(0).max(100),
  avg_duration: z.number().min(0),
  total_sdrs: z.number().int().min(0),
  period_start: z.string().datetime(),
  period_end: z.string().datetime()
});

const SdrUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url(),
  callCount: z.number().int().min(0),
  lastCallDate: z.string().datetime(),
  avgDuration: z.number().min(0),
  successRate: z.number().min(0).max(100)
});

const SearchResultSchema = z.object({
  id: z.string().uuid(),
  company_name: z.string(),
  person_name: z.string(),
  sdr_name: z.string(),
  deal_id: z.string(),
  status: CallStatusSchema,
  created_at: z.string().datetime(),
  rank: z.number().min(0),
  search_type: z.string(),
  matched_fields: z.array(z.string())
});

// =========================================
// TIPOS TYPESCRIPT DERIVADOS DOS SCHEMAS
// =========================================

export type CallsFilters = z.infer<typeof CallsFiltersSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type CallListItem = z.infer<typeof CallListItemSchema>;
export type CallDetails = z.infer<typeof CallDetailsSchema>;
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export type SdrUser = z.infer<typeof SdrUserSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type CallStatus = z.infer<typeof CallStatusSchema>;

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly totalCount: number;
  readonly hasMore: boolean;
  readonly currentPage: number;
  readonly totalPages: number;
}

// =========================================
// CLASSE DE ERRO CUSTOMIZADA
// =========================================

export class CallsServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
    public readonly validationErrors?: z.ZodError
  ) {
    super(message);
    this.name = 'CallsServiceError';
  }

  static fromValidationError(error: z.ZodError): CallsServiceError {
    return new CallsServiceError(
      'Dados inválidos fornecidos',
      'VALIDATION_ERROR',
      error.issues,
      error
    );
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
// CACHE MANAGER MELHORADO
// =========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

class EnhancedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000;
  private hitCount = 0;
  private missCount = 0;

  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    // LRU eviction se cache muito grande
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      hits: 0
    });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      this.missCount++;
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    cached.hits++;
    this.hitCount++;
    return cached.data as T;
  }

  getStats() {
    return {
      size: this.cache.size,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      totalHits: this.hitCount,
      totalMisses: this.missCount
    };
  }

  invalidate(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// =========================================
// SERVICE PRINCIPAL COM VALIDAÇÃO
// =========================================

export class ValidatedCallsService {
  private static instance: ValidatedCallsService;
  private cache = new EnhancedCacheManager();

  private constructor() {}

  static getInstance(): ValidatedCallsService {
    if (!ValidatedCallsService.instance) {
      ValidatedCallsService.instance = new ValidatedCallsService();
    }
    return ValidatedCallsService.instance;
  }

  // =========================================
  // MÉTODO HELPER PARA VALIDAÇÃO
  // =========================================

  private validateAndParse<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw CallsServiceError.fromValidationError(error);
      }
      throw error;
    }
  }

  private validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
    return this.validateAndParse(schema, input);
  }

  private validateOutput<T>(schema: z.ZodSchema<T>, output: unknown): T {
    return this.validateAndParse(schema, output);
  }

  // =========================================
  // MÉTODOS PRINCIPAIS COM VALIDAÇÃO
  // =========================================

  async getDashboardMetrics(days: number = 14): Promise<DashboardMetrics> {
    // Validar entrada
    const validDays = z.number().int().min(1).max(365).parse(days);
    
    const cacheKey = `dashboard_metrics_${validDays}`;
    const cached = this.cache.get<DashboardMetrics>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_dashboard_metrics_cached', {
        p_days: validDays
      });

      if (error) throw CallsServiceError.fromSupabaseError(error);
      if (!data?.[0]) throw new CallsServiceError('Nenhuma métrica encontrada', 'NO_DATA');

      // Validar saída
      const metrics = this.validateOutput(DashboardMetricsSchema, data[0]);
      this.cache.set(cacheKey, metrics, 300000);
      return metrics;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro ao buscar métricas', 'FETCH_ERROR', error);
    }
  }

  async getCalls(filters: Partial<CallsFilters> = {}): Promise<PaginatedResponse<CallListItem>> {
    // Validar entrada
    const validFilters = this.validateInput(CallsFiltersSchema, filters);
    const { limit, offset } = validFilters;
    
    const cacheKey = `calls_${JSON.stringify(validFilters)}`;
    const cached = this.cache.get<PaginatedResponse<CallListItem>>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_calls_with_filters_v2', {
        p_limit: limit,
        p_offset: offset,
        p_sdr_email: validFilters.sdr_email || null,
        p_status: validFilters.status || null,
        p_start_date: validFilters.start_date || null,
        p_end_date: validFilters.end_date || null,
        p_search: validFilters.search || null
      });

      if (error) throw CallsServiceError.fromSupabaseError(error);

      // Validar cada item da saída
      const calls = (data || []).map(item => 
        this.validateOutput(CallListItemSchema, item)
      );

      const totalCount = calls[0]?.total_count || 0;
      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(totalCount / limit);

      const response: PaginatedResponse<CallListItem> = {
        data: calls,
        totalCount,
        hasMore: offset + limit < totalCount,
        currentPage,
        totalPages
      };

      this.cache.set(cacheKey, response, 60000);
      return response;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro ao buscar calls', 'FETCH_ERROR', error);
    }
  }

  async getCallDetails(callId: string): Promise<CallDetails> {
    // Validar entrada
    const validCallId = z.string().uuid().parse(callId);
    
    const cacheKey = `call_details_${validCallId}`;
    const cached = this.cache.get<CallDetails>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_call_details', {
        p_call_id: validCallId
      });

      if (error) throw CallsServiceError.fromSupabaseError(error);
      if (!data?.[0]) throw new CallsServiceError('Call não encontrada', 'NOT_FOUND');

      // Validar saída
      const callDetails = this.validateOutput(CallDetailsSchema, data[0]);
      this.cache.set(cacheKey, callDetails, 300000);
      return callDetails;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro ao buscar detalhes da call', 'FETCH_ERROR', error);
    }
  }

  async searchCalls(filters: Partial<SearchFilters>): Promise<readonly SearchResult[]> {
    // Validar entrada
    const validFilters = this.validateInput(SearchFiltersSchema, filters);
    
    const cacheKey = `search_${JSON.stringify(validFilters)}`;
    const cached = this.cache.get<readonly SearchResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('search_calls_advanced', {
        p_query: validFilters.query,
        p_limit: validFilters.limit,
        p_offset: validFilters.offset,
        p_search_type: validFilters.search_type
      });

      if (error) throw CallsServiceError.fromSupabaseError(error);

      // Validar cada resultado
      const results = (data || []).map(item => 
        this.validateOutput(SearchResultSchema, item)
      );

      this.cache.set(cacheKey, results, 120000);
      return results;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro na busca', 'SEARCH_ERROR', error);
    }
  }

  async getUniqueSdrs(): Promise<readonly SdrUser[]> {
    const cacheKey = 'unique_sdrs';
    const cached = this.cache.get<readonly SdrUser[]>(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase.rpc('get_unique_sdrs');

      if (error) throw CallsServiceError.fromSupabaseError(error);

      // Validar e transformar cada SDR
      const sdrs = (data || []).map((sdr: any) => 
        this.validateOutput(SdrUserSchema, {
          id: sdr.sdr_email,
          name: sdr.sdr_name,
          email: sdr.sdr_email,
          avatarUrl: sdr.sdr_avatar_url,
          callCount: sdr.call_count,
          lastCallDate: sdr.last_call_date,
          avgDuration: sdr.avg_duration || 0,
          successRate: sdr.success_rate || 0
        })
      );

      this.cache.set(cacheKey, sdrs, 600000);
      return sdrs;

    } catch (error) {
      if (error instanceof CallsServiceError) throw error;
      throw new CallsServiceError('Erro ao buscar SDRs', 'FETCH_ERROR', error);
    }
  }

  // =========================================
  // MÉTODOS DE MONITORAMENTO
  // =========================================

  getCacheStats() {
    return this.cache.getStats();
  }

  invalidateCache(pattern?: string): number {
    if (pattern) {
      return this.cache.invalidate(pattern);
    } else {
      this.cache.clear();
      return 0;
    }
  }

  // =========================================
  // MÉTODO DE HEALTH CHECK
  // =========================================

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    cache: ReturnType<EnhancedCacheManager['getStats']>;
  }> {
    const checks: Record<string, boolean> = {};

    try {
      // Testar conexão básica
      const { data, error } = await supabase.rpc('get_dashboard_metrics_cached', { p_days: 1 });
      checks.database = !error;
      checks.rpc_functions = !!data;

      // Testar cache
      checks.cache = this.cache.getStats().size >= 0;

      const healthyChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;

      return {
        status: healthyChecks === totalChecks ? 'healthy' : 
                healthyChecks > totalChecks / 2 ? 'degraded' : 'unhealthy',
        checks,
        cache: this.cache.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: { database: false, rpc_functions: false, cache: false },
        cache: this.cache.getStats()
      };
    }
  }
}

// =========================================
// EXPORTS
// =========================================

export const validatedCallsService = ValidatedCallsService.getInstance();

// Hook para React
export const useValidatedCallsService = () => {
  return ValidatedCallsService.getInstance();
};
