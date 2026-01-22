import { supabase } from '../../../services/supabaseClient';
import { updateOKRStatusFromActivity } from './okr.service';
import { parseCheckinToItems } from './checkinParser.service';
import { matchItemsWithAI } from './checkinMatcher.service';
import * as sprintService from './sprint.service';
import type { SprintItemSuggestion, SprintItem } from '../types/sprint.types';

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
  // Campos de Execução
  achievements?: string;
  blockers?: string;
  decisions_taken?: string;
  next_focus?: string;
  // Campos de Governança
  learnings?: string;
  okr_misalignments?: string;
  keep_doing?: string;
  stop_doing?: string;
  adjust_doing?: string;
  strategic_recommendations?: string;
  identified_risks?: string;
  // Campos comuns
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

type SprintScope = 'execucao' | 'governanca';

async function resolveUserId(): Promise<string | undefined> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) return userData.user.id;
  } catch {
    // Ignorar e tentar fallback abaixo
  }

  try {
    const raw = typeof window !== 'undefined' ? (
      localStorage.getItem('ggv-user') ||
      sessionStorage.getItem('ggv-user') ||
      localStorage.getItem('ggv-emergency-user')
    ) : null;

    if (raw) {
      try {
        const u = JSON.parse(raw);
        return u?.id || u?.user_id || u?.user?.id || u?.user_metadata?.id;
      } catch {
        // noop
      }
    }

    return localStorage.getItem('ggv_user_id') ||
      localStorage.getItem('user_id') ||
      sessionStorage.getItem('user_id') ||
      undefined;
  } catch {
    return undefined;
  }
}

