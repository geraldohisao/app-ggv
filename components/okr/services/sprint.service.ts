import { supabase } from '../../../services/supabaseClient';
import {
  SprintItemStatus,
  type Sprint,
  type SprintWithItems,
  type SprintItem,
  type SprintFilters,
  type SprintMetrics,
  type KRCheckin,
} from '../types/sprint.types';

// ============================================
// SPRINT CRUD
// ============================================

export async function createSprint(sprint: Partial<Sprint>): Promise<Sprint | null> {
  try {
    console.log('🔐 Verificando autenticação para criar sprint...');
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Erro de autenticação:', authError);
      throw new Error(`Erro de autenticação: ${authError.message}`);
    }
    
    if (!userData.user) {
      console.error('❌ Usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }

    console.log('✅ Usuário autenticado:', userData.user.id);

    // Preparar dados com tratamento de campos opcionais
    const sprintData: any = {
      title: sprint.title,
      type: sprint.type,
      department: sprint.department,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      status: sprint.status || 'planejada',
      description: sprint.description || null,
      okr_id: sprint.okr_id || null,
      parent_id: sprint.parent_id || null,
    };

    // Tentar adicionar created_by se a coluna existir
    console.log('📤 Criando sprint:', sprintData);

    let { data, error } = await supabase
      .from('sprints')
      .insert({ ...sprintData, created_by: userData.user.id })
      .select()
      .single();

    // Fallback: se erro de coluna, tentar sem created_by
    if (error && (error.message?.includes('created_by') || error.code === '42703')) {
      console.warn('⚠️ Coluna created_by não existe em sprints. Tentando sem ela...');
      const result = await supabase
        .from('sprints')
        .insert(sprintData)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Erro do Supabase ao criar sprint:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log('✅ Sprint criada com sucesso:', data?.id);
    
    // Invalidar cache
    invalidateSprintCache();
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao criar Sprint:', error);
    throw error;
  }
}

export async function updateSprint(id: string, updates: Partial<Sprint>): Promise<Sprint | null> {
  try {
    const { data, error } = await supabase
      .from('sprints')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    invalidateSprintCache(id);
    return data;
  } catch (error) {
    console.error('Erro ao atualizar Sprint:', error);
    return null;
  }
}

export async function deleteSprint(id: string): Promise<boolean> {
  try {
    console.log('🗑️ Enviando sprint para lixeira:', id);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    // Tentar com todos os campos
    let { error } = await supabase
      .from('sprints')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userData.user.id,
        status: 'cancelada',
      })
      .eq('id', id);

    // Fallback: tentar sem deleted_by se coluna não existir
    if (error && (error.message?.includes('deleted_by') || error.code === '42703')) {
      console.warn('⚠️ Coluna deleted_by não existe. Tentando sem ela...');
      const result = await supabase
        .from('sprints')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'cancelada',
        })
        .eq('id', id);
      error = result.error;
    }

    if (error) {
      console.error('❌ Erro ao atualizar sprint:', error);
      throw error;
    }

    console.log('✅ Sprint enviada para lixeira com sucesso');
    invalidateSprintCache(id);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar Sprint para lixeira:', error);
    return false;
  }
}

// Cache simples para evitar múltiplas requests
const sprintCache = new Map<string, { data: SprintWithItems; timestamp: number }>();
const CACHE_TTL = 10000; // 10 segundos

