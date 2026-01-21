import { supabase } from '../../../services/supabaseClient';

// Cache simples para evitar chamadas repetidas à tabela opcional sprint_okrs
const SPRINT_OKRS_STORAGE_KEY = 'okr:sprint_okrs_available';
let sprintOkrsTableAvailable: boolean | null = (() => {
  try {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(SPRINT_OKRS_STORAGE_KEY);
    if (stored === null) return null;
    return stored === 'true';
  } catch {
    return null;
  }
})();

// ============================================
// TYPES (simplificados)
// ============================================

export interface KRCheckin {
  id?: string;
  kr_id: string;
  sprint_id?: string;
  value: number;
  previous_value?: number;
  target_value?: number;
  delta?: number;
  progress_pct?: number;
  comment?: string;
  confidence?: 'baixa' | 'média' | 'alta';
  created_by?: string;
  created_at?: string;
}

export interface SprintCheckin {
  id?: string;
  sprint_id: string;
  checkin_date?: string;
  summary: string;
  achievements?: string;
  blockers?: string;
  decisions_taken?: string;
  next_focus?: string;
  health: 'verde' | 'amarelo' | 'vermelho';
  health_reason?: string;
  initiatives_completed?: number;
  initiatives_total?: number;
  impediments_count?: number;
  decisions_count?: number;
  carry_over_count?: number;
  carry_over_pct?: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

// ============================================
// KR CHECK-INS (HISTÓRICO)
// ============================================

/**
 * Criar check-in de KR com cálculo automático de progresso
 * CORREÇÃO: previous_value é lido pelo trigger ANTES de atualizar
 */
export async function createKRCheckin(checkin: Partial<KRCheckin>): Promise<KRCheckin | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    console.log('📊 Criando check-in de KR...');

    // Validações
    if (!checkin.kr_id) {
      throw new Error('kr_id é obrigatório');
    }
    if (checkin.value === undefined || checkin.value === null) {
      throw new Error('Valor é obrigatório');
    }
    if (checkin.value < 0) {
      throw new Error('Valor não pode ser negativo');
    }
    const { data: currentKr, error: currentKrError } = await supabase
      .from('key_results')
      .select('current_value')
      .eq('id', checkin.kr_id)
      .single();
    if (currentKrError) {
      throw currentKrError;
    }
    if (currentKr?.current_value === checkin.value) {
      throw new Error('O novo valor deve ser diferente do atual');
    }

    // O trigger vai:
    // 1. Ler current_value ANTES de atualizar (previous_value)
    // 2. Calcular delta e progress_pct
    // 3. Atualizar key_results.current_value DEPOIS

    const { data, error } = await supabase
      .from('kr_checkins')
      .insert({
        kr_id: checkin.kr_id,
        sprint_id: checkin.sprint_id || null,
        value: checkin.value,
        comment: checkin.comment || null,
        confidence: checkin.confidence || 'média',
        created_by: userData.user.id
      })
      .select('*, key_results(title, unit, direction, target_value)')
      .single();

    if (error) throw error;

    console.log('✅ Check-in de KR criado:', {
      kr_id: data.kr_id,
      value: data.value,
      previous_value: data.previous_value,
      delta: data.delta,
      progress: data.progress_pct
    });

    return data;
  } catch (error) {
    console.error('❌ Erro ao criar check-in de KR:', error);
    throw error;
  }
}

/**
 * Listar histórico de check-ins de um KR
 */
export async function listKRCheckins(krId: string): Promise<KRCheckin[]> {
  try {
    const { data, error } = await supabase
      .from('kr_checkins')
      .select('*, sprints(title, start_date, end_date)')
      .eq('kr_id', krId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar check-ins de KR:', error);
    return [];
  }
}

/**
 * Buscar evolução de um KR (para gráfico)
 */
export async function getKREvolution(krId: string, limit = 10): Promise<KRCheckin[]> {
  try {
    const { data, error } = await supabase
      .from('kr_checkins')
      .select('value, progress_pct, created_at')
      .eq('kr_id', krId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar evolução de KR:', error);
    return [];
  }
}

// ============================================
// SPRINT CHECK-INS (REGISTRO DO CICLO)
// ============================================

/**
 * Criar check-in da sprint
 * IMPORTANTE: 1 check-in por sprint (constraint UNIQUE)
 */
export async function createSprintCheckin(
  sprintId: string,
  checkinData: Partial<SprintCheckin>,
  sprintItems: any[]
): Promise<SprintCheckin | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    console.log('📝 Criando check-in da sprint...');

    // Calcular métricas automaticamente
    const initiatives = sprintItems.filter(i => i.type === 'iniciativa');
    const metrics = {
      initiatives_completed: initiatives.filter(i => i.status === 'concluído').length,
      initiatives_total: initiatives.length,
      impediments_count: sprintItems.filter(i => i.type === 'impedimento').length,
      decisions_count: sprintItems.filter(i => i.type === 'decisão').length,
      carry_over_count: sprintItems.filter(i => i.is_carry_over === true).length,
      carry_over_pct: sprintItems.length > 0 
        ? Math.round((sprintItems.filter(i => i.is_carry_over === true).length / sprintItems.length) * 100)
        : 0
    };

    const { data, error } = await supabase
      .from('sprint_checkins')
      .insert({
        sprint_id: sprintId,
        checkin_date: new Date().toISOString().split('T')[0],
        summary: checkinData.summary,
        achievements: checkinData.achievements || null,
        blockers: checkinData.blockers || null,
        decisions_taken: checkinData.decisions_taken || null,
        next_focus: checkinData.next_focus || null,
        health: checkinData.health,
        health_reason: checkinData.health_reason || null,
        notes: checkinData.notes || null,
        ...metrics,
        created_by: userData.user.id
      })
      .select()
      .single();

    if (error) {
      // Se erro de UNIQUE constraint = já tem check-in hoje
      if (error.code === '23505') {
        throw new Error('Já existe um check-in para esta sprint hoje. Edite o check-in existente ou aguarde até amanhã.');
      }
      throw error;
    }

    console.log('✅ Check-in da sprint criado:', data.id);

    return data;
  } catch (error) {
    console.error('❌ Erro ao criar check-in da sprint:', error);
    throw error;
  }
}

