import { create } from 'zustand';
import type { SprintWithItems, SprintFilters, SprintMetrics } from '../types/sprint.types';
import * as sprintService from '../services/sprint.service';
import * as okrService from '../services/okr.service';

interface SprintStore {
  // Estado
  sprints: SprintWithItems[];
  selectedSprint: SprintWithItems | null;
  filters: SprintFilters;
  metrics: SprintMetrics;
  loading: boolean;
  error: string | null;

  // Ações
  fetchSprints: (
    filters?: SprintFilters,
    visibility?: { userId?: string | null; userDepartment?: string | null; isAdmin?: boolean }
  ) => Promise<void>;
  fetchSprintById: (id: string, skipCache?: boolean) => Promise<void>;
  fetchMetrics: () => Promise<void>;
  fetchActiveSprints: (options?: { userDepartment?: string | null; isAdmin?: boolean; isCEO?: boolean }) => Promise<void>;
  createSprint: (sprint: Parameters<typeof sprintService.createSprintWithItems>[0], items: Parameters<typeof sprintService.createSprintWithItems>[1], okrIds: string[]) => Promise<SprintWithItems | null>;
  updateSprint: (id: string, sprint: Parameters<typeof sprintService.updateSprintWithItems>[1], items: Parameters<typeof sprintService.updateSprintWithItems>[2], okrIds: string[]) => Promise<SprintWithItems | null>;
  finalizeAndCreateNext: (id: string) => Promise<SprintWithItems | null>;
  deleteSprint: (id: string) => Promise<boolean>;
  setFilters: (filters: SprintFilters) => void;
  setSelectedSprint: (sprint: SprintWithItems | null) => void;
  clearError: () => void;
  
  // Ações silenciosas (sem loading - para refresh em background)
  refreshSprintById: (id: string) => Promise<void>;
  refreshSprints: (
    filters?: SprintFilters,
    visibility?: { userId?: string | null; userDepartment?: string | null; isAdmin?: boolean }
  ) => Promise<void>;
  updateSelectedSprintLocally: (updater: (sprint: SprintWithItems) => SprintWithItems) => void;
}