export async function getSprintById(id: string, skipCache = false): Promise<SprintWithItems | null> {
  try {
    // Verificar cache
    if (!skipCache) {
      const cached = sprintCache.get(id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('✨ Sprint carregada do cache (instantânea)');
        return cached.data;
      }
    }

    console.log('📥 Carregando sprint do servidor...');
    const startTime = performance.now();

    // 🚀 OTIMIZAÇÃO: Executar apenas queries essenciais em PARALELO
    let sprintQuery = supabase
      .from('sprints')
      .select('id, title, type, scope, department, start_date, end_date, status, description, okr_id, okrs(objective)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    const [
      sprintResult,
      itemsResult
    ] = await Promise.allSettled([
      sprintQuery,
      
      // Query 2: Items (apenas campos necessários)
      supabase
        .from('sprint_items')
        .select('id, sprint_id, type, title, description, responsible, responsible_user_id, status, due_date, is_carry_over, project_id, created_at')
        .eq('sprint_id', id)
        .order('created_at', { ascending: true })
    ]);

    // Fallback: se erro de coluna scope, tentar sem ela
    if (sprintResult.status === 'rejected' && 
        (sprintResult.reason?.code === '406' || 
         sprintResult.reason?.message?.includes('scope') ||
         sprintResult.reason?.message?.includes('schema cache'))) {
      console.warn('⚠️ Coluna scope não reconhecida. Tentando sem ela...');
      const fallbackResult = await supabase
        .from('sprints')
        .select('id, title, type, department, start_date, end_date, status, description, okr_id, okrs(objective)')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      
      if (fallbackResult.data) {
        return {
          ...fallbackResult.data,
          scope: 'execucao', // Default
          okr_title: fallbackResult.data.okrs?.objective,
          items: itemsResult.status === 'fulfilled' ? itemsResult.value.data || [] : [],
          okr_ids: [],
          okrs: [],
          checkins: [],
        };
      }
    }

    // Processar resultado da sprint
    if (sprintResult.status === 'rejected' || !sprintResult.value.data) {
      console.error('❌ Erro ao buscar sprint:', sprintResult.status === 'rejected' ? sprintResult.reason : 'Não encontrada');
      return null;
    }
    const sprintData = sprintResult.value.data;

    // Processar items
    const itemsData = itemsResult.status === 'fulfilled' ? itemsResult.value.data || [] : [];
    if (itemsResult.status === 'rejected') {
      console.warn('⚠️ Erro ao carregar items (continuando sem eles)');
    }

    const result: SprintWithItems = {
      ...sprintData,
      okr_title: sprintData.okrs?.objective,
      items: itemsData,
      okr_ids: [],
      okrs: [],
      checkins: [],
    };

    // Atualizar cache
    sprintCache.set(id, { data: result, timestamp: Date.now() });

    const endTime = performance.now();
    console.log(`✅ Sprint carregada em ${(endTime - startTime).toFixed(0)}ms`);

    return result;
  } catch (error) {
    console.error('❌ Erro ao buscar Sprint:', error);
    return null;
  }
}

// Função para invalidar cache quando necessário
export function invalidateSprintCache(id?: string) {
  if (id) {
    sprintCache.delete(id);
  } else {
    sprintCache.clear();
  }
}

// Limpar cache completo (útil após mudanças de schema)
export function clearAllSprintCache() {
  sprintCache.clear();
  console.log('🧹 Cache de sprints limpo');
}

export async function listSprints(filters?: SprintFilters): Promise<SprintWithItems[]> {
  try {
    let query = supabase
      .from('sprints')
      .select('*, sprint_items(*), okrs(objective)')
      .is('deleted_at', null);

    // Aplicar filtros
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    // Ordenar por data de início (mais recente primeiro)
    query = query.order('start_date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Transformar dados
    return (data || []).map((sprint: any) => ({
      ...sprint,
      okr_title: sprint.okrs?.objective,
      items: sprint.sprint_items || [],
    }));
  } catch (error) {
    console.error('Erro ao listar Sprints:', error);
    return [];
  }
}

export async function getSprintMetrics(): Promise<SprintMetrics> {
  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('status')
      .is('deleted_at', null);

    if (error) throw error;

    const metrics: SprintMetrics = {
      total: data?.length || 0,
      planned: 0,
      in_progress: 0,
      completed: 0,
    };

    data?.forEach((sprint) => {
      switch (sprint.status) {
        case 'planejada':
          metrics.planned++;
          break;
        case 'em andamento':
          metrics.in_progress++;
          break;
        case 'concluída':
          metrics.completed++;
          break;
      }
    });

    return metrics;
  } catch (error) {
    console.error('Erro ao calcular métricas de Sprints:', error);
    return {
      total: 0,
      planned: 0,
      in_progress: 0,
      completed: 0,
    };
  }
}