/**
 * Listar check-ins de uma sprint
 */
export async function listSprintCheckins(sprintId: string): Promise<SprintCheckin[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_checkins')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('checkin_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar check-ins da sprint:', error);
    return [];
  }
}

/**
 * Atualizar check-in existente
 */
export async function updateSprintCheckin(
  checkinId: string,
  updates: Partial<SprintCheckin>
): Promise<SprintCheckin | null> {
  try {
    console.log('📝 Atualizando check-in existente...');

    const { data, error } = await supabase
      .from('sprint_checkins')
      .update(updates)
      .eq('id', checkinId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Check-in atualizado:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar check-in:', error);
    throw error;
  }
}

/**
 * Buscar KRs vinculados aos OKRs de uma sprint (SEM JSON)
 * CORREÇÃO: Query em tempo real, não snapshot JSON
 */
export async function getSprintKRs(sprintId: string): Promise<any[]> {
  try {
    // 1. Buscar sprint e seus OKRs vinculados
    const { data: sprint } = await supabase
      .from('sprints')
      .select('okr_id')
      .eq('id', sprintId)
      .single();

    if (!sprint?.okr_id) {
      // Tentar buscar de sprint_okrs (múltiplos OKRs) - tabela opcional
      if (sprintOkrsTableAvailable === false) {
        return [];
      }

      try {
        const { data: sprintOkrs, error: okrsError } = await supabase
          .from('sprint_okrs')
          .select('okr_id')
          .eq('sprint_id', sprintId);

        if (okrsError) {
          const isMissingTable =
            okrsError?.code === '42P01' ||
            okrsError?.status === 404 ||
            okrsError?.message?.includes('does not exist') ||
            okrsError?.message?.includes('schema cache') ||
            okrsError?.message?.includes('relationship');

          if (isMissingTable) {
            sprintOkrsTableAvailable = false;
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(SPRINT_OKRS_STORAGE_KEY, 'false');
              }
            } catch {}
            console.warn('⚠️ Tabela sprint_okrs não existe. Sprint sem múltiplos OKRs.');
            return [];
          }

          throw okrsError;
        }

        sprintOkrsTableAvailable = true;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(SPRINT_OKRS_STORAGE_KEY, 'true');
          }
        } catch {}
        const okrIds = sprintOkrs?.map(so => so.okr_id) || [];
        if (okrIds.length === 0) return [];

        // Buscar KRs de múltiplos OKRs
        const { data: krs } = await supabase
          .from('key_results')
          .select('id, title, current_value, target_value, unit, direction, okr_id, okrs(objective)')
          .in('okr_id', okrIds);

        return krs || [];
      } catch (err) {
        console.warn('⚠️ Erro ao buscar sprint_okrs (ignorando):', err);
        return [];
      }
    }

    // 2. Buscar KRs do OKR único
    const { data: krs } = await supabase
      .from('key_results')
      .select('id, title, current_value, target_value, unit, direction, okr_id, okrs(objective)')
      .eq('okr_id', sprint.okr_id);

    return krs || [];
  } catch (error) {
    console.error('Erro ao buscar KRs da sprint:', error);
    return [];
  }
}

/**
 * Buscar último check-in de cada KR
 */
export async function getLatestKRValues(krIds: string[]): Promise<Map<string, KRCheckin>> {
  if (krIds.length === 0) return new Map();

  try {
    // Buscar último check-in de cada KR
    const { data, error } = await supabase
      .from('kr_checkins')
      .select('*')
      .in('kr_id', krIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Agrupar por KR (pegar apenas o mais recente de cada)
    const map = new Map<string, KRCheckin>();
    data?.forEach(checkin => {
      if (!map.has(checkin.kr_id)) {
        map.set(checkin.kr_id, checkin);
      }
    });

    return map;
  } catch (error) {
    console.error('Erro ao buscar últimos valores de KRs:', error);
    return new Map();
  }
}

// ============================================
// TEMPLATES (OPCIONAL)
// ============================================

export async function createSprintTemplate(template: any): Promise<any> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('sprint_templates')
      .insert({
        ...template,
        created_by: userData.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar template:', error);
    throw error;
  }
}

export async function listSprintTemplates(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    return [];
  }
}
