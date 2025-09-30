import { supabase } from './supabaseClient';

/**
 * Serviço de polling para verificar se N8N terminou processamento
 * Solução temporária até configurar callback adequado no N8N
 */

const N8N_RESULTS_URL = 'https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads';

interface N8NResult {
  id: number;
  created_at: string;
  sdr: string;
  filter: string;
  status: string;
  count_leads: number;
  cadence: string;
  workflow_id: string | null;
  execution_id: string | null;
  n8n_data: any;
  error_message: string | null;
  updated_at: string;
}

/**
 * Buscar resultados do N8N via API
 */
async function fetchN8NResults(): Promise<N8NResult[]> {
  try {
    console.log('📡 N8N POLLING - Buscando resultados do N8N...');
    
    const response = await fetch(N8N_RESULTS_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GGV-Platform-Polling/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ N8N POLLING - Resultados obtidos:', data?.length || 0);
    
    return Array.isArray(data) ? data : [];

  } catch (error: any) {
    console.error('❌ N8N POLLING - Erro ao buscar resultados:', error);
    return [];
  }
}

/**
 * Verificar se há novos completados para atualizar pendentes
 */
export async function checkAndUpdateCompletedReactivations(): Promise<{
  updated: number;
  results: any[];
}> {
  console.log('🔄 N8N POLLING - Verificando reativações completadas...');
  
  try {
    // 1. Buscar registros pendentes locais (últimas 2 horas)
    const { data: pendingRecords, error: pendingError } = await supabase
      .from('reactivated_leads')
      .select('*')
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (pendingError || !pendingRecords || pendingRecords.length === 0) {
      console.log('📊 N8N POLLING - Nenhum registro pendente encontrado');
      return { updated: 0, results: [] };
    }

    console.log('📊 N8N POLLING - Registros pendentes encontrados:', pendingRecords.length);

    // 2. Buscar resultados do N8N
    const n8nResults = await fetchN8NResults();
    
    if (n8nResults.length === 0) {
      console.log('📊 N8N POLLING - Nenhum resultado do N8N encontrado');
      return { updated: 0, results: [] };
    }

    // 3. Verificar quais pendentes têm correspondência completed no N8N
    const updates = [];
    
    for (const pending of pendingRecords) {
      // Procurar por resultado correspondente (completed, failed, ou mais recente)
      const matchingResult = n8nResults.find(result => 
        result.sdr === pending.sdr &&
        result.filter === pending.filter &&
        new Date(result.updated_at) > new Date(pending.created_at) && // N8N updated depois do pending criado
        (result.status === 'completed' || result.status === 'failed' || result.count_leads > 0)
      );

      // Se não encontrou match exato, verificar timeout (pendente há mais de 5 minutos)
      const pendingMinutes = (Date.now() - new Date(pending.created_at).getTime()) / (1000 * 60);
      const isTimedOut = pendingMinutes > 5;

      if (matchingResult) {
        console.log('🎯 N8N POLLING - Match encontrado:', {
          pending: { id: pending.id, sdr: pending.sdr, created_at: pending.created_at },
          n8n: { count_leads: matchingResult.count_leads, updated_at: matchingResult.updated_at }
        });

        // Atualizar registro pendente
        const { data: updatedRecord, error: updateError } = await supabase
          .from('reactivated_leads')
          .update({
            status: 'completed',
            count_leads: matchingResult.count_leads,
            workflow_id: 'Reativação de Leads',
            execution_id: `polling_${Date.now()}`,
            n8n_data: {
              status: 'completed',
              message: `${matchingResult.count_leads} lead(s) processados`,
              leadsProcessed: matchingResult.count_leads,
              webhookReceived: false,
              pollingReceived: true,
              pollingTime: new Date().toISOString(),
              n8nUpdatedAt: matchingResult.updated_at,
              source: 'n8n_polling_service'
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', pending.id)
          .select()
          .single();

        if (!updateError && updatedRecord) {
          console.log('✅ N8N POLLING - Registro atualizado:', {
            id: updatedRecord.id,
            sdr: updatedRecord.sdr,
            status: matchingResult.status,
            count_leads: matchingResult.count_leads
          });
          
          updates.push({
            id: updatedRecord.id,
            sdr: updatedRecord.sdr,
            old_status: 'pending',
            new_status: matchingResult.status,
            old_count: pending.count_leads,
            new_count: matchingResult.count_leads
          });
        } else {
          console.error('❌ N8N POLLING - Erro ao atualizar:', updateError);
        }
      } else if (isTimedOut) {
        // Marcar como failed se passou do timeout e não há resultado no N8N
        console.log('⏰ N8N POLLING - Timeout detectado para:', {
          id: pending.id,
          sdr: pending.sdr,
          minutes: Math.round(pendingMinutes)
        });

        const { error: timeoutError } = await supabase
          .from('reactivated_leads')
          .update({
            status: 'failed',
            error_message: `Timeout - sem resposta do N8N após ${Math.round(pendingMinutes)} minutos`,
            updated_at: new Date().toISOString()
          })
          .eq('id', pending.id);

        if (!timeoutError) {
          updates.push({
            id: pending.id,
            sdr: pending.sdr,
            old_status: 'pending',
            new_status: 'failed',
            old_count: pending.count_leads,
            new_count: pending.count_leads
          });
        }
      }
    }

    console.log('✅ N8N POLLING - Verificação concluída:', {
      checked: pendingRecords.length,
      updated: updates.length
    });

    return { updated: updates.length, results: updates };

  } catch (error: any) {
    console.error('❌ N8N POLLING - Erro na verificação:', error);
    return { updated: 0, results: [] };
  }
}

/**
 * Iniciar polling automático (para usar em componentes)
 */
export function startAutomationPolling(intervalMs: number = 30000): () => void {
  console.log('🔄 N8N POLLING - Iniciando polling automático a cada', intervalMs / 1000, 'segundos');
  
  const interval = setInterval(async () => {
    try {
      const result = await checkAndUpdateCompletedReactivations();
      if (result.updated > 0) {
        console.log('🎉 N8N POLLING - Atualizações automáticas:', result.updated);
        // Disparar evento para o frontend recarregar
        window.dispatchEvent(new CustomEvent('automation-status-updated', { 
          detail: result 
        }));
      }
    } catch (error) {
      console.warn('⚠️ N8N POLLING - Erro no polling:', error);
    }
  }, intervalMs);

  // Retornar função para parar o polling
  return () => {
    console.log('🛑 N8N POLLING - Parando polling automático');
    clearInterval(interval);
  };
}