export const useSprintStore = create<SprintStore>((set, get) => ({
  // Estado inicial
  sprints: [],
  selectedSprint: null,
  filters: {},
  metrics: {
    total: 0,
    planned: 0,
    in_progress: 0,
    completed: 0,
  },
  loading: false,
  error: null,

  // Ações
  fetchSprints: async (filters, visibility) => {
    set({ loading: true, error: null });
    try {
      if (!visibility || visibility.isAdmin) {
        const sprints = await sprintService.listSprints(filters);
        set({ sprints, loading: false });
        return;
      }

      const okrIds = visibility.userId
        ? await okrService.getOKRIdsByKRResponsible(visibility.userId)
        : [];
      const sprints = await sprintService.listSprints({
        ...filters,
        visibilityDepartment: visibility.userDepartment || undefined,
        visibilityOkrIds: okrIds,
      });
      set({ sprints, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar Sprints', loading: false });
      console.error(error);
    }
  },

  fetchSprintById: async (id, skipCache = false) => {
    // Se já temos a sprint e não estamos forçando reload, retornar imediatamente
    const current = get().selectedSprint;
    if (!skipCache && current?.id === id) {
      console.log('⚡ Sprint já está carregada no store');
      return;
    }

    set({ loading: true, error: null });
    try {
      const sprint = await sprintService.getSprintById(id, skipCache);
      set({ selectedSprint: sprint, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar Sprint', loading: false });
      console.error(error);
    }
  },

  fetchMetrics: async () => {
    try {
      const metrics = await sprintService.getSprintMetrics();
      set({ metrics });
    } catch (error) {
      console.error('Erro ao calcular métricas de Sprints:', error);
    }
  },

  fetchActiveSprints: async (options) => {
    set({ loading: true, error: null });
    try {
      const sprints = await sprintService.getActiveSprints(options);
      set({ sprints, loading: false });
    } catch (error) {
      set({ error: 'Erro ao carregar Sprints ativas', loading: false });
      console.error(error);
    }
  },

  createSprint: async (sprint, items, okrIds) => {
    set({ loading: true, error: null });
    try {
      const created = await sprintService.createSprintWithItems(sprint, items, okrIds);
      if (created) {
        set((state) => ({
          sprints: [created, ...state.sprints],
          selectedSprint: created,
          loading: false,
        }));
        // Atualizar métricas
        get().fetchMetrics();
      } else {
        set({ error: 'Erro ao criar Sprint', loading: false });
      }
      return created;
    } catch (error) {
      set({ error: 'Erro ao criar Sprint', loading: false });
      console.error(error);
      return null;
    }
  },

  updateSprint: async (id, sprintUpdates, items, okrIds) => {
    set({ loading: true, error: null });
    try {
      const updated = await sprintService.updateSprintWithItems(id, sprintUpdates, items, okrIds);
      if (updated) {
        set((state) => ({
          sprints: state.sprints.map((sprint) => (sprint.id === id ? updated : sprint)),
          selectedSprint: state.selectedSprint?.id === id ? updated : state.selectedSprint,
          loading: false,
        }));
        // Atualizar métricas
        get().fetchMetrics();
      } else {
        set({ error: 'Erro ao atualizar Sprint', loading: false });
      }
      return updated;
    } catch (error) {
      set({ error: 'Erro ao atualizar Sprint', loading: false });
      console.error(error);
      return null;
    }
  },

  finalizeAndCreateNext: async (id) => {
    set({ loading: true, error: null });
    try {
      const result = await sprintService.finalizeAndCreateNext(id);
      if (result) {
        set((state) => ({
          sprints: [result, ...state.sprints.map(s => s.id === id ? { ...s, status: 'concluída' as any } : s)],
          selectedSprint: result,
          loading: false,
        }));
        get().fetchMetrics();
      } else {
        set({ error: 'Erro ao rotacionar ritual', loading: false });
      }
      return result;
    } catch (error) {
      set({ error: 'Erro ao rotacionar ritual', loading: false });
      console.error(error);
      return null;
    }
  },

  deleteSprint: async (id) => {
    set({ loading: true, error: null });
    try {
      const success = await sprintService.deleteSprint(id);
      if (success) {
        set((state) => ({
          sprints: state.sprints.filter((sprint) => sprint.id !== id),
          selectedSprint: state.selectedSprint?.id === id ? null : state.selectedSprint,
          loading: false,
        }));
        // Atualizar métricas
        get().fetchMetrics();
      } else {
        set({ error: 'Erro ao deletar Sprint', loading: false });
      }
      return success;
    } catch (error) {
      set({ error: 'Erro ao deletar Sprint', loading: false });
      console.error(error);
      return false;
    }
  },

  setFilters: (filters) => {
    set({ filters });
    get().fetchSprints(filters);
  },

  setSelectedSprint: (sprint) => {
    set({ selectedSprint: sprint });
  },

  clearError: () => {
    set({ error: null });
  },

  // ===========================================
  // Ações silenciosas (sem loading)
  // Usadas para refresh em background sem "piscar" a UI
  // ===========================================

  refreshSprintById: async (id) => {
    // Refresh silencioso: NÃO seta loading=true
    // Mantém a UI atual e atualiza apenas quando o dado chegar
    try {
      const sprint = await sprintService.getSprintById(id, true); // skipCache=true
      if (sprint) {
        set((state) => ({
          selectedSprint: state.selectedSprint?.id === id ? sprint : state.selectedSprint,
          sprints: state.sprints.map((s) => (s.id === id ? sprint : s)),
        }));
      }
    } catch (error) {
      // Erro silencioso - não interrompe a UX
      console.warn('⚠️ Erro no refresh silencioso da sprint:', error);
    }
  },

  refreshSprints: async (filters, visibility) => {
    // Refresh silencioso: NÃO seta loading=true
    try {
      let sprints: SprintWithItems[];
      if (!visibility || visibility.isAdmin) {
        sprints = await sprintService.listSprints(filters);
      } else {
        const okrIds = visibility.userId
          ? await okrService.getOKRIdsByKRResponsible(visibility.userId)
          : [];
        sprints = await sprintService.listSprints({
          ...filters,
          visibilityDepartment: visibility.userDepartment || undefined,
          visibilityOkrIds: okrIds,
        });
      }
      set({ sprints });
    } catch (error) {
      // Erro silencioso
      console.warn('⚠️ Erro no refresh silencioso das sprints:', error);
    }
  },

  updateSelectedSprintLocally: (updater) => {
    // Atualização otimista local (síncrona)
    set((state) => {
      if (!state.selectedSprint) return state;
      const updated = updater(state.selectedSprint);
      return {
        selectedSprint: updated,
        sprints: state.sprints.map((s) => (s.id === updated.id ? updated : s)),
      };
    });
  },
}));

