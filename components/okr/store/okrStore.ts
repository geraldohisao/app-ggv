import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OKRWithKeyResults, OKRFilters, OKRMetrics } from '../types/okr.types';
import * as okrService from '../services/okr.service';

interface OKRStore {
  // Estado
  okrs: OKRWithKeyResults[];
  selectedOKR: OKRWithKeyResults | null;
  filters: OKRFilters;
  metrics: OKRMetrics;
  loading: boolean;
  error: string | null;
  // Controle de Request (não persistido)
  abortController: AbortController | null;

  // Ações
  fetchOKRs: (
    filters?: OKRFilters,
    visibility?: { userId?: string | null; userDepartment?: string | null; isAdmin?: boolean; userRole?: string }
  ) => Promise<void>;
  fetchOKRById: (id: string) => Promise<void>;
  fetchMetrics: () => Promise<void>;
  createOKR: (okr: Parameters<typeof okrService.createOKRWithKeyResults>[0], keyResults: Parameters<typeof okrService.createOKRWithKeyResults>[1]) => Promise<OKRWithKeyResults | null>;
  updateOKR: (id: string, okr: Parameters<typeof okrService.updateOKRWithKeyResults>[1], keyResults: Parameters<typeof okrService.updateOKRWithKeyResults>[2]) => Promise<OKRWithKeyResults | null>;
  deleteOKR: (id: string) => Promise<boolean>;
  reorderOKRs: (orderedIds: string[]) => Promise<boolean>;
  syncOKRStatuses: () => Promise<void>;
  setFilters: (filters: OKRFilters) => void;
  setSelectedOKR: (okr: OKRWithKeyResults | null) => void;
  clearError: () => void;
}

export const useOKRStore = create<OKRStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      okrs: [],
      selectedOKR: null,
      filters: {},
      metrics: {
        total: 0,
        completed: 0,
        in_progress: 0,
        overdue: 0,
      },
      loading: false,
      error: null,
      abortController: null,

      // Ações
      fetchOKRs: async (filters, visibility) => {
        // Cancelar requisição anterior se existir
        const previousController = get().abortController;
        if (previousController) {
          previousController.abort();
        }

        const controller = new AbortController();
        set({ loading: true, error: null, abortController: controller });

        try {
          const useDefault = !visibility || visibility.isAdmin;
          const okrs = useDefault
            ? await okrService.listOKRs(filters, controller.signal)
            : await okrService.listVisibleOKRsForUser(
                visibility.userId || '',
                visibility.userDepartment,
                filters,
                controller.signal,
                visibility.userRole
              );
          // Se chegou aqui com sucesso, verifica se não foi abortado (redundância)
          if (!controller.signal.aborted) {
            set({ okrs, loading: false, abortController: null });
            // Sincronizar status no banco com base em atividade real (em background)
            if (okrs.length > 0) {
              const okrsToSync = okrs.filter((okr) => okr.status !== 'concluído' && okr.id);
              Promise.all(
                okrsToSync.map((okr) => okrService.updateOKRStatusFromActivity(okr.id!))
              ).then((statuses) => {
                set((state) => ({
                  okrs: state.okrs.map((okr) => {
                    if (okr.status === 'concluído') return okr;
                    const targetIndex = okrsToSync.findIndex((o) => o.id === okr.id);
                    if (targetIndex === -1) return okr;
                    const nextStatus = statuses[targetIndex];
                    if (!nextStatus || nextStatus === okr.status) return okr;
                    return { ...okr, status: nextStatus };
                  }),
                }));
              }).catch((error) => {
                console.warn('Erro ao sincronizar status dos OKRs:', error);
              });
            }
          }
        } catch (error) {
          // Ignorar erro de abort
          if ((error as any).name === 'AbortError') {
            console.log('Request cancelado (race condition evitada)');
            return;
          }
          set({ error: 'Erro ao carregar OKRs', loading: false, abortController: null });
          console.error(error);
        }
      },

      fetchOKRById: async (id) => {
        set({ loading: true, error: null });
        try {
          const okr = await okrService.getOKRById(id);
          set({ selectedOKR: okr, loading: false });
        } catch (error) {
          set({ error: 'Erro ao carregar OKR', loading: false });
          console.error(error);
        }
      },

      fetchMetrics: async () => {
        try {
          const metrics = await okrService.getOKRMetrics();
          set({ metrics });
        } catch (error) {
          console.error('Erro ao calcular métricas:', error);
        }
      },

      createOKR: async (okr, keyResults) => {
        set({ loading: true, error: null });
        try {
          const created = await okrService.createOKRWithKeyResults(okr, keyResults);
          if (created) {
            set((state) => ({
              okrs: [created, ...state.okrs],
              selectedOKR: created,
              loading: false,
            }));
            // Atualizar métricas
            get().fetchMetrics();
          } else {
            set({ error: 'Erro ao criar OKR', loading: false });
          }
          return created;
        } catch (error) {
          set({ error: 'Erro ao criar OKR', loading: false });
          console.error(error);
          return null;
        }
      },

      updateOKR: async (id, okrUpdates, keyResults) => {
        set({ loading: true, error: null });
        try {
          const updated = await okrService.updateOKRWithKeyResults(id, okrUpdates, keyResults);
          if (updated) {
            set((state) => ({
              okrs: state.okrs.map((okr) => (okr.id === id ? updated : okr)),
              selectedOKR: state.selectedOKR?.id === id ? updated : state.selectedOKR,
              loading: false,
            }));
            // Atualizar métricas
            get().fetchMetrics();
          } else {
            set({ error: 'Erro ao atualizar OKR', loading: false });
          }
          return updated;
        } catch (error) {
          set({ error: 'Erro ao atualizar OKR', loading: false });
          console.error(error);
          return null;
        }
      },

      deleteOKR: async (id) => {
        set({ loading: true, error: null });
        try {
          const success = await okrService.deleteOKR(id);
          if (success) {
            set((state) => ({
              okrs: state.okrs.filter((okr) => okr.id !== id),
              selectedOKR: state.selectedOKR?.id === id ? null : state.selectedOKR,
              loading: false,
            }));
            // Atualizar métricas
            get().fetchMetrics();
          } else {
            set({ error: 'Erro ao deletar OKR', loading: false });
          }
          return success;
        } catch (error) {
          set({ error: 'Erro ao deletar OKR', loading: false });
          console.error(error);
          return false;
        }
      },

      reorderOKRs: async (orderedIds) => {
        try {
          // Atualizar localmente primeiro (optimistic update)
          const currentOkrs = get().okrs;
          const reorderedOkrs = orderedIds
            .map(id => currentOkrs.find(okr => okr.id === id))
            .filter((okr): okr is OKRWithKeyResults => !!okr);
          
          set({ okrs: reorderedOkrs });

          // Persistir no banco
          const success = await okrService.updateOKRsOrder(orderedIds);
          
          if (!success) {
            // Reverter se falhou
            set({ okrs: currentOkrs });
          }
          
          return success;
        } catch (error) {
          console.error('Erro ao reordenar OKRs:', error);
          return false;
        }
      },

      syncOKRStatuses: async () => {
        try {
          await okrService.syncAllOKRStatuses();
        } catch (error) {
          console.warn('Erro ao sincronizar status dos OKRs:', error);
        }
      },

      setFilters: (filters) => {
        set({ filters });
        get().fetchOKRs(filters);
      },

      setSelectedOKR: (okr) => {
        set({ selectedOKR: okr });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'okr-storage', // Nome da chave no localStorage
      partialize: (state) => ({ filters: state.filters }), // Apenas persistir filtros
    }
  )
);

