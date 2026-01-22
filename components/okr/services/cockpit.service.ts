import { supabase } from '../../../services/supabaseClient';
import type { KeyResult, Department } from '../types/okr.types';
import { calculateKeyResultProgress } from '../types/okr.types';

// ============================================
// TYPES
// ============================================

export interface KRWithOKRContext extends KeyResult {
  okr_id: string;
  okr_objective: string;
  okr_department: Department;
  okr_owner: string;
  okr_level: string;
  okr_end_date: string;
}

export interface CockpitSummary {
  totalKRs: number;
  greenKRs: number;
  yellowKRs: number;
  redKRs: number;
  averageProgress: number;
  byDepartment: Record<string, {
    total: number;
    green: number;
    yellow: number;
    red: number;
    avgProgress: number;
  }>;
}

export interface KRTrend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  lastValue: number;
  currentValue: number;
}

// ============================================
// COCKPIT SERVICE FUNCTIONS
// ============================================

/**
 * Busca todos os KRs marcados como estratégicos (show_in_cockpit = true)
 * Inclui dados do OKR pai para contexto
 */
export async function getStrategicKRs(department?: Department): Promise<KRWithOKRContext[]> {
  try {
    let query = supabase
      .from('key_results')
      .select(`
        *,
        okrs!inner(
          id,
          objective,
          department,
          owner,
          level,
          end_date,
          status
        )
      `)
      .eq('show_in_cockpit', true);

    // Filtrar por departamento se especificado
    if (department) {
      query = query.eq('okrs.department', department);
    }

    // Ordenar por status (vermelho primeiro) e depois por progresso
    query = query.order('status', { ascending: true });

    const { data, error } = await query;

    if (error) {
      // Se a coluna não existir ainda, retornar array vazio
      if (error.message?.includes('show_in_cockpit') || error.code === '42703') {
        console.warn('⚠️ Coluna show_in_cockpit não existe ainda. Execute a migration SQL.');
        return [];
      }
      throw error;
    }

    // Mapear para o formato esperado
    return (data || []).map((kr: any) => ({
      ...kr,
      okr_id: kr.okrs?.id,
      okr_objective: kr.okrs?.objective,
      okr_department: kr.okrs?.department,
      okr_owner: kr.okrs?.owner,
      okr_level: kr.okrs?.level,
      okr_end_date: kr.okrs?.end_date,
      okrs: undefined, // Remove o objeto aninhado
    }));
  } catch (error) {
    console.error('❌ [getStrategicKRs] Erro:', error);
    return [];
  }
}

/**
 * Busca um resumo consolidado dos KRs estratégicos
 * Agrupa por departamento e calcula métricas
 */
export async function getCockpitSummary(department?: Department): Promise<CockpitSummary> {
  try {
    const krs = await getStrategicKRs(department);

    const summary: CockpitSummary = {
      totalKRs: krs.length,
      greenKRs: 0,
      yellowKRs: 0,
      redKRs: 0,
      averageProgress: 0,
      byDepartment: {},
    };

    if (krs.length === 0) {
      return summary;
    }

    let totalProgress = 0;

    krs.forEach((kr) => {
      const progress = calculateKeyResultProgress(kr);
      totalProgress += progress.percentage;

      // Contagem por status
      if (kr.status === 'verde') summary.greenKRs++;
      else if (kr.status === 'amarelo') summary.yellowKRs++;
      else if (kr.status === 'vermelho') summary.redKRs++;

      // Agrupar por departamento
      const dept = kr.okr_department || 'geral';
      if (!summary.byDepartment[dept]) {
        summary.byDepartment[dept] = {
          total: 0,
          green: 0,
          yellow: 0,
          red: 0,
          avgProgress: 0,
        };
      }

      summary.byDepartment[dept].total++;
      if (kr.status === 'verde') summary.byDepartment[dept].green++;
      else if (kr.status === 'amarelo') summary.byDepartment[dept].yellow++;
      else if (kr.status === 'vermelho') summary.byDepartment[dept].red++;
    });

    summary.averageProgress = Math.round(totalProgress / krs.length);

    // Calcular média de progresso por departamento
    Object.keys(summary.byDepartment).forEach((dept) => {
      const deptKRs = krs.filter((kr) => (kr.okr_department || 'geral') === dept);
      const deptProgress = deptKRs.reduce((sum, kr) => {
        return sum + calculateKeyResultProgress(kr).percentage;
      }, 0);
      summary.byDepartment[dept].avgProgress = Math.round(deptProgress / deptKRs.length);
    });

    return summary;
  } catch (error) {
    console.error('❌ [getCockpitSummary] Erro:', error);
    return {
      totalKRs: 0,
      greenKRs: 0,
      yellowKRs: 0,
      redKRs: 0,
      averageProgress: 0,
      byDepartment: {},
    };
  }
}

/**
 * Calcula a tendência de um KR baseado no histórico
 */
export function calculateKRTrend(kr: KRWithOKRContext): KRTrend {
  const history = kr.history || [];
  
  if (history.length < 2) {
    return {
      direction: 'stable',
      percentage: 0,
      lastValue: kr.current_value ?? 0,
      currentValue: kr.current_value ?? 0,
    };
  }

  // Ordenar por data (mais recente primeiro)
  const sorted = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const current = sorted[0]?.value ?? kr.current_value ?? 0;
  const previous = sorted[1]?.value ?? 0;

  if (previous === 0) {
    return {
      direction: current > 0 ? 'up' : 'stable',
      percentage: 0,
      lastValue: previous,
      currentValue: current,
    };
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;

  return {
    direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    percentage: Math.abs(Math.round(change)),
    lastValue: previous,
    currentValue: current,
  };
}

/**
 * Busca KRs estratégicos agrupados por OKR
 */
export async function getStrategicKRsGroupedByOKR(department?: Department): Promise<Map<string, KRWithOKRContext[]>> {
  const krs = await getStrategicKRs(department);
  
  const grouped = new Map<string, KRWithOKRContext[]>();
  
  krs.forEach((kr) => {
    const okrId = kr.okr_id;
    if (!grouped.has(okrId)) {
      grouped.set(okrId, []);
    }
    grouped.get(okrId)!.push(kr);
  });

  return grouped;
}

/**
 * Atualiza a flag show_in_cockpit de um KR
 */
export async function updateKRCockpitVisibility(
  krId: string, 
  showInCockpit: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('key_results')
      .update({ show_in_cockpit: showInCockpit })
      .eq('id', krId);

    if (error) {
      // Se a coluna não existir ainda
      if (error.message?.includes('show_in_cockpit') || error.code === '42703') {
        console.warn('⚠️ Coluna show_in_cockpit não existe ainda. Execute a migration SQL.');
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('❌ [updateKRCockpitVisibility] Erro:', error);
    return false;
  }
}
