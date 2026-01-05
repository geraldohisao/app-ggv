import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CheckIn, PdiRecord, PdiStatus, SurveyAnalysis, TalentRole, TalentState, TalentTask, TaskStatus } from '../types/ggv-talent';
import { ggvTalentMock } from '../data/ggvTalentMock';
import { fetchTalentUsers } from '../services/talentService';
import { FeedbackRecord } from '../types/ggv-talent';

const LOCAL_STORAGE_KEY = 'ggv_talent_state_v1';

interface TalentContextValue {
  state: TalentState;
  impersonatedRole: TalentRole;
  setImpersonatedRole: (role: TalentRole) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  addTask: (task: TalentTask) => void;
  updatePdiStatus: (pdiId: string, status: PdiStatus) => void;
  upsertSurveyAnalysis: (analysis: SurveyAnalysis) => void;
  addObjective: (pdiId: string, objective: PdiRecord['objectives'][number]) => void;
  updateObjective: (pdiId: string, objective: PdiRecord['objectives'][number]) => void;
  toggleKeyResult: (pdiId: string, objectiveId: string, krId: string, done: boolean) => void;
  createQuickPdi: (userId: string, opts?: { diagnostic?: string; cycle?: string }) => void;
  addFeedback: (feedback: FeedbackRecord) => void;
  addCheckIn: (checkIn: Omit<CheckIn, 'id' | 'date'> & { date?: string }) => void;
}

const TalentContext = createContext<TalentContextValue | undefined>(undefined);

const calculatePdiProgress = (pdi: PdiRecord) => {
  const okrAvg = pdi.objectives.length
    ? pdi.objectives.reduce((sum, obj) => {
        const krTotal = obj.keyResults.length || 1;
        const krDone = obj.keyResults.filter((kr) => kr.done).length;
        const derived = Math.round((krDone / krTotal) * 100);
        return sum + (obj.progress || derived);
      }, 0) / pdi.objectives.length
    : 0;

  const planAvg = pdi.developmentPlan.length
    ? pdi.developmentPlan.reduce((sum, action) => {
        if (action.status === 'DONE') return sum + 100;
        if (action.status === 'IN_PROGRESS') return sum + 50;
        return sum;
      }, 0) / pdi.developmentPlan.length
    : 0;

  return Math.round(okrAvg * 0.6 + planAvg * 0.4);
};

const hydrateMock = (): TalentState => {
  const withProgress = ggvTalentMock.pdis.map((pdi) => ({
    ...pdi,
    progress: calculatePdiProgress(pdi),
  }));

  // Evitar exibir usuários fictícios por padrão;
  // usuários reais serão carregados do Supabase (profiles).
  return {
    ...ggvTalentMock,
    users: [],
    pdis: withProgress,
  };
};

const loadState = (): TalentState => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as TalentState;
    }
  } catch (error) {
    console.warn('GGV Talent: não foi possível ler o estado salvo', error);
  }
  return hydrateMock();
};

