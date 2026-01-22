import { supabase } from '../../../services/supabaseClient';
import { SUPABASE_URL } from '../../../services/config';
import { parseLocalDate } from '../utils/date';
import { checkSprintOkrsAvailability } from './sprint.service';
import type {
  OKR,
  OKRWithKeyResults,
  KeyResult,
  OKRFilters,
  OKRMetrics
} from '../types/okr.types';
import type { OKRWithProgressView } from '../types/okr.types';

// ============================================
// OKR CRUD
// ============================================

export async function createOKR(okr: Partial<OKR>): Promise<OKR | null> {
  try {
    // Remover key_results do payload para não enviar coluna inexistente
    const { key_results, ...okrData } = okr as any;

    const resolveUserId = (): { id?: string; source: string } => {
      if (typeof window === 'undefined') return { id: undefined, source: 'no-window' };
      const raw =
        localStorage.getItem('ggv-user') ||
        sessionStorage.getItem('ggv-user') ||
        localStorage.getItem('ggv-emergency-user');
      if (raw) {
        try {
          const u = JSON.parse(raw);
          const id = u?.id || u?.user_id || u?.user?.id || u?.user_metadata?.id;
          if (id) return { id, source: 'ggv-user' };
        } catch {}
      }
      const fallback =
        localStorage.getItem('ggv_user_id') ||
        localStorage.getItem('user_id') ||
        sessionStorage.getItem('user_id');
      if (fallback) return { id: fallback, source: 'storage-id' };
      return { id: undefined, source: 'missing' };
    };

    const resolved = okrData.user_id
      ? { id: okrData.user_id as string, source: 'okrData' }
      : resolveUserId();

    if (!resolved.id) {
      throw new Error('Usuário não identificado para criar OKR');
    }

    // Selecionar apenas colunas reais da tabela para evitar conflitos de cache/relationships
    const columns =
      'id,user_id,level,department,owner,objective,start_date,end_date,periodicity,status,notes,created_at,updated_at,position';

    const { data, error } = await supabase
      .from('okrs')
      .insert({ ...okrData, user_id: resolved.id })
      .select(columns)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar OKR:', error);
    return null;
  }
}

export async function updateOKR(id: string, updates: Partial<OKR>): Promise<OKR | null> {
  try {
    // Remover key_results do updates (não é coluna de okrs)
    const { key_results, ...okrUpdates } = updates as any;

    const { data, error } = await supabase
      .from('okrs')
      .update(okrUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar OKR:', error);
    return null;
  }
}

export async function deleteOKR(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('okrs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar OKR:', error);
    return false;
  }
}

export async function getOKRById(id: string): Promise<OKRWithKeyResults | null> {
  try {
    const { data: okrData, error: okrError } = await supabase
      .from('okrs')
      .select('*')
      .eq('id', id)
      .single();

    if (okrError) throw okrError;

    // Tentar ordenar por position, fallback para created_at se coluna não existir
    let krsData;
    let krsError;
    
    try {
      const result = await supabase
        .from('key_results')
        .select('*')
        .eq('okr_id', id)
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      
      krsData = result.data;
      krsError = result.error;
    } catch {
      // Fallback sem ordenação por position
      const result = await supabase
        .from('key_results')
        .select('*')
        .eq('okr_id', id)
        .order('created_at', { ascending: true });
      
      krsData = result.data;
      krsError = result.error;
    }

    if (krsError) throw krsError;

    return {
      ...okrData,
      key_results: krsData || [],
    };
  } catch (error) {
    console.error('Erro ao buscar OKR:', error);
    return null;
  }
}

export async function listOKRs(filters?: OKRFilters, signal?: AbortSignal): Promise<OKRWithKeyResults[]> {
  try {
    let query = supabase
      .from('okrs')
      .select('*, key_results(*)');

    if (signal) {
      query = query.abortSignal(signal);
    }

    // Aplicar filtros
    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.ilike('objective', `%${filters.search}%`);
    }
    if (filters?.owner) {
      query = query.eq('owner', filters.owner);
    }

    // Ordenar por posição (prioridade) e depois por data de criação
    query = query.order('position', { ascending: true, nullsFirst: false })
                 .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      if (error.code === '20' || (error as any).name === 'AbortError') {
        throw error;
      }
      console.error('❌ [listOKRs] Erro na query:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    if ((error as any).name === 'AbortError' || (error as any)?.code === '20') {
      console.log('Request aborted');
      throw error;
    }
    console.error('❌ [listOKRs] Erro ao listar OKRs:', error);
    return [];
  }
}

