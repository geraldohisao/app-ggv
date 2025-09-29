import { supabase } from './supabaseClient';

// Tipos para o sistema de fila de automação
export interface AutomationPermission {
  can_execute: boolean;
  message: string;
  last_execution: string | null;
  status: string | null;
}

export interface AutomationStart {
  success: boolean;
  record_id: number | null;
  message: string;
}

/**
 * Verificar se o usuário pode executar uma automação
 */
export async function canUserExecuteAutomation(sdr: string): Promise<AutomationPermission> {
  console.log('🔍 QUEUE - Verificando permissão para:', sdr);
  
  try {
    const { data, error } = await supabase.rpc('can_user_execute_automation', {
      p_sdr: sdr
    });

    if (error) {
      console.error('❌ QUEUE - Erro ao verificar permissão:', error);
      throw new Error(`Erro ao verificar permissão: ${error.message}`);
    }

    const result = data?.[0] || {
      can_execute: false,
      message: 'Erro ao verificar permissão',
      last_execution: null,
      status: null
    };

    console.log('✅ QUEUE - Permissão verificada:', result);
    return result;

  } catch (error: any) {
    console.error('❌ QUEUE - Erro na verificação:', error);
    return {
      can_execute: false,
      message: 'Erro interno ao verificar permissão',
      last_execution: null,
      status: null
    };
  }
}

/**
 * Iniciar automação com controle de fila
 */
export async function startAutomationWithQueue(
  sdr: string,
  filter: string,
  cadence: string,
  workflowId?: string
): Promise<AutomationStart> {
  console.log('🚀 QUEUE - Iniciando automação com controle:', { sdr, filter, cadence });
  
  try {
    const { data, error } = await supabase.rpc('start_automation_with_lock', {
      p_sdr: sdr,
      p_filter: filter,
      p_cadence: cadence,
      p_workflow_id: workflowId || null
    });

    if (error) {
      console.error('❌ QUEUE - Erro ao iniciar automação:', error);
      throw new Error(`Erro ao iniciar automação: ${error.message}`);
    }

    const result = data?.[0] || {
      success: false,
      record_id: null,
      message: 'Erro ao iniciar automação'
    };

    console.log('✅ QUEUE - Automação iniciada:', result);
    return result;

  } catch (error: any) {
    console.error('❌ QUEUE - Erro no início:', error);
    return {
      success: false,
      record_id: null,
      message: 'Erro interno ao iniciar automação'
    };
  }
}

/**
 * Finalizar automação
 */
export async function completeAutomation(
  recordId: number,
  countLeads: number = 1,
  executionId?: string,
  n8nData?: any
): Promise<boolean> {
  console.log('✅ QUEUE - Finalizando automação:', { recordId, countLeads, executionId });
  
  try {
    const { data, error } = await supabase.rpc('complete_automation', {
      p_record_id: recordId,
      p_count_leads: countLeads,
      p_execution_id: executionId || null,
      p_n8n_data: n8nData || {}
    });

    if (error) {
      console.error('❌ QUEUE - Erro ao finalizar automação:', error);
      return false;
    }

    console.log('✅ QUEUE - Automação finalizada:', data);
    return data === true;

  } catch (error: any) {
    console.error('❌ QUEUE - Erro na finalização:', error);
    return false;
  }
}

/**
 * Limpar automações órfãs
 */
export async function cleanupOrphanedAutomations(): Promise<number> {
  console.log('🧹 QUEUE - Limpando automações órfãs...');
  
  try {
    const { data, error } = await supabase.rpc('cleanup_orphaned_automations');

    if (error) {
      console.error('❌ QUEUE - Erro na limpeza:', error);
      return 0;
    }

    const cleanedCount = data || 0;
    console.log('✅ QUEUE - Automações limpas:', cleanedCount);
    return cleanedCount;

  } catch (error: any) {
    console.error('❌ QUEUE - Erro na limpeza:', error);
    return 0;
  }
}

/**
 * Verificar se há automação em progresso
 */
export async function checkAutomationInProgress(): Promise<boolean> {
  console.log('🔍 QUEUE - Verificando automações em progresso...');
  
  try {
    const { data, error } = await supabase.rpc('check_automation_in_progress');

    if (error) {
      console.error('❌ QUEUE - Erro ao verificar progresso:', error);
      return false;
    }

    const inProgress = data === true;
    console.log('✅ QUEUE - Automação em progresso:', inProgress);
    return inProgress;

  } catch (error: any) {
    console.error('❌ QUEUE - Erro na verificação:', error);
    return false;
  }
}