async function generateSuggestionsFromCheckin(
  checkin: SprintCheckin,
  sprintScope: SprintScope,
  userId: string
): Promise<number> {
  if (!checkin?.id || !checkin?.sprint_id) {
    console.warn('⚠️ Check-in inválido para gerar sugestões.');
    return 0;
  }

  console.log('🤖 Iniciando parser de check-in para gerar sugestões...');

  const parsedItems = parseCheckinToItems(checkin, sprintScope);
  if (parsedItems.length === 0) {
    console.log('ℹ️ Nenhum bullet point encontrado para criar items');
    return 0;
  }

  console.log(`📋 Parser extraiu ${parsedItems.length} items`);

  // Buscar apenas campos necessários e limitar volume para reduzir custo/latência
  const { data: existingItems } = await supabase
    .from('sprint_items')
    .select('id, type, title, description, status, created_at')
    .eq('sprint_id', checkin.sprint_id)
    .order('created_at', { ascending: false })
    .limit(60);

  console.log(`📦 ${existingItems?.length || 0} items manuais existentes na sprint`);

  // Reduzir contexto: só itens do mesmo tipo dos parsedItems
  const typeSet = new Set(parsedItems.map((p) => p.type));
  const relevantExisting = (existingItems || []).filter((i: any) => typeSet.has(i.type));

  const matches = await matchItemsWithAI(
    parsedItems,
    relevantExisting as any,
    checkin.id
  );

  let suggestionCount = 0;

  for (const match of matches) {
    try {
      const suggestedAction = match.shouldUpdate && match.existingItem ? 'update' : 'create';
      const { error: suggestionError } = await supabase
        .from('sprint_item_suggestions')
        .insert({
          sprint_id: checkin.sprint_id,
          checkin_id: checkin.id,
          type: match.parsedItem.type,
          title: match.parsedItem.title,
          status: match.updateFields.status || match.parsedItem.status,
          source_field: match.parsedItem.source_field,
          suggested_action: suggestedAction,
          existing_item_id: match.existingItem?.id || null,
          match_confidence: match.matchConfidence || 0,
          suggestion_reason: match.matchReason || null,
          suggested_description: match.updateFields.description || null,
          suggestion_status: 'pending',
          created_by: userId
        });

      if (suggestionError) {
        throw suggestionError;
      }

      suggestionCount++;
    } catch (itemError) {
      console.error(`❌ Erro ao criar sugestão para item "${match.parsedItem.title}":`, itemError);
    }
  }

  console.log(`✅ Check-in processado: ${suggestionCount} sugestões pendentes`);
  return suggestionCount;
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

    if (data?.kr_id) {
      const { data: krData } = await supabase
        .from('key_results')
        .select('okr_id')
        .eq('id', data.kr_id)
        .single();
      if (krData?.okr_id) {
        await updateOKRStatusFromActivity(krData.okr_id);
      }
    }

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
 * NOVO: Após salvar, cria sprint_items automaticamente a partir dos bullet points
 */
export async function createSprintCheckin(
  sprintId: string,
  checkinData: Partial<SprintCheckin>,
  sprintItems: any[],
  sprintScope: SprintScope = 'execucao',
  options?: { suggestionsMode?: 'sync' | 'async' }
): Promise<SprintCheckin | null> {
  try {
    const userId = await resolveUserId();
    
    if (!userId) throw new Error('Usuário não autenticado');

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
        // Campos de Execução
        achievements: checkinData.achievements || null,
        blockers: checkinData.blockers || null,
        decisions_taken: checkinData.decisions_taken || null,
        next_focus: checkinData.next_focus || null,
        // Campos de Governança
        learnings: checkinData.learnings || null,
        okr_misalignments: checkinData.okr_misalignments || null,
        keep_doing: checkinData.keep_doing || null,
        stop_doing: checkinData.stop_doing || null,
        adjust_doing: checkinData.adjust_doing || null,
        strategic_recommendations: checkinData.strategic_recommendations || null,
        identified_risks: checkinData.identified_risks || null,
        // Campos comuns
        health: checkinData.health,
        health_reason: checkinData.health_reason || null,
        notes: checkinData.notes || null,
        ...metrics,
        created_by: userId
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

    if (data && data.id) {
      const mode = options?.suggestionsMode || 'async';
      if (mode === 'sync') {
        try {
          await generateSuggestionsFromCheckin(data as SprintCheckin, sprintScope, userId);
        } catch (parserError) {
          console.error('❌ Erro ao processar items do check-in:', parserError);
        }
      } else {
        // Async (não bloquear UX): gerar sugestões em background
        void generateSuggestionsFromCheckin(data as SprintCheckin, sprintScope, userId).catch((parserError) => {
          console.error('❌ Erro ao processar items do check-in (async):', parserError);
        });
      }
    }

    return data;
  } catch (error: any) {
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
 * Listar sugestões de items da sprint (pendentes por padrão)
 */
export async function listSprintItemSuggestions(
  sprintId: string,
  status: 'pending' | 'accepted' | 'rejected' = 'pending'
): Promise<SprintItemSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_item_suggestions')
      .select('*')
      .eq('sprint_id', sprintId)
      .eq('suggestion_status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar sugestões de items:', error);
    return [];
  }
}

/**
 * Listar sugestões por check-in
 */
export async function listSprintItemSuggestionsByCheckin(
  checkinId: string,
  status: 'pending' | 'accepted' | 'rejected' = 'pending'
): Promise<SprintItemSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('sprint_item_suggestions')
      .select('*')
      .eq('checkin_id', checkinId)
      .eq('suggestion_status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar sugestões do check-in:', error);
    return [];
  }
}

/**
 * Aceitar sugestão: cria novo item ou atualiza item existente
 */
