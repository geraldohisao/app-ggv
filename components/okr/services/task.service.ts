import { supabase } from '../../../services/supabaseClient';
import {
  TaskStatus,
  TaskSource,
  TaskPriority,
  sortTasks,
  type UnifiedTask,
  type PersonalTask,
  type CreatePersonalTaskInput,
} from '../types/task.types';
import { SprintItemStatus } from '../types/sprint.types';

// ============================================
// HELPER: Resolução de user_id
// ============================================

function resolveUserId(): { id?: string; source: string } {
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
}

// ============================================
// PERSONAL TASKS CRUD
// ============================================

/**
 * Cria uma nova task pessoal
 */
export async function createPersonalTask(input: CreatePersonalTaskInput): Promise<PersonalTask | null> {
  try {
    const resolved = resolveUserId();
    const effectiveUserId = input.user_id?.trim() || resolved.id;

    if (!effectiveUserId) {
      throw new Error('Usuário não identificado');
    }

    const taskData = {
      user_id: effectiveUserId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status || TaskStatus.PENDING,
      priority: input.priority || TaskPriority.MEDIUM,
      due_date: input.due_date || null,
    };
    
    const { data, error } = await supabase
      .from('personal_tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar task pessoal:', error);
      throw error;
    }

    console.log('✅ Task pessoal criada:', data?.id);
    return data;
  } catch (error: any) {
    console.error('❌ Erro ao criar task pessoal:', error);
    throw error;
  }
}

/**
 * Atualiza uma task pessoal
 */
export async function updatePersonalTask(
  id: string,
  updates: Partial<Omit<PersonalTask, 'id' | 'user_id' | 'created_at'>>
): Promise<PersonalTask | null> {
  try {
    const { data, error } = await supabase
      .from('personal_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar task pessoal:', error);
      throw error;
    }

    console.log('✅ Task pessoal atualizada:', id);
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar task pessoal:', error);
    throw error;
  }
}

/**
 * Deleta uma task pessoal
 */
export async function deletePersonalTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('personal_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar task pessoal:', error);
      throw error;
    }

    console.log('✅ Task pessoal deletada:', id);
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar task pessoal:', error);
    return false;
  }
}

/**
 * Busca tasks pessoais do usuário
 */
