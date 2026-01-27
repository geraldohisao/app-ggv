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

export interface KRMonthlyContext {
  monthStart: string; // YYYY-MM-01
  kind: 'delta' | 'point' | 'range';
  actual: number | null; // delta do mês OU valor fim do mês (conforme kind)
  target: number | null;
  targetMax?: number | null;
  gap: number | null;
  isOk: boolean | null;
}

function monthStartKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function addMonths(d: Date, deltaMonths: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + deltaMonths);
  return x;
}

function getDefaultMonthlyKind(kr: KRWithOKRContext): 'delta' | 'point' {
  if (kr.type === 'percentage') return 'point';
  const dir = (kr.direction || 'increase') as any;
  if ((kr.type === 'currency' || kr.type === 'numeric') && (dir === 'increase' || dir === 'at_least')) {
    return 'delta';
  }
  return 'point';
}

function isBetterWhenLower(kr: KRWithOKRContext): boolean {
  const dir = (kr.direction || 'increase') as any;
  return dir === 'decrease' || dir === 'at_most';
}

/**
 * Calcula contexto do mês atual (Realizado vs Meta) para uma lista de KRs.
 * - 1 query para metas (kr_period_targets)
 * - 1 query para check-ins (kr_checkins) desde o início do mês anterior
 */
export async function getCurrentMonthContextForKRs(
  krs: KRWithOKRContext[]
): Promise<Record<string, KRMonthlyContext>> {
  const map: Record<string, KRMonthlyContext> = {};
  const ids = (krs || []).map((k) => k.id).filter(Boolean) as string[];
  if (ids.length === 0) return map;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(addMonths(monthStart, -1).getFullYear(), addMonths(monthStart, -1).getMonth(), 1);
  const monthStartStr = monthStartKey(monthStart);

  // Defaults
  for (const kr of krs) {
    if (!kr?.id) continue;
    const defKind = getDefaultMonthlyKind(kr);
    map[kr.id] = {
      monthStart: monthStartStr,
      kind: defKind,
      actual: null,
      target: null,
      targetMax: null,
      gap: null,
      isOk: null,
    };
  }

  // 1) Metas do mês atual
  try {
    const { data: targets, error: targetsError } = await supabase
      .from('kr_period_targets')
      .select('kr_id, target_kind, target_value, target_max, period_start')
      .in('kr_id', ids)
      .eq('period_type', 'month')
      .eq('period_start', monthStartStr);

    if (targetsError) {
      const isMissing =
        targetsError?.code === '42P01' ||
        targetsError?.status === 404 ||
        String(targetsError?.message || '').includes('does not exist') ||
        String(targetsError?.message || '').includes('schema cache') ||
        String(targetsError?.message || '').includes('relationship');
      if (!isMissing) {
        console.warn('⚠️ [getCurrentMonthContextForKRs] Falha ao buscar metas:', targetsError);
      }
    } else {
      (targets || []).forEach((t: any) => {
        const krId = t.kr_id;
        if (!krId || !map[krId]) return;
        map[krId].kind = (t.target_kind || map[krId].kind) as any;
        map[krId].target = typeof t.target_value === 'number' ? t.target_value : Number(t.target_value);
        map[krId].targetMax = t.target_max === null || t.target_max === undefined ? null : Number(t.target_max);
      });
    }
  } catch (e) {
    // best-effort
    console.warn('⚠️ [getCurrentMonthContextForKRs] Erro metas:', e);
  }

  // 2) Check-ins desde mês anterior (para achar fim do mês anterior e fim do mês atual)
  const prevMonthStartIso = prevMonthStart.toISOString();
  try {
    const { data: checkins, error: checkinsError } = await supabase
      .from('kr_checkins')
      .select('kr_id, value, created_at')
      .in('kr_id', ids)
      .gte('created_at', prevMonthStartIso)
      .order('created_at', { ascending: true });

    if (checkinsError) {
      console.warn('⚠️ [getCurrentMonthContextForKRs] Falha ao buscar check-ins:', checkinsError);
      return map;
    }

    const byKr = new Map<string, { created_at: string; value: number }[]>();
    (checkins || []).forEach((c: any) => {
      const krId = c.kr_id;
      if (!krId) return;
      const arr = byKr.get(krId) || [];
      arr.push({ created_at: c.created_at, value: Number(c.value ?? 0) });
      byKr.set(krId, arr);
    });

    for (const kr of krs) {
      if (!kr?.id) continue;
      const arr = byKr.get(kr.id) || [];

      let endPrev: number | null = null;
      let endThis: number | null = null;

      for (const c of arr) {
        const t = new Date(c.created_at).getTime();
        if (t < monthStart.getTime()) {
          endPrev = c.value;
        } else {
          endThis = c.value;
        }
      }

      const baseline = endPrev ?? (kr.start_value ?? kr.current_value ?? 0);
      const endValue = endThis ?? endPrev ?? (kr.current_value ?? kr.start_value ?? 0);

      const ctx = map[kr.id];
      const kind = ctx.kind;

      if (kind === 'delta') {
        ctx.actual = endValue - baseline;
        ctx.gap = typeof ctx.target === 'number' ? ctx.actual - ctx.target : null;
        // Para delta, a regra de OK é "atingiu a meta do mês": atual >= meta (mesmo em decrease/at_most isso seria semântico estranho),
        // então mantemos apenas para increase/at_least; se direção for melhor quando menor, não marcamos como ok/ko aqui.
        ctx.isOk = typeof ctx.target === 'number' ? ctx.actual >= ctx.target : null;
      } else if (kind === 'range') {
        ctx.actual = endValue;
        if (typeof ctx.target === 'number' && typeof ctx.targetMax === 'number') {
          ctx.gap = endValue >= ctx.target && endValue <= ctx.targetMax ? 0 : endValue < ctx.target ? endValue - ctx.target : endValue - ctx.targetMax;
          ctx.isOk = ctx.gap === 0;
        } else {
          ctx.gap = null;
          ctx.isOk = null;
        }
      } else {
        ctx.actual = endValue;
        ctx.gap = typeof ctx.target === 'number' ? ctx.actual - ctx.target : null;
        if (typeof ctx.target === 'number') {
          ctx.isOk = isBetterWhenLower(kr) ? ctx.actual <= ctx.target : ctx.actual >= ctx.target;
        } else {
          ctx.isOk = null;
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ [getCurrentMonthContextForKRs] Erro check-ins:', e);
  }

  return map;
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