export async function getOKRIdsByKRResponsible(userId: string): Promise<string[]> {
  try {
    if (!userId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('key_results')
      .select('okr_id')
      .eq('responsible_user_id', userId);
    
    if (error) {
      throw error;
    }
    
    const okrIds = (data || [])
      .map((row: any) => row.okr_id)
      .filter((id: string | null) => Boolean(id));

    return okrIds;
  } catch (error) {
    return [];
  }
}

export async function listVisibleOKRsForUser(
  userId: string,
  userDepartment?: string | null,
  filters?: OKRFilters,
  signal?: AbortSignal,
  userRole?: string
): Promise<OKRWithKeyResults[]> {
  try {
    const okrIdsFromKrs = userId ? await getOKRIdsByKRResponsible(userId) : [];
    
    const hasDept = Boolean(userDepartment);

    let query = supabase
      .from('okrs')
      .select('*, key_results(*)');

    if (signal) {
      query = query.abortSignal(signal);
    }

    if (hasDept && okrIdsFromKrs.length > 0) {
      query = query.or(`department.eq.${userDepartment},id.in.(${okrIdsFromKrs.join(',')})`);
    } else if (hasDept) {
      query = query.eq('department', userDepartment as string);
    } else if (okrIdsFromKrs.length > 0) {
      query = query.in('id', okrIdsFromKrs);
    } else {
      return [];
    }

    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.ilike('objective', `%${filters.search}%`);
    }

    query = query.order('position', { ascending: true, nullsFirst: false })
                 .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      if (error.code === '20' || (error as any).name === 'AbortError') {
        throw error;
      }
      console.error('❌ [listVisibleOKRsForUser] Erro na query:', error);
      throw error;
    }
    
    // Filtrar key_results apenas para usuários OP (USER)
    // CEO (SUPER_ADMIN) e HEAD (ADMIN) veem todos os KRs
    const normalizedRole = (userRole || '').toString().toUpperCase();
    const isOP = normalizedRole === 'USER';
    
    if (isOP) {
      // OP só vê KRs onde é responsável
      const filteredOkrs = (data || []).map(okr => ({
        ...okr,
        key_results: (okr.key_results || []).filter(
          (kr: any) => kr.responsible_user_id === userId
        )
      }));
      
      return filteredOkrs;
    }

    // CEO e HEAD veem todos os KRs
    return data || [];
  } catch (error) {
    if ((error as any).name === 'AbortError' || (error as any)?.code === '20') {
      console.log('Request aborted');
      throw error;
    }
    console.error('❌ [listVisibleOKRsForUser] Erro ao listar OKRs visíveis:', error);
    return [];
  }
}

// Lista a view okrs_with_progress (sem key_results, apenas agregados)
export async function listOKRsWithProgress(filters?: OKRFilters): Promise<OKRWithProgressView[]> {
  try {
    let query = supabase
      .from('okrs_with_progress')
      .select('*');

    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.ilike('objective', `%${filters.search}%`);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar OKRs (progress view):', error);
    return [];
  }
}

export async function getOKRMetrics(): Promise<OKRMetrics> {
  try {
    const { data, error } = await supabase
      .from('okrs')
      .select('status, end_date');

    if (error) throw error;

    const today = new Date();
    const metrics: OKRMetrics = {
      total: data?.length || 0,
      completed: 0,
      in_progress: 0,
      overdue: 0,
    };

    data?.forEach((okr) => {
      if (okr.status === 'concluído') {
        metrics.completed++;
      } else if (okr.status === 'em andamento') {
        metrics.in_progress++;
      }

      // Verificar se está atrasado
      const endDate = parseLocalDate(okr.end_date);
      if (endDate < today && okr.status !== 'concluído') {
        metrics.overdue++;
      }
    });

    return metrics;
  } catch (error) {
    console.error('Erro ao calcular métricas:', error);
    return {
      total: 0,
      completed: 0,
      in_progress: 0,
      overdue: 0,
    };
  }
}

// ============================================
// KEY RESULTS CRUD
// ============================================

export async function createKeyResult(keyResult: Partial<KeyResult>): Promise<KeyResult | null> {
  try {
    const { data, error } = await supabase
      .from('key_results')
      .insert(keyResult)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar Key Result:', error);
    return null;
  }
}