export async function getPersonalTasks(userId?: string): Promise<PersonalTask[]> {
  try {
    const resolved = userId ? { id: userId } : resolveUserId();
    if (!resolved.id) {
      console.warn('⚠️ Usuário não identificado para buscar tasks pessoais');
      return [];
    }

    const { data, error } = await supabase
      .from('personal_tasks')
      .select('*')
      .eq('user_id', resolved.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar tasks pessoais:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar tasks pessoais:', error);
    return [];
  }
}

// ============================================
// SPRINT ITEMS (tasks de sprint)
// ============================================

interface SprintItemWithContext {
  id: string;
  sprint_id: string;
  type: string;
  title: string;
  description?: string;
  responsible?: string;
  responsible_user_id?: string;
  status: string;
  due_date?: string;
  created_at: string;
  sprint_title?: string;
  sprint_status?: string;
  sprint_start_date?: string;
  sprint_end_date?: string;
}

/**
 * Busca o perfil do usuário para obter nome e email
 */
async function getUserProfile(userId: string): Promise<{ full_name?: string; name?: string; email?: string } | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, name, email')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('⚠️ Não foi possível buscar perfil do usuário:', error);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Busca itens de sprint onde o usuário é responsável
 * Busca por responsible_user_id OU pelo nome no campo responsible (texto)
 */
export async function getMySprintItems(userId?: string): Promise<SprintItemWithContext[]> {
  try {
    const resolved = userId ? { id: userId } : resolveUserId();
    if (!resolved.id) {
      console.warn('⚠️ Usuário não identificado para buscar itens de sprint');
      return [];
    }

    // Buscar perfil do usuário para obter nome
    const profile = await getUserProfile(resolved.id);
    const userName = profile?.full_name || profile?.name;
    console.log('🔍 [getMySprintItems] Buscando para usuário:', resolved.id, 'Nome:', userName, 'Email:', profile?.email);

    // Map para evitar duplicados
    const itemsMap = new Map<string, SprintItemWithContext>();

    // Helper para processar items e adicionar ao map
    const processItems = (items: any[], source: string) => {
      let added = 0;
      (items || []).forEach((item: any) => {
        // Aceitar items mesmo sem join de sprint (sprint pode ter sido deletada ou item órfão)
        const sprintDeleted = item.sprints?.deleted_at;
        if (!sprintDeleted && !itemsMap.has(item.id)) {
          itemsMap.set(item.id, {
            ...item,
            sprint_title: item.sprints?.title || 'Sprint não encontrada',
            sprint_status: item.sprints?.status,
            sprint_start_date: item.sprints?.start_date,
            sprint_end_date: item.sprints?.end_date,
            sprints: undefined,
          });
          added++;
        }
      });
      console.log(`📦 [getMySprintItems] ${source}: ${items?.length || 0} encontrados, ${added} adicionados`);
    };

    // Query 1: Buscar por responsible_user_id (UUID)
    const { data: dataById, error: errorById } = await supabase
      .from('sprint_items')
      .select(`
        *,
        sprints(id, title, start_date, end_date, status, deleted_at)
      `)
      .eq('responsible_user_id', resolved.id)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (errorById) {
      console.error('❌ Erro ao buscar itens por ID:', errorById);
    } else {
      processItems(dataById, 'Query por responsible_user_id');
    }

    // Query 2: Buscar pelo nome no campo responsible (texto)
    // O formato pode ser "Nome Completo" ou "Nome Completo (Cargo - Dept)"
    if (userName) {
      const { data: dataByName, error: errorByName } = await supabase
        .from('sprint_items')
        .select(`
          *,
          sprints(id, title, start_date, end_date, status, deleted_at)
        `)
        .ilike('responsible', `%${userName}%`)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (errorByName) {
        console.error('❌ Erro ao buscar itens por nome:', errorByName);
      } else {
        processItems(dataByName, `Query por nome "${userName}"`);
      }
    }

    // Query 3: Buscar pelo email se disponível
    if (profile?.email) {
      const { data: dataByEmail, error: errorByEmail } = await supabase
        .from('sprint_items')
        .select(`
          *,
          sprints(id, title, start_date, end_date, status, deleted_at)
        `)
        .ilike('responsible', `%${profile.email}%`)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (errorByEmail) {
        console.error('❌ Erro ao buscar itens por email:', errorByEmail);
      } else {
        processItems(dataByEmail, 'Query por email');
      }
    }

    // Query 4: Buscar TODOS os items de sprints onde o usuário é o RESPONSÁVEL DA SPRINT
    // (não do item, mas da sprint como um todo)
    // Primeiro buscar por responsible_user_id da sprint
    const { data: sprintsByUserId, error: errorSprintById } = await supabase
      .from('sprints')
      .select('id')
      .eq('responsible_user_id', resolved.id)
      .is('deleted_at', null);

    if (errorSprintById) {
      console.error('❌ Erro ao buscar sprints por responsible_user_id:', errorSprintById);
    } else if (sprintsByUserId && sprintsByUserId.length > 0) {
      const sprintIds = sprintsByUserId.map(s => s.id);
      console.log(`📦 [getMySprintItems] Encontrou ${sprintIds.length} sprints onde usuário é responsável (por UUID)`);
      
      const { data: itemsFromSprints, error: errorItemsFromSprints } = await supabase
        .from('sprint_items')
        .select(`
          *,
          sprints(id, title, start_date, end_date, status, deleted_at)
        `)
        .in('sprint_id', sprintIds)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (errorItemsFromSprints) {
        console.error('❌ Erro ao buscar items das sprints:', errorItemsFromSprints);
      } else {
        processItems(itemsFromSprints, 'Query items de sprints (por UUID do responsável)');
      }
    }

    // Query 5: Buscar sprints pelo nome do responsável (campo texto)
    if (userName) {
      const { data: sprintsByName, error: errorSprintByName } = await supabase
        .from('sprints')
        .select('id')
        .ilike('responsible', `%${userName}%`)
        .is('deleted_at', null);

      if (errorSprintByName) {
        console.error('❌ Erro ao buscar sprints por nome do responsável:', errorSprintByName);
      } else if (sprintsByName && sprintsByName.length > 0) {
        const sprintIds = sprintsByName.map(s => s.id);
        console.log(`📦 [getMySprintItems] Encontrou ${sprintIds.length} sprints onde usuário é responsável (por nome)`);
        
        const { data: itemsFromSprints, error: errorItemsFromSprints } = await supabase
          .from('sprint_items')
          .select(`
            *,
            sprints(id, title, start_date, end_date, status, deleted_at)
          `)
          .in('sprint_id', sprintIds)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (errorItemsFromSprints) {
          console.error('❌ Erro ao buscar items das sprints:', errorItemsFromSprints);
        } else {
          processItems(itemsFromSprints, `Query items de sprints (por nome "${userName}")`);
        }
      }
    }

    const result = Array.from(itemsMap.values());
    console.log(`✅ [getMySprintItems] Total: ${result.length} itens únicos encontrados para usuário ${resolved.id} (${userName})`);
    return result;
  } catch (error) {
    console.error('❌ Erro ao buscar itens de sprint:', error);
    return [];
  }
}

/**
 * Atualiza o status de um item de sprint
 */
export async function updateSprintItemStatus(id: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sprint_items')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao atualizar status do item:', error);
      throw error;
    }

    console.log('✅ Status do item de sprint atualizado:', id, status);
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar status do item:', error);
    return false;
  }
}

