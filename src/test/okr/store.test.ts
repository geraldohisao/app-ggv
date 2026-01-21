import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOKRStore } from '../../../components/okr/store/okrStore';
import * as okrService from '../../../components/okr/services/okr.service';

// Mock do service
vi.mock('../../../components/okr/services/okr.service', () => ({
    listOKRs: vi.fn(),
    getOKRById: vi.fn(),
    getOKRMetrics: vi.fn(),
    createOKRWithKeyResults: vi.fn(),
    updateOKRWithKeyResults: vi.fn(),
    deleteOKR: vi.fn(),
}));

describe('useOKRStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useOKRStore.setState({
            okrs: [],
            selectedOKR: null,
            filters: {},
            metrics: { total: 0, completed: 0, in_progress: 0, overdue: 0 },
            loading: false,
            error: null,
            abortController: null,
        });
    });

    it('should set filters and persist them', () => {
        const filters = { search: 'Test' };

        useOKRStore.getState().setFilters(filters);

        expect(useOKRStore.getState().filters).toEqual(filters);

        // Verificar persistência (simulada)
        const stored = JSON.parse(localStorage.getItem('okr-storage') || '{}');
        expect(stored.state.filters).toEqual(filters);
    });

    it('should handle race conditions in fetchOKRs', async () => {
        // Mock listOKRs para demorar um pouco e aceitar signal
        const listOKRsMock = vi.mocked(okrService.listOKRs);

        listOKRsMock.mockImplementation(async (filters, signal) => {
            await new Promise(resolve => setTimeout(resolve, 50)); // Delay
            if (signal?.aborted) {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                throw error;
            }
            return [{ id: '1', objective: 'Test' }] as any;
        });

        // Disparar duas requisições seguidas
        const firstPromise = useOKRStore.getState().fetchOKRs({ search: 'First' });
        const secondPromise = useOKRStore.getState().fetchOKRs({ search: 'Second' });

        await Promise.allSettled([firstPromise, secondPromise]);

        const state = useOKRStore.getState();
        expect(state.error).toBeNull(); // Não deve ter erro de abort
        expect(state.loading).toBe(false);

        // Verifica se listOKRs foi chamado duas vezes
        expect(listOKRsMock).toHaveBeenCalledTimes(2);

        // Verifica se o controler da primeira chamada foi abortado
        // Vitest stores calls in mock.calls
        const firstCallSignal = listOKRsMock.mock.calls[0][1];
        expect(firstCallSignal?.aborted).toBe(true);

        const secondCallSignal = listOKRsMock.mock.calls[1][1];
        expect(secondCallSignal?.aborted).toBe(false);
    });
});
