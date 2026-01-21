import { supabase } from '../../../services/supabaseClient';
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    // Remover key_results do payload para não enviar coluna inexistente
    const { key_results, ...okrData } = okr as any;

    // Selecionar apenas colunas reais da tabela para evitar conflitos de cache/relationships
    const columns =
      'id,user_id,level,department,owner,objective,start_date,end_date,periodicity,status,notes,created_at,updated_at';

    const { data, error } = await supabase
      .from('okrs')
      .insert({
        ...okrData,
        user_id: userData.user.id,
      })
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

    const { data: krsData, error: krsError } = await supabase
      .from('key_results')
      .select('*')
      .eq('okr_id', id);

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

    // Ordenar por data de criação (mais recente primeiro)
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      if (error.code === '20' || (error as any).name === 'AbortError') {
        // Request aborted
        throw error;
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    if ((error as any).name === 'AbortError' || (error as any)?.code === '20') {
      console.log('Request aborted');
      throw error; // Propagate abort
    }
    console.error('Erro ao listar OKRs:', error);
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
      const endDate = new Date(okr.end_date);
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
    const { data, error } = await supabase
      .from('key_results')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar Key Result:', error);
    return null;
  }
}

export async function deleteKeyResult(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('key_results')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar Key Result:', error);
    return false;
  }
}

export async function getKeyResultsByOKRId(okrId: string): Promise<KeyResult[]> {
  try {
    const { data, error } = await supabase
      .from('key_results')
      .select('*')
      .eq('okr_id', okrId);

    if (error) throw error;
    return data || [];
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
    const incomingIds = new Set(keyResults.filter(kr => kr.id).map(kr => kr.id!));

    // 3. Deletar KRs que foram removidos
    const toDelete = existingKRs.filter(kr => !incomingIds.has(kr.id!));
    for (const kr of toDelete) {
      await deleteKeyResult(kr.id!);
    }

    // 4. Atualizar/Criar Key Results
    const updatedKRs: KeyResult[] = [];
    for (const kr of keyResults) {
      if (kr.id && existingIds.has(kr.id)) {
        // Atualizar existente
        const updated = await updateKeyResult(kr.id, kr);
        if (updated) updatedKRs.push(updated);
      } else {
        // Criar novo (não tem id ou id não existe no banco)
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