// ============================================
// SPRINT ITEMS CRUD
// ============================================

export async function createSprintItem(item: Partial<SprintItem>): Promise<SprintItem | null> {
  try {
    console.log('🔐 Verificando autenticação...');
    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Erro de autenticação:', authError);
      throw new Error(`Erro de autenticação: ${authError.message}`);
    }
    
    if (!userData.user) {
      console.error('❌ Usuário não autenticado');
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }

    console.log('✅ Usuário autenticado:', userData.user.id);

    // Validação de campos obrigatórios antes de enviar ao Supabase
    if (!item.sprint_id) {
      throw new Error('ID da sprint é obrigatório');
    }

    if (!item.type) {
      throw new Error('Tipo do item é obrigatório');
    }

    if (!item.title || item.title.trim().length < 3) {
      throw new Error('Título é obrigatório e deve ter pelo menos 3 caracteres');
    }

    // Dados SUPER MÍNIMOS - apenas colunas absolutamente obrigatórias
    const superMinimalItem: any = {
      sprint_id: item.sprint_id,
      type: item.type,
      title: item.title.trim(),
      status: item.status || SprintItemStatus.PENDING,
    };

    // Dados mínimos (adiciona campos text simples que normalmente existem)
    const minimalItem: any = {
      ...superMinimalItem,
      description: item.description?.trim() || null,
      responsible: item.responsible?.trim() || null,
      due_date: item.due_date && item.due_date.trim() !== '' ? item.due_date : null,
    };

    // Dados completos (com TODAS as colunas que podem existir)
    const fullItem: any = {
      ...minimalItem,
      responsible_user_id: item.responsible_user_id || null,
      project_id: item.project_id || null,
      okr_id: item.okr_id || null,
      kr_id: item.kr_id || null,
      created_by: userData.user.id,
      is_carry_over: item.is_carry_over || false,
      carried_from_id: item.carried_from_id || null,
      impediment_status: item.impediment_status || null,
      decision_type: item.decision_type || null,
      decision_status: item.decision_status || null,
      decision_impact: item.decision_impact || null,
      decision_deadline: item.decision_deadline || null,
    };

    console.log('📤 Tentando enviar com TODAS as colunas...');
    
    let { data, error } = await supabase
      .from('sprint_items')
      .insert(fullItem)
      .select()
      .single();

    // Nível 1: Se erro de coluna faltando, tentar com dados mínimos (sem UUIDs opcionais)
    if (error && (
      error.message?.includes('column') || 
      error.message?.includes('schema cache') ||
      error.code === '42703' // undefined_column
    )) {
      const missingColumn = error.message?.match(/'(\w+)' column/)?.[1] || 'desconhecida';
      console.warn(`⚠️ Nível 1: Coluna ${missingColumn} não existe. Tentando sem colunas UUID opcionais...`);
      
      const result = await supabase
        .from('sprint_items')
        .insert(minimalItem)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    // Nível 2: Se ainda houver erro, tentar apenas com campos obrigatórios
    if (error && (
      error.message?.includes('column') || 
      error.message?.includes('schema cache') ||
      error.code === '42703'
    )) {
      const missingColumn = error.message?.match(/'(\w+)' column/)?.[1] || 'desconhecida';
      console.warn(`⚠️ Nível 2: Coluna ${missingColumn} ainda faltando. Tentando apenas obrigatórios...`);
      
      const result = await supabase
        .from('sprint_items')
        .insert(superMinimalItem)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (data) {
      console.log('✅ Item criado com sucesso:', data);
    } else {
      console.error('❌ Falha final:', error);
    }

    if (error) {
      console.error('❌ Erro do Supabase:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log('✅ Item criado com sucesso:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao criar item da Sprint:', error);
    throw error;
  }
}

export async function updateSprintItem(id: string, updates: Partial<SprintItem>): Promise<SprintItem | null> {
  try {
    const normalizedUpdates: any = {
      ...updates,
      due_date: updates.due_date ? updates.due_date : null,
      responsible_user_id: updates.responsible_user_id || null,
      responsible: updates.responsible || null,
      okr_id: updates.okr_id || null,
      kr_id: updates.kr_id || null,
    };

    // Remover created_by se estiver no objeto (não deve ser atualizado)
    delete normalizedUpdates.created_by;
    delete normalizedUpdates.created_at;
    delete normalizedUpdates.id;
    delete normalizedUpdates.sprint_id;

    const { data, error } = await supabase
      .from('sprint_items')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Invalidar cache da sprint pai
    if (data?.sprint_id) {
      invalidateSprintCache(data.sprint_id);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar item da Sprint:', error);
    throw error;
  }
}

export async function deleteSprintItem(id: string): Promise<boolean> {
  try {
    // Buscar sprint_id antes de deletar para invalidar cache
    const { data: item } = await supabase
      .from('sprint_items')
      .select('sprint_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('sprint_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Invalidar cache
    if (item?.sprint_id) {
      invalidateSprintCache(item.sprint_id);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar item da Sprint:', error);
    return false;
  }
}

export async function getSprintItemsBySprintId(sprintId: string): Promise<SprintItem[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_items')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar itens da Sprint:', error);
    return [];
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function createSprintWithItems(
  sprint: Partial<Sprint>,
  items: Partial<SprintItem>[],
  okrIds: string[] = []
): Promise<SprintWithItems | null> {
  try {
    // 1. Criar Sprint
    const createdSprint = await createSprint(sprint);
    if (!createdSprint) throw new Error('Falha ao criar Sprint');

    // 2. Criar Itens
    const createdItems: SprintItem[] = [];
    for (const item of items) {
      const createdItem = await createSprintItem({
        ...item,
        sprint_id: createdSprint.id,
      });
      if (createdItem) {
        createdItems.push(createdItem);
      }
    }

    // 3. Vincular OKRs
    if (okrIds.length > 0) {
      await updateSprintOKRs(createdSprint.id!, okrIds);
    }

    return {
      ...createdSprint,
      items: createdItems,
      okr_ids: okrIds,
    };
  } catch (error) {
    console.error('Erro ao criar Sprint com itens:', error);
    return null;
  }
}

export async function updateSprintWithItems(
  id: string,
  sprintUpdates: Partial<Sprint>,
  items: Partial<SprintItem>[],
  okrIds?: string[]
): Promise<SprintWithItems | null> {
  try {
    // 1. Atualizar Sprint
    const updatedSprint = await updateSprint(id, sprintUpdates);
    if (!updatedSprint) throw new Error('Falha ao atualizar Sprint');

    // 2. Atualizar/Criar Itens
    const updatedItems: SprintItem[] = [];
    for (const item of items) {
      if (item.id) {
        // Atualizar existente
        const updated = await updateSprintItem(item.id, item);
        if (updated) updatedItems.push(updated);
      } else {
        // Criar novo
        const created = await createSprintItem({
          ...item,
          sprint_id: id,
        });
        if (created) updatedItems.push(created);
      }
    }

    // 3. Atualizar vínculos de OKRs
    if (okrIds) {
      await updateSprintOKRs(id, okrIds);
    }

    // Garantir dados atualizados (bypass cache)
    invalidateSprintCache(id);
    return getSprintById(id, true); // Recarregar completo
  } catch (error) {
    console.error('Erro ao atualizar Sprint com itens:', error);
    return null;
  }
}

// ============================================
// QUERIES ESPECIAIS
// ============================================

export async function getSprintsByOKRId(okrId: string): Promise<Sprint[]> {
  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('okr_id', okrId)
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar Sprints por OKR:', error);
    return [];
  }
}

export async function getActiveSprints(): Promise<SprintWithItems[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('sprints')
      .select('*, sprint_items(*), okrs(objective)')
      .lte('start_date', today)
      .gte('end_date', today)
      .eq('status', 'em andamento')
      .is('deleted_at', null);

    if (error) throw error;

    return (data || []).map((sprint: any) => ({
      ...sprint,
      okr_title: sprint.okrs?.objective,
      items: sprint.sprint_items || [],
    }));
  } catch (error) {
    console.error('Erro ao buscar Sprints ativas:', error);
    return [];
  }
}

export async function getGovernanceSprints(filters?: {
  department?: string;
  year?: number;
  status?: string;
}): Promise<SprintWithItems[]> {
  try {
    let query = supabase
      .from('sprints')
      .select('*, sprint_items(*), okrs(objective)')
      .eq('scope', 'governanca')
      .is('deleted_at', null);

    if (filters?.department) {
      query = query.eq('department', filters.department);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.year) {
      query = query
        .gte('start_date', `${filters.year}-01-01`)
        .lte('start_date', `${filters.year}-12-31`);
    }

    query = query.order('start_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((sprint: any) => ({
      ...sprint,
      okr_title: sprint.okrs?.objective,
      items: sprint.sprint_items || [],
    }));
  } catch (error) {
    console.error('Erro ao buscar Sprints de Governança:', error);
    return [];
  }
}

// Lista decisões (sprint_items type 'decisão') com filtros simples
export async function listDecisions(filters?: {
  department?: string;
  sprint_id?: string;
}): Promise<SprintItem[]> {
  try {
    // Primeiro, buscar apenas sprint_items e sprints (sempre funciona)
    let query = supabase
      .from('sprint_items')
      .select('*, sprints!inner(id, title, department, start_date, end_date)')
      .eq('type', 'decisão');

    if (filters?.department) {
      query = query.eq('sprints.department', filters.department);
    }
    if (filters?.sprint_id) {
      query = query.eq('sprint_id', filters.sprint_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data: items, error } = await query;
    if (error) throw error;

    // Tentar enriquecer com OKR/KR (se as colunas existirem)
    if (!items || items.length === 0) return [];

    try {
      // Buscar OKRs únicos
      const okrIds = [...new Set(items.filter(i => i.okr_id).map(i => i.okr_id))];
      const krIds = [...new Set(items.filter(i => i.kr_id).map(i => i.kr_id))];

      let okrsMap = new Map();
      let krsMap = new Map();

      if (okrIds.length > 0) {
        const { data: okrs } = await supabase
          .from('okrs')
          .select('id, objective')
          .in('id', okrIds);
        
        if (okrs) okrs.forEach(okr => okrsMap.set(okr.id, okr));
      }

      if (krIds.length > 0) {
        const { data: krs } = await supabase
          .from('key_results')
          .select('id, title')
          .in('id', krIds);
        
        if (krs) krs.forEach(kr => krsMap.set(kr.id, kr));
      }

      // Enriquecer items com dados de OKR/KR
      return items.map((item: any) => ({
        ...item,
        okrs: item.okr_id ? okrsMap.get(item.okr_id) : null,
        key_results: item.kr_id ? krsMap.get(item.kr_id) : null,
      }));
    } catch (enrichError) {
      console.warn('⚠️ Não foi possível enriquecer com OKR/KR (colunas podem não existir ainda):', enrichError);
      return items; // Retorna sem enriquecimento
    }
  } catch (error) {
    console.error('Erro ao listar decisões:', error);
    return [];
  }
}

// ============================================
// LÓGICA DE RECORRÊNCIA E CARRY-OVER
// ============================================

export async function finalizeAndCreateNext(currentSprintId: string): Promise<SprintWithItems | null> {
  try {
    // 1. Buscar a sprint atual e seus itens
    const currentSprint = await getSprintById(currentSprintId);
    if (!currentSprint) throw new Error('Sprint não encontrada');

    // 2. Marcar a sprint atual como concluída
    const { error: updateError } = await supabase
      .from('sprints')
      .update({ status: 'concluída' })
      .eq('id', currentSprintId);

    if (updateError) throw updateError;

    // 3. Calcular datas para a próxima sprint
    const nextDates = calculateNextSprintDates(currentSprint.end_date, currentSprint.type);

    // 4. Criar a nova sprint
    const nextSprintData: Partial<Sprint> = {
      title: currentSprint.title,
      description: currentSprint.description,
      type: currentSprint.type,
      department: currentSprint.department,
      okr_id: currentSprint.okr_id || null,
      start_date: nextDates.start_date,
      end_date: nextDates.end_date,
      status: 'em andamento',
      parent_id: currentSprint.id || null,
    };

    console.log('📝 Criando próxima sprint com dados:', nextSprintData);
    const nextSprint = await createSprint(nextSprintData);
    
    if (!nextSprint) {
      console.error('❌ createSprint retornou null');
      throw new Error('Falha ao criar próxima sprint. Verifique os logs acima.');
    }
    
    console.log('✅ Próxima sprint criada:', nextSprint.id);

    // 5. Carry-over de itens não concluídos/resolvidos
    const itemsToCarryOver = currentSprint.items.filter(item => {
      // Regra geral: não carregar itens concluídos
      if (item.status === 'concluído') return false;
      
      // Regras específicas por tipo
      if (item.type === 'decisão') {
        const decisionStatus = (item as any).decision_status;
        // Não carregar decisões concluídas ou canceladas
        return decisionStatus !== 'concluido' && decisionStatus !== 'cancelado';
      }
      
      if (item.type === 'impedimento') {
        const impedimentStatus = (item as any).impediment_status;
        // Não carregar impedimentos resolvidos
        return impedimentStatus !== 'resolvido';
      }
      
      // Iniciativas, atividades e marcos: carregar se não concluídos
      return true;
    });

    const createdItems: SprintItem[] = [];
    for (const item of itemsToCarryOver) {
      const { id, created_at, ...itemToCopy } = item;
      const newItem = await createSprintItem({
        ...itemToCopy,
        sprint_id: nextSprint.id,
        is_carry_over: true,
        carried_from_id: id, // Preservar referência ao item original
        status: item.status, // Mantém o status atual
      });
      if (newItem) createdItems.push(newItem);
    }

    return {
      ...nextSprint,
      items: createdItems,
    };
  } catch (error) {
    console.error('Erro ao finalizar e criar próxima sprint:', error);
    return null;
  }
}

export function calculateNextSprintDates(currentEndDate: string, type: string): { start_date: string; end_date: string } {
  const end = new Date(currentEndDate);
  const nextStart = new Date(end);
  nextStart.setDate(nextStart.getDate() + 1);

  const nextEnd = new Date(nextStart);

  switch (type) {
    case 'semanal':
      nextEnd.setDate(nextEnd.getDate() + 6);
      break;
    case 'mensal':
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);
      break;
    case 'trimestral':
      nextEnd.setMonth(nextEnd.getMonth() + 3);
      nextEnd.setDate(nextEnd.getDate() - 1);
      break;
    case 'semestral':
      nextEnd.setMonth(nextEnd.getMonth() + 6);
      nextEnd.setDate(nextEnd.getDate() - 1);
      break;
    case 'anual':
      nextEnd.setFullYear(nextEnd.getFullYear() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);
      break;
    default:
      nextEnd.setDate(nextEnd.getDate() + 7);
  }

  return {
    start_date: nextStart.toISOString().split('T')[0],
    end_date: nextEnd.toISOString().split('T')[0],
  };
}

// ============================================
// VÍNCULOS E CHECK-INS (RITUAL)
// ============================================

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

// Cache de promise para evitar múltiplas chamadas simultâneas
let checkSprintOkrsPromise: Promise<boolean> | null = null;

export async function checkSprintOkrsAvailability(): Promise<boolean> {
  // Se já temos o resultado cacheado, retornar imediatamente
  if (sprintOkrsTableAvailable !== null) {
    return sprintOkrsTableAvailable;
  }

  // Se já existe uma chamada em andamento, reusar
  if (checkSprintOkrsPromise) {
    return checkSprintOkrsPromise;
  }

  checkSprintOkrsPromise = (async () => {
    try {
      const { error } = await supabase
        .from('sprint_okrs')
        .select('sprint_id')
        .limit(1);

      if (error) throw error;

      sprintOkrsTableAvailable = true;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SPRINT_OKRS_STORAGE_KEY, 'true');
        }
      } catch {}
      return true;
    } catch (error: any) {
      const isMissingTable =
        error?.code === '42P01' ||
        error?.status === 404 ||
        error?.message?.includes('does not exist') ||
        error?.message?.includes('schema cache') ||
        error?.message?.includes('relationship');

      if (isMissingTable) {
        sprintOkrsTableAvailable = false;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(SPRINT_OKRS_STORAGE_KEY, 'false');
          }
        } catch {}
        return false;
      }

      console.warn('⚠️ Erro ao validar sprint_okrs. Mantendo vínculo simples.', error);
      return false;
    } finally {
      // Limpar promise após completar
      setTimeout(() => {
        checkSprintOkrsPromise = null;
      }, 1000);
    }
  })();

  return checkSprintOkrsPromise;
}

