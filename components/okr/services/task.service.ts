import { supabase } from '../../../services/supabaseClient';
import {
  TaskStatus,
  TaskSource,
  TaskPriority,
  sortTasks,
  type UnifiedTask,
  type PersonalTask,
  type CreatePersonalTaskInput,
  type Subtask,
  type CreateSubtaskInput,
  type TaskComment,
  type CreateTaskCommentInput,
  type TaskActivityLog,
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

    const taskData: Record<string, unknown> = {
      user_id: effectiveUserId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status || TaskStatus.PENDING,
      priority: input.priority || TaskPriority.MEDIUM,
      due_date: input.due_date || null,
    };
    
    // Incluir responsible_user_id se fornecido
    if (input.responsible_user_id) {
      taskData.responsible_user_id = input.responsible_user_id;
    }
    
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
 * Tipo para task pessoal com dados do responsável e subtasks
 */
interface PersonalTaskWithRelations extends PersonalTask {
  responsible_profile?: {
    id: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
  } | null;
  subtasks?: Subtask[];
}

/**
 * Busca tasks pessoais do usuário
 */
export async function getPersonalTasks(userId?: string): Promise<PersonalTaskWithRelations[]> {
  try {
    const resolved = userId ? { id: userId } : resolveUserId();
    if (!resolved.id) {
      console.warn('⚠️ Usuário não identificado para buscar tasks pessoais');
      return [];
    }

    const { data, error } = await supabase
      .from('personal_tasks')
      .select(`
        *,
        responsible_profile:profiles!personal_tasks_responsible_user_id_fkey(
          id,
          full_name,
          name,
          avatar_url
        ),
        subtasks:personal_task_subtasks(
          id,
          task_id,
          title,
          is_completed,
          position,
          created_at,
          completed_at
        )
      `)
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
function personalTaskToUnified(task: PersonalTaskWithRelations): UnifiedTask {
  const responsibleProfile = task.responsible_profile;
  const subtasks = task.subtasks || [];
  
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
    // Informações do responsável
    responsible_user_id: task.responsible_user_id ?? undefined,
    responsible: responsibleProfile?.full_name || responsibleProfile?.name || undefined,
    responsible_avatar: responsibleProfile?.avatar_url ?? undefined,
    // Subtarefas
    subtasks: subtasks.sort((a, b) => (a.position || 0) - (b.position || 0)),
    subtasks_total: subtasks.length,
    subtasks_completed: subtasks.filter(s => s.is_completed).length,
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
 * Busca TODAS as tasks pessoais (de todos os usuários)
 * Para uso de admins que precisam ver tasks de todos
 */
export async function getAllPersonalTasks(): Promise<PersonalTaskWithRelations[]> {
  try {
    const { data, error } = await supabase
      .from('personal_tasks')
      .select(`
        *,
        responsible_profile:profiles!personal_tasks_responsible_user_id_fkey(
          id,
          full_name,
          name,
          avatar_url
        ),
        subtasks(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar todas as tasks pessoais:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar todas as tasks pessoais:', error);
    return [];
  }
}

/**
 * Busca TODOS os itens de sprint (de todas as sprints)
 * Para uso de admins que precisam ver tasks de todos
 */
export async function getAllSprintItems(): Promise<SprintItemWithContext[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_items')
      .select(`
        *,
        sprints(id, title, start_date, end_date, status, deleted_at)
      `)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('❌ Erro ao buscar todos os itens de sprint:', error);
      return [];
    }

    // Filtrar items de sprints deletadas
    const validItems = (data || []).filter((item: any) => !item.sprints?.deleted_at);
    
    // Transformar para o formato esperado
    return validItems.map((item: any) => ({
      ...item,
      sprint_title: item.sprints?.title || 'Sprint não encontrada',
      sprint_status: item.sprints?.status,
      sprint_start_date: item.sprints?.start_date,
      sprint_end_date: item.sprints?.end_date,
      sprints: undefined,
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar todos os itens de sprint:', error);
    return [];
  }
}

/**
 * Busca TODAS as tasks (pessoais + sprint items de todos os usuários)
 * Para uso de admins que precisam ver tasks de todos
 */
export async function getAllTasks(): Promise<UnifiedTask[]> {
  try {
    // Buscar de ambas as fontes em paralelo
    const [personalTasks, sprintItems] = await Promise.all([
      getAllPersonalTasks(),
      getAllSprintItems(),
    ]);

    // Converter para formato unificado
    const unifiedPersonal = personalTasks.map(personalTaskToUnified);
    const unifiedSprint = sprintItems.map(sprintItemToUnified);

    // Combinar e ordenar
    const allTasks = [...unifiedPersonal, ...unifiedSprint];
    return sortTasks(allTasks);
  } catch (error) {
    console.error('❌ Erro ao buscar todas as tasks:', error);
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

// ============================================
// SUBTASKS (checklist)
// ============================================

/**
 * Busca subtasks de uma task
 */
export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  try {
    const { data, error } = await supabase
      .from('personal_task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar subtasks:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar subtasks:', error);
    return [];
  }
}

/**
 * Cria uma nova subtask
 */
export async function createSubtask(input: CreateSubtaskInput): Promise<Subtask | null> {
  try {
    // Buscar a maior posição atual para colocar a nova subtask no final
    const { data: existingSubtasks } = await supabase
      .from('personal_task_subtasks')
      .select('position')
      .eq('task_id', input.task_id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingSubtasks?.[0]?.position ?? -1;

    const { data, error } = await supabase
      .from('personal_task_subtasks')
      .insert({
        task_id: input.task_id,
        title: input.title.trim(),
        is_completed: input.is_completed ?? false,
        position: nextPosition + 1,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar subtask:', error);
      throw error;
    }

    console.log('✅ Subtask criada:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Erro ao criar subtask:', error);
    throw error;
  }
}

/**
 * Atualiza uma subtask
 */
export async function updateSubtask(
  id: string,
  updates: Partial<Pick<Subtask, 'title' | 'is_completed' | 'position'>>
): Promise<Subtask | null> {
  try {
    const { data, error } = await supabase
      .from('personal_task_subtasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar subtask:', error);
      throw error;
    }

    console.log('✅ Subtask atualizada:', id);
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar subtask:', error);
    throw error;
  }
}

/**
 * Toggle de is_completed de uma subtask
 */
export async function toggleSubtaskComplete(subtask: Subtask): Promise<boolean> {
  try {
    await updateSubtask(subtask.id!, { is_completed: !subtask.is_completed });
    return true;
  } catch (error) {
    console.error('❌ Erro ao toggle subtask:', error);
    return false;
  }
}

/**
 * Deleta uma subtask
 */
export async function deleteSubtask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('personal_task_subtasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar subtask:', error);
      throw error;
    }

    console.log('✅ Subtask deletada:', id);
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar subtask:', error);
    return false;
  }
}

/**
 * Reordena subtasks
 */
export async function reorderSubtasks(taskId: string, subtaskIds: string[]): Promise<boolean> {
  try {
    // Atualizar posições em batch
    const updates = subtaskIds.map((id, index) => 
      supabase
        .from('personal_task_subtasks')
        .update({ position: index })
        .eq('id', id)
        .eq('task_id', taskId)
    );

    await Promise.all(updates);
    console.log('✅ Subtasks reordenadas');
    return true;
  } catch (error) {
    console.error('❌ Erro ao reordenar subtasks:', error);
    return false;
  }
}

// ============================================
// COMMENTS
// ============================================

/**
 * Busca comentários de uma task
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  try {
    const { data, error } = await supabase
      .from('personal_task_comments')
      .select(`
        *,
        user:profiles!personal_task_comments_user_id_fkey(
          id,
          full_name,
          name,
          avatar_url
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar comentários:', error);
      throw error;
    }

    // Mapear para incluir user_name e user_avatar
    return (data || []).map(comment => ({
      ...comment,
      user_name: comment.user?.full_name || comment.user?.name || 'Usuário',
      user_avatar: comment.user?.avatar_url,
      user: undefined,
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar comentários:', error);
    return [];
  }
}

/**
 * Cria um comentário
 */
export async function createTaskComment(input: CreateTaskCommentInput): Promise<TaskComment | null> {
  try {
    const { data, error } = await supabase
      .from('personal_task_comments')
      .insert({
        task_id: input.task_id,
        user_id: input.user_id,
        content: input.content.trim(),
      })
      .select(`
        *,
        user:profiles!personal_task_comments_user_id_fkey(
          id,
          full_name,
          name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao criar comentário:', error);
      throw error;
    }

    console.log('✅ Comentário criado:', data?.id);
    return {
      ...data,
      user_name: data.user?.full_name || data.user?.name || 'Usuário',
      user_avatar: data.user?.avatar_url,
      user: undefined,
    };
  } catch (error) {
    console.error('❌ Erro ao criar comentário:', error);
    throw error;
  }
}

/**
 * Deleta um comentário
 */
export async function deleteTaskComment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('personal_task_comments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar comentário:', error);
      throw error;
    }

    console.log('✅ Comentário deletado:', id);
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar comentário:', error);
    return false;
  }
}

// ============================================
// ACTIVITY LOG / HISTÓRICO
// ============================================

/**
 * Busca histórico de atividades de uma task
 */
export async function getTaskActivityLog(taskId: string): Promise<TaskActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('personal_task_activity_log')
      .select(`
        *,
        user:profiles!personal_task_activity_log_user_id_fkey(
          id,
          full_name,
          name,
          avatar_url
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      throw error;
    }

    // Mapear para incluir user_name e user_avatar
    return (data || []).map(entry => ({
      ...entry,
      user_name: entry.user?.full_name || entry.user?.name || 'Sistema',
      user_avatar: entry.user?.avatar_url,
      user: undefined,
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    return [];
  }
}

/**
 * Formata uma entrada do activity log para exibição
 */
export function formatActivityLogEntry(entry: TaskActivityLog): string {
  const actionLabels: Record<string, string> = {
    created: 'criou a tarefa',
    status_changed: 'alterou o status',
    priority_changed: 'alterou a prioridade',
    due_date_changed: 'alterou a data de vencimento',
    title_changed: 'alterou o título',
    responsible_changed: 'alterou o responsável',
    subtask_added: 'adicionou uma subtarefa',
    subtask_completed: 'concluiu uma subtarefa',
    comment_added: 'adicionou um comentário',
  };

  const actionLabel = actionLabels[entry.action_type] || entry.action_type;

  if (entry.old_value && entry.new_value) {
    return `${actionLabel}: "${entry.old_value}" → "${entry.new_value}"`;
  } else if (entry.new_value) {
    return `${actionLabel}: "${entry.new_value}"`;
  }
  
  return actionLabel;
}