export const GGVTalentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TalentState>(() => loadState());
  const [impersonatedRole, setImpersonatedRole] = useState<TalentRole>('LEADER');

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('GGV Talent: falha ao salvar estado', error);
    }
  }, [state]);

  // Hidratar usuários a partir do Supabase (profiles) quando possível
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await fetchTalentUsers();
        if (error) {
          console.warn('GGV Talent: não foi possível carregar usuários remotos:', error);
          return;
        }
        if (data && data.length > 0) {
          setState((prev) => ({
            ...prev,
            users: data,
          }));
          return;
        }
        console.warn('GGV Talent: nenhum usuário retornado do Supabase, mantendo estado local');
      } catch (err) {
        console.warn('GGV Talent: erro inesperado ao carregar usuários remotos', err);
      }
    })();
  }, []);

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
    }));
  };

  const addTask = (task: TalentTask) => {
    setState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, task],
    }));
  };

  const updatePdiStatus = (pdiId: string, status: PdiStatus) => {
    setState((prev) => ({
      ...prev,
      pdis: prev.pdis.map((pdi) =>
        pdi.id === pdiId
          ? {
              ...pdi,
              status,
              progress: calculatePdiProgress(pdi),
            }
          : pdi
      ),
    }));
  };

  const upsertSurveyAnalysis = (analysis: SurveyAnalysis) => {
    setState((prev) => ({
      ...prev,
      surveyAnalysis: analysis,
    }));
  };

  const addObjective = (pdiId: string, objective: PdiRecord['objectives'][number]) => {
    setState((prev) => ({
      ...prev,
      pdis: prev.pdis.map((pdi) =>
        pdi.id === pdiId
          ? { ...pdi, objectives: [...pdi.objectives, objective], progress: calculatePdiProgress({ ...pdi, objectives: [...pdi.objectives, objective] }) }
          : pdi
      ),
    }));
  };

  const updateObjective = (pdiId: string, objective: PdiRecord['objectives'][number]) => {
    setState((prev) => ({
      ...prev,
      pdis: prev.pdis.map((pdi) =>
        pdi.id === pdiId
          ? {
              ...pdi,
              objectives: pdi.objectives.map((obj) => (obj.id === objective.id ? objective : obj)),
              progress: calculatePdiProgress({ ...pdi, objectives: pdi.objectives.map((obj) => (obj.id === objective.id ? objective : obj)) }),
            }
          : pdi
      ),
    }));
  };

  const toggleKeyResult = (pdiId: string, objectiveId: string, krId: string, done: boolean) => {
    setState((prev) => ({
      ...prev,
      pdis: prev.pdis.map((pdi) => {
        if (pdi.id !== pdiId) return pdi;
        const objectives = pdi.objectives.map((obj) => {
          if (obj.id !== objectiveId) return obj;
          const keyResults = obj.keyResults.map((kr) => (kr.id === krId ? { ...kr, done } : kr));
          const krTotal = keyResults.length || 1;
          const krDone = keyResults.filter((kr) => kr.done).length;
          const progress = Math.round((krDone / krTotal) * 100);
          return { ...obj, keyResults, progress };
        });
        const nextPdi = { ...pdi, objectives };
        return { ...nextPdi, progress: calculatePdiProgress(nextPdi) };
      }),
    }));
  };

  const createQuickPdi = (userId: string, opts?: { diagnostic?: string; cycle?: string }) => {
    setState((prev) => {
      const newPdi: PdiRecord = {
        id: `pdi-${Date.now()}`,
        userId,
        cycle: opts?.cycle || prev.currentCycle || '2025-H1',
        diagnostic: opts?.diagnostic || 'PDI criado rapidamente para cadastrar OKRs.',
        status: 'IN_PROGRESS',
        objectives: [],
        developmentPlan: [],
        progress: 0,
        history: ['PDI criado via atalho OKR'],
      };
      return {
        ...prev,
        pdis: [...prev.pdis, newPdi],
      };
    });
  };

  const addFeedback = (feedback: FeedbackRecord) => {
    setState((prev) => ({
      ...prev,
      feedbacks: [feedback, ...prev.feedbacks],
    }));
  };

  const addCheckIn = (checkIn: Omit<CheckIn, 'id' | 'date'> & { date?: string }) => {
    setState((prev) => {
      const newCheckIn: CheckIn = {
        id: `chk-${Date.now()}`,
        date: checkIn.date || new Date().toISOString().slice(0, 10),
        ...checkIn,
      };
      return {
        ...prev,
        checkIns: [newCheckIn, ...prev.checkIns],
      };
    });
  };

  const value = useMemo(
    () => ({
      state,
      impersonatedRole,
      setImpersonatedRole,
      updateTaskStatus,
      addTask,
      updatePdiStatus,
      upsertSurveyAnalysis,
      addObjective,
      updateObjective,
      toggleKeyResult,
      createQuickPdi,
      addFeedback,
      addCheckIn,
    }),
    [state, impersonatedRole]
  );

  return <TalentContext.Provider value={value}>{children}</TalentContext.Provider>;
};

export const useTalent = () => {
  const ctx = useContext(TalentContext);
  if (!ctx) {
    throw new Error('useTalent deve ser usado dentro de GGVTalentProvider');
  }
  return ctx;
};

export { calculatePdiProgress };