export async function getSprintOKRIds(sprintId: string): Promise<string[]> {
  try {
    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select('okr_id')
      .eq('id', sprintId)
      .single();

    if (sprintError) throw sprintError;

    if (sprint?.okr_id) {
      return [sprint.okr_id];
    }

    const available = await checkSprintOkrsAvailability();
    if (!available) return [];

    const { data: links, error } = await supabase
      .from('sprint_okrs')
      .select('okr_id')
      .eq('sprint_id', sprintId);

    if (error) throw error;

    return (links || []).map((link: any) => link.okr_id).filter(Boolean);
  } catch (error) {
    console.warn('⚠️ Não foi possível carregar OKRs da sprint:', error);
    return [];
  }
}

export async function updateSprintOKRs(sprintId: string, okrIds: string[]): Promise<void> {
  try {
    console.log('🔗 Tentando atualizar sprint_okrs...');

    if (sprintOkrsTableAvailable === false) {
      return;
    }
    
    // 1. Remover vínculos antigos
    const deleteResult = await supabase.from('sprint_okrs').delete().eq('sprint_id', sprintId);
    
    // Se DELETE deu 404, tabela não existe
    if (deleteResult.error) {
      throw deleteResult.error;
    }

    // 2. Inserir novos
    if (okrIds.length > 0) {
      const records = okrIds.map(okrId => ({ sprint_id: sprintId, okr_id: okrId }));
      const insertResult = await supabase.from('sprint_okrs').insert(records);
      
      if (insertResult.error) {
        throw insertResult.error;
      }
    }
    
    sprintOkrsTableAvailable = true;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SPRINT_OKRS_STORAGE_KEY, 'true');
      }
    } catch {}
    console.log('✅ Sprint OKRs atualizados');
  } catch (error: any) {
    const isMissingTable =
      error?.code === '42P01' ||
      error?.status === 404 ||
      error?.message?.includes('does not exist') ||
      error?.message?.includes('schema cache') ||
      error?.message?.includes('relationship');

    if (isMissingTable) {
      sprintOkrsTableAvailable = false;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SPRINT_OKRS_STORAGE_KEY, 'false');
        }
      } catch {}
      console.warn('⚠️ Tabela sprint_okrs não existe ou erro de acesso. Continuando sem vincular múltiplos OKRs...');
      console.log('📝 Use okr_id em sprints para vínculo simples (1 OKR)');
      // NÃO faz throw - apenas loga e continua
      return;
    }

    console.error('❌ Erro ao atualizar sprint_okrs:', error);
    throw error;
  }
}

export async function createKRCheckin(checkin: Partial<KRCheckin>): Promise<KRCheckin | null> {
  const { data, error } = await supabase
    .from('kr_checkins')
    .insert(checkin)
    .select()
    .single();

  if (error) throw error;

  // Atualizar o valor atual na tabela key_results também
  if (checkin.kr_id && checkin.value !== undefined) {
    await supabase
      .from('key_results')
      .update({ current_value: checkin.value, updated_at: new Date().toISOString() })
      .eq('id', checkin.kr_id);
  }

  return data;
}

export async function getKRCheckinsBySprint(sprintId: string): Promise<KRCheckin[]> {
  const { data, error } = await supabase
    .from('kr_checkins')
    .select('*')
    .eq('sprint_id', sprintId);

  if (error) throw error;
  return data || [];
}

