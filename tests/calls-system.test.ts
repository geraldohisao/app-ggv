// calls-system.test.ts - Testes automatizados para sistema de calls
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase } from '../services/supabaseClient';
import { validatedCallsService, CallsServiceError } from '../calls-dashboard/services/callsServiceV3';

// =========================================
// SETUP DE TESTES
// =========================================

describe('Calls System Tests', () => {
  let testCallId: string;
  let testSdrEmail: string;

  beforeAll(async () => {
    // Setup inicial - criar dados de teste se necessário
    console.log('🧪 Setting up test environment...');
    
    // Verificar se existem dados de teste
    const { data: calls } = await supabase
      .from('calls')
      .select('id, agent_id')
      .limit(1);

    if (calls && calls.length > 0) {
      testCallId = calls[0].id;
      testSdrEmail = calls[0].agent_id;
    }
  });

  afterAll(async () => {
    // Cleanup se necessário
    console.log('🧹 Cleaning up test environment...');
  });

  beforeEach(() => {
    // Limpar cache antes de cada teste
    validatedCallsService.invalidateCache();
  });

  // =========================================
  // TESTES DA VIEW MATERIALIZADA
  // =========================================

  describe('Materialized View Tests', () => {
    it('should have calls_enriched view with data', async () => {
      const { data, error } = await supabase
        .from('calls_enriched')
        .select('id, company_name, sdr_name, sdr_email')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      
      if (data && data.length > 0) {
        const firstCall = data[0];
        expect(firstCall.id).toBeDefined();
        expect(typeof firstCall.company_name).toBe('string');
        expect(typeof firstCall.sdr_name).toBe('string');
      }
    });

    it('should refresh materialized view successfully', async () => {
      const { data, error } = await supabase.rpc('refresh_calls_enriched_smart');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      
      if (data && data.length > 0) {
        const result = data[0];
        expect(result.view_name).toBe('calls_enriched');
        expect(['success', 'skipped - no changes']).toContain(result.status);
      }
    });

    it('should track refresh status correctly', async () => {
      const { data, error } = await supabase
        .from('materialized_view_status')
        .select('*')
        .eq('view_name', 'calls_enriched')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.view_name).toBe('calls_enriched');
      expect(data.health_status).toBeDefined();
      expect(['healthy', 'stale', 'error', 'refreshing']).toContain(data.health_status);
    });
  });

  // =========================================
  // TESTES DO CACHE DE MÉTRICAS
  // =========================================

  describe('Dashboard Metrics Cache Tests', () => {
    it('should return cached metrics when available', async () => {
      // Primeira chamada - deve buscar do banco
      const metrics1 = await validatedCallsService.getDashboardMetrics(7);
      expect(metrics1).toBeDefined();
      expect(typeof metrics1.total_calls).toBe('number');
      expect(typeof metrics1.answered_rate).toBe('number');

      // Segunda chamada - deve vir do cache
      const startTime = Date.now();
      const metrics2 = await validatedCallsService.getDashboardMetrics(7);
      const endTime = Date.now();

      expect(metrics2).toEqual(metrics1);
      expect(endTime - startTime).toBeLessThan(50); // Cache deve ser muito rápido
    });

    it('should validate metrics schema correctly', async () => {
      const metrics = await validatedCallsService.getDashboardMetrics(14);

      expect(metrics.total_calls).toBeGreaterThanOrEqual(0);
      expect(metrics.answered_calls).toBeGreaterThanOrEqual(0);
      expect(metrics.answered_rate).toBeGreaterThanOrEqual(0);
      expect(metrics.answered_rate).toBeLessThanOrEqual(100);
      expect(metrics.avg_duration).toBeGreaterThanOrEqual(0);
      expect(metrics.total_sdrs).toBeGreaterThanOrEqual(0);
      expect(metrics.period_start).toBeDefined();
      expect(metrics.period_end).toBeDefined();
    });

    it('should handle invalid input gracefully', async () => {
      await expect(validatedCallsService.getDashboardMetrics(-1))
        .rejects.toThrow(CallsServiceError);

      await expect(validatedCallsService.getDashboardMetrics(400))
        .rejects.toThrow(CallsServiceError);
    });
  });

  // =========================================
  // TESTES DA BUSCA FULL-TEXT
  // =========================================

  describe('Full-text Search Tests', () => {
    it('should perform smart search correctly', async () => {
      const results = await validatedCallsService.searchCalls({
        query: 'empresa',
        search_type: 'smart',
        limit: 10
      });

      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult.id).toBeDefined();
        expect(firstResult.rank).toBeGreaterThan(0);
        expect(Array.isArray(firstResult.matched_fields)).toBe(true);
        expect(firstResult.search_type).toBe('smart');
      }
    });

    it('should return results sorted by rank', async () => {
      const results = await validatedCallsService.searchCalls({
        query: 'call',
        limit: 5
      });

      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i-1].rank).toBeGreaterThanOrEqual(results[i].rank);
        }
      }
    });

    it('should handle different search types', async () => {
      const searchTypes = ['smart', 'exact', 'fuzzy', 'semantic'] as const;
      
      for (const searchType of searchTypes) {
        const results = await validatedCallsService.searchCalls({
          query: 'test',
          search_type: searchType,
          limit: 3
        });

        expect(Array.isArray(results)).toBe(true);
        results.forEach(result => {
          expect(result.search_type).toBe(searchType);
        });
      }
    });

    it('should validate search input', async () => {
      // Query muito curta
      await expect(validatedCallsService.searchCalls({ query: 'a' }))
        .rejects.toThrow(CallsServiceError);

      // Search type inválido
      await expect(validatedCallsService.searchCalls({ 
        query: 'test', 
        search_type: 'invalid' as any 
      })).rejects.toThrow(CallsServiceError);
    });
  });

  // =========================================
  // TESTES DO SERVICE LAYER
  // =========================================

  describe('Service Layer Tests', () => {
    it('should get calls with filters', async () => {
      const response = await validatedCallsService.getCalls({
        limit: 10,
        offset: 0
      });

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(typeof response.totalCount).toBe('number');
      expect(typeof response.hasMore).toBe('boolean');
      expect(typeof response.currentPage).toBe('number');
      expect(typeof response.totalPages).toBe('number');

      if (response.data.length > 0) {
        const firstCall = response.data[0];
        expect(firstCall.id).toBeDefined();
        expect(firstCall.company_name).toBeDefined();
        expect(firstCall.sdr_name).toBeDefined();
      }
    });

    it('should get call details if call exists', async () => {
      if (!testCallId) {
        console.log('⏭️ Skipping call details test - no test data');
        return;
      }

      const callDetails = await validatedCallsService.getCallDetails(testCallId);

      expect(callDetails.id).toBe(testCallId);
      expect(callDetails.company_name).toBeDefined();
      expect(callDetails.person_name).toBeDefined();
      expect(callDetails.sdr_name).toBeDefined();
      expect(callDetails.created_at).toBeDefined();
    });

    it('should handle non-existent call gracefully', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await expect(validatedCallsService.getCallDetails(fakeId))
        .rejects.toThrow(CallsServiceError);
    });

    it('should get unique SDRs', async () => {
      const sdrs = await validatedCallsService.getUniqueSdrs();

      expect(Array.isArray(sdrs)).toBe(true);
      
      if (sdrs.length > 0) {
        const firstSdr = sdrs[0];
        expect(firstSdr.id).toBeDefined();
        expect(firstSdr.name).toBeDefined();
        expect(firstSdr.email).toBeDefined();
        expect(firstSdr.callCount).toBeGreaterThanOrEqual(0);
        expect(firstSdr.successRate).toBeGreaterThanOrEqual(0);
        expect(firstSdr.successRate).toBeLessThanOrEqual(100);
      }
    });

    it('should validate email filters', async () => {
      // Email inválido
      await expect(validatedCallsService.getCalls({
        sdr_email: 'invalid-email'
      })).rejects.toThrow(CallsServiceError);

      // Status inválido
      await expect(validatedCallsService.getCalls({
        status: 'invalid-status' as any
      })).rejects.toThrow(CallsServiceError);
    });
  });

  // =========================================
  // TESTES DE PERFORMANCE E CACHE
  // =========================================

  describe('Performance and Cache Tests', () => {
    it('should cache results effectively', async () => {
      // Limpar cache
      validatedCallsService.invalidateCache();
      
      // Primeira chamada
      const start1 = Date.now();
      const calls1 = await validatedCallsService.getCalls({ limit: 5 });
      const time1 = Date.now() - start1;

      // Segunda chamada (deve ser do cache)
      const start2 = Date.now();
      const calls2 = await validatedCallsService.getCalls({ limit: 5 });
      const time2 = Date.now() - start2;

      expect(calls2).toEqual(calls1);
      expect(time2).toBeLessThan(time1 * 0.5); // Cache deve ser pelo menos 50% mais rápido
    });

    it('should provide cache statistics', () => {
      const stats = validatedCallsService.getCacheStats();

      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.totalHits).toBe('number');
      expect(typeof stats.totalMisses).toBe('number');
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });

    it('should invalidate cache by pattern', () => {
      // Adicionar alguns itens ao cache
      validatedCallsService.getCalls({ limit: 5 });
      validatedCallsService.getDashboardMetrics(7);

      const initialSize = validatedCallsService.getCacheStats().size;
      expect(initialSize).toBeGreaterThan(0);

      // Invalidar apenas calls
      const deleted = validatedCallsService.invalidateCache('calls');
      expect(deleted).toBeGreaterThan(0);

      const newSize = validatedCallsService.getCacheStats().size;
      expect(newSize).toBeLessThan(initialSize);
    });

    it('should perform health check', async () => {
      const health = await validatedCallsService.healthCheck();

      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(typeof health.checks).toBe('object');
      expect(typeof health.cache).toBe('object');
    });
  });

  // =========================================
  // TESTES DE INTEGRAÇÃO SQL
  // =========================================

  describe('SQL Integration Tests', () => {
    it('should execute optimized get_calls_with_filters_v2', async () => {
      const { data, error } = await supabase.rpc('get_calls_with_filters_v2', {
        p_limit: 5,
        p_offset: 0,
        p_sdr_email: null,
        p_status: null,
        p_start_date: null,
        p_end_date: null,
        p_search: null
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should execute search functions correctly', async () => {
      const { data, error } = await supabase.rpc('search_calls_advanced', {
        p_query: 'test',
        p_limit: 5,
        p_offset: 0,
        p_search_type: 'smart'
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should get search suggestions', async () => {
      const { data, error } = await supabase.rpc('search_suggestions', {
        p_partial_query: 'emp',
        p_limit: 5
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});

// =========================================
// TESTES DE BENCHMARK
// =========================================

describe('Performance Benchmarks', () => {
  it('should meet performance targets', async () => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await validatedCallsService.getCalls({ limit: 20 });
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

    console.log(`📊 Performance Results:
      - Average time: ${avgTime}ms
      - 95th percentile: ${p95Time}ms
      - Cache hit rate: ${validatedCallsService.getCacheStats().hitRate * 100}%`);

    // Targets de performance
    expect(avgTime).toBeLessThan(500); // Média < 500ms
    expect(p95Time).toBeLessThan(1000); // P95 < 1s
  });
});
