import { supabase } from '../../../services/supabaseClient';

export type KRPeriodType = 'month' | 'quarter';
export type KRTargetKind = 'delta' | 'point' | 'range';

export interface KRPeriodTargetInput {
  period_start: string; // YYYY-MM-DD (1º dia do período)
  target_kind: KRTargetKind;
  target_value: number;
  target_max?: number | null;
}

export interface KRPeriodTargetRow extends KRPeriodTargetInput {
  id: string;
  kr_id: string;
  period_type: KRPeriodType;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

function isMissingTableError(error: any): boolean {
  return (
    error?.code === '42P01' ||
    error?.status === 404 ||
    String(error?.message || '').includes('does not exist') ||
    String(error?.message || '').includes('schema cache') ||
    String(error?.message || '').includes('relationship')
  );
}

function normalizePeriodStart(dateString: string): string {
  // Mantém formato ISO curto; assume que o chamador já passou 1º dia do mês/trimestre.
  // Blindagem: se vier com timestamp, corta.
  return dateString.includes('T') ? dateString.split('T')[0] : dateString;
}

/**
 * Lista metas por período de um KR.
 * Importante: metas são opcionais; se a tabela não existir, retorna [].
 */
export async function listKRPeriodTargets(
  krId: string,
  periodType: KRPeriodType
): Promise<KRPeriodTargetRow[]> {
  try {
    const { data, error } = await supabase
      .from('kr_period_targets')
      .select('*')
      .eq('kr_id', krId)
      .eq('period_type', periodType)
      .order('period_start', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('⚠️ Tabela kr_period_targets não existe ainda. Execute a migration SQL.');
        return [];
      }
      throw error;
    }

    return (data || []) as KRPeriodTargetRow[];
  } catch (e) {
    console.error('❌ [listKRPeriodTargets] Erro:', e);
    return [];
  }
}

/**
 * Sincroniza metas por período (upsert + delete das removidas).
 * - Envie apenas os períodos com valor preenchido.
 * - Se a tabela não existir, retorna false (sem quebrar).
 */
export async function syncKRPeriodTargets(
  krId: string,
  periodType: KRPeriodType,
  targets: KRPeriodTargetInput[]
): Promise<boolean> {
  try {
    const normalized = (targets || [])
      .map((t) => ({
        ...t,
        period_start: normalizePeriodStart(t.period_start),
      }))
      .filter((t) => Number.isFinite(t.target_value) && t.target_value >= 0);

    const existing = await listKRPeriodTargets(krId, periodType);
    const keepKey = new Set(normalized.map((t) => `${periodType}:${t.period_start}`));
    const toDelete = existing.filter((row) => !keepKey.has(`${row.period_type}:${row.period_start}`));

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('kr_period_targets')
        .delete()
        .in('id', toDelete.map((r) => r.id));

      if (deleteError) {
        if (isMissingTableError(deleteError)) {
          console.warn('⚠️ Tabela kr_period_targets não existe ainda. Execute a migration SQL.');
          return false;
        }
        throw deleteError;
      }
    }

    if (normalized.length === 0) {
      return true;
    }

    const payload = normalized.map((t) => ({
      kr_id: krId,
      period_type: periodType,
      period_start: t.period_start,
      target_kind: t.target_kind,
      target_value: t.target_value,
      target_max: t.target_kind === 'range' ? (t.target_max ?? null) : null,
    }));

    const { error: upsertError } = await supabase
      .from('kr_period_targets')
      .upsert(payload, { onConflict: 'kr_id,period_type,period_start' })
      .select('id');

    if (upsertError) {
      if (isMissingTableError(upsertError)) {
        console.warn('⚠️ Tabela kr_period_targets não existe ainda. Execute a migration SQL.');
        return false;
      }
      throw upsertError;
    }

    return true;
  } catch (e) {
    console.error('❌ [syncKRPeriodTargets] Erro:', e);
    return false;
  }
}