// ============================================
// UNIFIED TASKS (combina ambas fontes)
// ============================================

/**
 * Converte uma task pessoal para UnifiedTask
 */
function personalTaskToUnified(task: PersonalTask): UnifiedTask {
  return {
    id: task.id!,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority | undefined,
    due_date: task.due_date,
    created_at: task.created_at!,
    updated_at: task.updated_at,
    source: TaskSource.PERSONAL,
    user_id: task.user_id,
    completed_at: task.completed_at,
  };
}

/**
 * Converte um item de sprint para UnifiedTask
 */
function sprintItemToUnified(item: SprintItemWithContext): UnifiedTask {
  // Mapear status do sprint_item para TaskStatus
  let status: TaskStatus = TaskStatus.PENDING;
  if (item.status === SprintItemStatus.COMPLETED || item.status === 'concluído') {
    status = TaskStatus.COMPLETED;
  } else if (item.status === SprintItemStatus.IN_PROGRESS || item.status === 'em andamento') {
    status = TaskStatus.IN_PROGRESS;
  }

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    status,
    due_date: item.due_date,
    created_at: item.created_at,
    source: TaskSource.SPRINT,
    sprint_id: item.sprint_id,
    sprint_title: item.sprint_title,
    sprint_status: item.sprint_status,
    item_type: item.type,
    responsible: item.responsible,
    responsible_user_id: item.responsible_user_id,
  };
}

/**
 * Busca todas as tasks do usuário (pessoais + sprint items)
 * Retorna ordenadas por prioridade de exibição
 */
export async function getMyTasks(userId?: string): Promise<UnifiedTask[]> {
  try {
    const resolved = userId ? { id: userId } : resolveUserId();
    if (!resolved.id) {
      console.warn('⚠️ Usuário não identificado');
      return [];
    }

    // Buscar de ambas as fontes em paralelo
    const [personalTasks, sprintItems] = await Promise.all([
      getPersonalTasks(resolved.id),
      getMySprintItems(resolved.id),
    ]);

    // Converter para formato unificado
    const unifiedPersonal = personalTasks.map(personalTaskToUnified);
    const unifiedSprint = sprintItems.map(sprintItemToUnified);

    // Combinar e ordenar
    const allTasks = [...unifiedPersonal, ...unifiedSprint];
    return sortTasks(allTasks);
  } catch (error) {
    console.error('❌ Erro ao buscar tasks unificadas:', error);
    return [];
  }
}

/**
 * Atualiza o status de uma task (pessoal ou sprint)
 */
export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  source: TaskSource
): Promise<boolean> {
  try {
    if (source === TaskSource.PERSONAL) {
      await updatePersonalTask(id, { status });
      return true;
    } else {
      // Mapear TaskStatus para SprintItemStatus
      let sprintStatus = 'pendente';
      if (status === TaskStatus.COMPLETED) {
        sprintStatus = 'concluído';
      } else if (status === TaskStatus.IN_PROGRESS) {
        sprintStatus = 'em andamento';
      }
      return await updateSprintItemStatus(id, sprintStatus);
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar status da task:', error);
    return false;
  }
}

/**
 * Toggle de status da task (marca como concluída ou pendente)
 */
export async function toggleTaskComplete(task: UnifiedTask): Promise<boolean> {
  const newStatus = task.status === TaskStatus.COMPLETED 
    ? TaskStatus.PENDING 
    : TaskStatus.COMPLETED;
  
  return updateTaskStatus(task.id, newStatus, task.source);
}

/**
 * Quick add: cria uma task pessoal rapidamente só com título
 */
export async function quickAddTask(title: string, userId?: string): Promise<PersonalTask | null> {
  const resolved = resolveUserId();
  const effectiveUserId = userId?.trim() || resolved.id;
  if (!effectiveUserId) {
    throw new Error('Usuário não identificado');
  }

  const input = {
    user_id: effectiveUserId,
    title,
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
  };

  return createPersonalTask(input);
}