export async function acceptSprintItemSuggestion(
  suggestion: SprintItemSuggestion
): Promise<SprintItem | null> {
  try {
    let appliedItem: SprintItem | null = null;

    if (suggestion.suggested_action === 'update' && suggestion.existing_item_id) {
      appliedItem = await sprintService.updateSprintItem(suggestion.existing_item_id, {
        status: suggestion.status || undefined,
        description: suggestion.suggested_description || undefined,
        checkin_id: suggestion.checkin_id
      });
    } else {
      appliedItem = await sprintService.createSprintItem({
        sprint_id: suggestion.sprint_id,
        type: suggestion.type,
        title: suggestion.title,
        status: suggestion.status || undefined,
        description: suggestion.suggested_description || undefined,
        checkin_id: suggestion.checkin_id,
        responsible_user_id: null,
        due_date: null,
        okr_id: null,
        kr_id: null
      });
    }

    const { error } = await supabase
      .from('sprint_item_suggestions')
      .update({
        suggestion_status: 'accepted',
        applied_item_id: appliedItem?.id || null,
        decided_at: new Date().toISOString()
      })
      .eq('id', suggestion.id);

    if (error) throw error;
    return appliedItem;
  } catch (error) {
    console.error('Erro ao aceitar sugestão:', error);
    throw error;
  }
}

/**
 * Rejeitar sugestão
 */
export async function rejectSprintItemSuggestion(
  suggestionId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('sprint_item_suggestions')
      .update({
        suggestion_status: 'rejected',
        decided_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao rejeitar sugestão:', error);
    throw error;
  }
}

/**
 * Atualizar check-in existente
 */
export async function updateSprintCheckin(
  checkinId: string,
  updates: Partial<SprintCheckin>,
  options?: { regenerateSuggestions?: boolean; sprintScope?: SprintScope }
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

    if (options?.regenerateSuggestions && data?.id && data?.sprint_id) {
      try {
        const { error: deleteError } = await supabase
          .from('sprint_item_suggestions')
          .delete()
          .eq('checkin_id', data.id)
          .eq('suggestion_status', 'pending');

        if (deleteError) {
          console.warn('⚠️ Falha ao limpar sugestões pendentes anteriores:', deleteError);
        }

        const userId = await resolveUserId();
        if (!userId) {
          console.warn('⚠️ Usuário não identificado. Sugestões não serão recriadas.');
          return data;
        }

        const scope = options?.sprintScope || 'execucao';
        // Não bloquear UX: gerar sugestões em background
        void generateSuggestionsFromCheckin(data as SprintCheckin, scope, userId).catch((suggestionError) => {
          console.error('❌ Erro ao recriar sugestões do check-in (async):', suggestionError);
        });
      } catch (suggestionError) {
        console.error('❌ Erro ao recriar sugestões do check-in:', suggestionError);
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar check-in:', error);
    throw error;
  }
}

/**
 * Deletar check-in (apenas super admin)
 * IMPORTANTE: Ao deletar check-in, items vinculados terão checkin_id = null (ON DELETE SET NULL)
 */
export async function deleteSprintCheckin(checkinId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deletando check-in...');

    // Primeiro, buscar o check-in antes de deletar (para confirmar que existe)
    const { data: existingCheckin, error: selectError } = await supabase
      .from('sprint_checkins')
      .select('id, sprint_id, created_by')
      .eq('id', checkinId)
      .single();

    if (selectError) {
      console.error('Erro ao buscar check-in:', selectError);
      throw selectError;
    }

    if (!existingCheckin) {
      throw new Error('Check-in não encontrado');
    }

    // Tentar deletar
    const { data: deletedData, error: deleteError } = await supabase
      .from('sprint_checkins')
      .delete()
      .eq('id', checkinId)
      .select(); // Adicionar .select() para ver o que foi deletado

    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
      throw deleteError;
    }
    if (!deletedData || deletedData.length === 0) {
      throw new Error('Delete bloqueado por RLS ou registro não encontrado.');
    }

    // Verificar se realmente deletou (count deve ser 0 agora)
    const { count, error: countError } = await supabase
      .from('sprint_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('id', checkinId);

    console.log('✅ Check-in deletado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar check-in:', error);
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
          .select('*, okrs(objective, owner)')
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
      .select('*, okrs(objective, owner)')
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