export async function updateKeyResult(id: string, updates: Partial<KeyResult>): Promise<KeyResult | null> {
  try {
    // Sanitizar updates (evita enviar campos de relação como `okrs` / `okr`, etc.)
    const safeUpdates: any = { ...(updates as any) };
    delete safeUpdates.okrs;
    delete safeUpdates.okr;
    delete safeUpdates.okr_id; // não atualiza vínculo aqui
    delete safeUpdates.created_at;
    delete safeUpdates.created_by;
    delete safeUpdates.updated_at_local;

    let { data, error } = await supabase
      .from('key_results')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    // Fallback: se erro de coluna show_in_cockpit, tentar sem ela
    if (error && (
      error.message?.includes('show_in_cockpit') || 
      error.code === '42703' ||
      error.message?.includes('column')
    )) {
      console.warn('⚠️ Coluna show_in_cockpit não existe ainda. Tentando sem ela...');
      const { show_in_cockpit, ...updatesWithoutCockpit } = safeUpdates as any;
      const result = await supabase
        .from('key_results')
        .update(updatesWithoutCockpit)
        .eq('id', id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    if (data?.okr_id) {
      await updateOKRStatusFromActivity(data.okr_id);
    }
    return data;
  } catch (error) {
    console.error('Erro ao atualizar Key Result:', error);
    return null;
  }
}

export async function deleteKeyResult(id: string): Promise<boolean> {
  try {
    console.log('🗑️ Deletando KR:', id);
    
    const { data, error, count } = await supabase
      .from('key_results')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.warn('⚠️ KR não encontrado para deletar:', id);
    } else {
      console.log('✅ KR deletado com sucesso:', id);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar Key Result:', error);
    return false;
  }
}

export async function getKeyResultsByOKRId(okrId: string): Promise<KeyResult[]> {
  try {
    // Tentar ordenar por position, fallback para created_at
    const { data, error } = await supabase
      .from('key_results')
      .select('*')
      .eq('okr_id', okrId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Ordenar por position no cliente se disponível
    return (data || []).sort((a, b) => {
      const posA = (a as any).position ?? 999;
      const posB = (b as any).position ?? 999;
      return posA - posB;
    });
  } catch (error) {
    console.error('Erro ao buscar Key Results:', error);
    return [];
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function createOKRWithKeyResults(
  okr: Partial<OKR>,
  keyResults: Partial<KeyResult>[]
): Promise<OKRWithKeyResults | null> {
  try {
    // 1. Criar OKR
    const createdOKR = await createOKR(okr);
    if (!createdOKR) throw new Error('Falha ao criar OKR');

    // 2. Criar Key Results
    const createdKRs: KeyResult[] = [];
    for (const kr of keyResults) {
      const createdKR = await createKeyResult({
        ...kr,
        okr_id: createdOKR.id,
      });
      if (createdKR) {
        createdKRs.push(createdKR);
      }
    }

    return {
      ...createdOKR,
      key_results: createdKRs,
    };
  } catch (error) {
    console.error('Erro ao criar OKR com Key Results:', error);
    return null;
  }
}

export async function updateOKRWithKeyResults(
  id: string,
  okrUpdates: Partial<OKR>,
  keyResults: Partial<KeyResult>[]
): Promise<OKRWithKeyResults | null> {
  try {
    // 1. Atualizar OKR
    const updatedOKR = await updateOKR(id, okrUpdates);
    if (!updatedOKR) throw new Error('Falha ao atualizar OKR');

    // 2. Buscar KRs existentes
    const existingKRs = await getKeyResultsByOKRId(id);
    const existingIds = new Set(existingKRs.map(kr => kr.id));
    // Se algum KR veio sem id, tenta casar com existente para evitar duplicação
    const normalizedKeyResults = keyResults.map((kr) => {
      if (kr.id) return kr;
      const title = (kr.title || '').trim().toLowerCase();
      const position = (kr as any).position;
      const match = existingKRs.find((existing) => {
        if ((existing.title || '').trim().toLowerCase() !== title) return false;
        if (typeof position === 'number' && (existing as any).position !== null && (existing as any).position !== undefined) {
          return (existing as any).position === position;
        }
        return true;
      });
      return match?.id ? { ...kr, id: match.id } : kr;
    });
    const incomingIds = new Set(normalizedKeyResults.filter(kr => kr.id).map(kr => kr.id!));

    // 3. Atualizar/Criar Key Results
    // IMPORTANTE (SEGURANÇA):
    // NÃO deletamos automaticamente KRs ausentes no payload.
    // Payload parcial (ex.: usuário OP vendo só parte dos KRs, ou falha de cache/relationship)
    // poderia causar exclusão total em produção.
    // A remoção de KRs deve ser explícita (deleteKeyResult) na UI/fluxo de negócio.
    console.log('📋 Processando KRs (sem delete automático):', {
      incoming: normalizedKeyResults.length,
      existing: existingKRs.length,
      incomingIds: Array.from(incomingIds),
    });
    
    const updatedKRs: KeyResult[] = [];
    for (const kr of normalizedKeyResults) {
      if (kr.id && existingIds.has(kr.id)) {
        // Atualizar existente
        console.log('✏️ Atualizando KR existente:', kr.id, kr.title);
        const updated = await updateKeyResult(kr.id, kr);
        if (updated) updatedKRs.push(updated);
      } else {
        // Criar novo (não tem id ou id não existe no banco)
        console.log('➕ Criando novo KR:', kr.title, '(id recebido:', kr.id || 'nenhum', ')');
        const created = await createKeyResult({
          ...kr,
          okr_id: id,
        });
        if (created) updatedKRs.push(created);
      }
    }

    return {
      ...updatedOKR,
      key_results: updatedKRs,
    };
  } catch (error) {
    console.error('Erro ao atualizar OKR com Key Results:', error);
    return null;
  }
}

/**
 * Atualiza a ordem/posição dos OKRs
 * @param orderedIds Array de IDs na nova ordem
 */
export async function updateOKRsOrder(orderedIds: string[]): Promise<boolean> {
  try {
    // Atualizar cada OKR com sua nova posição
    const updates = orderedIds.map((id, index) => 
      supabase
        .from('okrs')
        .update({ position: index + 1 })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    
    // Verificar se houve erros
    const hasError = results.some(r => r.error);
    if (hasError) {
      console.error('Erro ao atualizar ordem dos OKRs:', results.filter(r => r.error));
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar ordem dos OKRs:', error);
    return false;
  }
}

/**
 * Ajusta status do OKR conforme atividade real
 */
export async function updateOKRStatusFromActivity(okrId: string): Promise<string | null> {
  try {
    const { data: okrData } = await supabase
      .from('okrs')
      .select('status')
      .eq('id', okrId)
      .single();
    if (!okrData || okrData.status === 'concluído') return null;

    // Buscar KRs com colunas básicas (garante compatibilidade)
    let krs: any[] | null = null;
    try {
      const { data, error } = await supabase
        .from('key_results')
        // NÃO usar last_checkin_at: alguns ambientes não têm essa coluna ainda
        .select('type, start_value, current_value')
        .eq('okr_id', okrId);
      if (error) throw error;
      krs = data;
    } catch (e) {
      console.error('Erro ao buscar KRs:', e);
      krs = [];
    }

    const hasKrUpdate = (krs || []).some((kr) => {
      // Sem colunas de check-in disponíveis, inferir por mudança de valor
      if (kr.type === 'activity') return false;

      // Para indicadores numéricos
      if (kr.current_value === null || kr.current_value === undefined) return false;
      if (kr.start_value === null || kr.start_value === undefined) {
        return kr.current_value > 0;
      }
      return kr.current_value !== kr.start_value;
    });

    const { data: sprints } = await supabase
      .from('sprints')
      .select('id')
      .eq('okr_id', okrId)
      .limit(1);

    let hasSprint = (sprints || []).length > 0;
    if (!hasSprint) {
      try {
        const sprintOkrsAvailable = await checkSprintOkrsAvailability();
        if (sprintOkrsAvailable) {
          const { data: sprintOkrs, error: sprintOkrsError } = await supabase
            .from('sprint_okrs')
            .select('id')
            .eq('okr_id', okrId)
            .limit(1);
          if (sprintOkrsError) {
            const isMissingTable =
              sprintOkrsError?.code === '42P01' ||
              (sprintOkrsError as any)?.status === 404 ||
              sprintOkrsError?.message?.includes('does not exist') ||
              sprintOkrsError?.message?.includes('schema cache') ||
              sprintOkrsError?.message?.includes('relationship');
            if (!isMissingTable) {
              throw sprintOkrsError;
            }
          } else {
            hasSprint = (sprintOkrs || []).length > 0;
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao verificar sprint_okrs:', error);
      }
    }

    const nextStatus = hasKrUpdate || hasSprint ? 'em andamento' : 'não iniciado';

    await supabase
      .from('okrs')
      .update({ status: nextStatus })
      .eq('id', okrId)
      .neq('status', 'concluído');
    return nextStatus;
  } catch (error) {
    console.error('Erro ao atualizar status do OKR:', error);
    return null;
  }
}

/**
 * Sincroniza status de todos os OKRs (best-effort)
 */
export async function syncAllOKRStatuses(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('okrs')
      .select('id, status')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const okrsToSync = (data || []).filter((okr) => okr.status !== 'concluído' && okr.id);
    if (okrsToSync.length === 0) return;

    await Promise.all(okrsToSync.map((okr) => updateOKRStatusFromActivity(okr.id)));
  } catch (error) {
    console.error('Erro ao sincronizar status de todos os OKRs:', error);
  }
}

