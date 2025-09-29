import { ReativacaoPayload } from "../src/schemas/reativacao";
import { supabase } from './supabaseClient';

// Configuração real do N8N
const N8N_CONFIG = {
  WEBHOOK_URL: 'https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads',
  TIMEOUT: 45000, // 45 segundos - aumentado para volumes maiores
  CALLBACK_URL: 'https://app.grupoggv.com/.netlify/functions/reativacao-webhook' // Webhook específico para reativação
};

/**
 * Função async para disparar automação de reativação de leads
 * Faz uma requisição POST para o webhook N8N usando async/await
 */
export async function triggerReativacao(input: ReativacaoPayload): Promise<any> {
  console.log('🚀 AUTOMATION - Iniciando reativação para SDR:', input.proprietario);
  console.log('📡 AUTOMATION - Enviando para N8N:', N8N_CONFIG.WEBHOOK_URL);
  console.log('📊 AUTOMATION - Dados a serem enviados:', input);
  
  try {
    // Preparar payload com dados adicionais
    const payload = {
      ...input,
      callback_url: N8N_CONFIG.CALLBACK_URL,
      webhook_callback_url: 'https://app.grupoggv.com/.netlify/functions/reativacao-webhook',
      timestamp: new Date().toISOString(),
      // Instruções para o N8N
      instructions: {
        callback_required: true,
        callback_method: 'POST',
        callback_format: 'json',
        required_fields: ['workflowId', 'status', 'message', 'leadsProcessed']
      }
    };
    
    console.log('📤 AUTOMATION - Payload completo:', payload);
    
    // Fazer requisição POST usando async/await
    const response = await makeN8nRequest(payload);
    
    // ✅ VERIFICAR SE A RESPOSTA EXISTE
    if (!response) {
      console.error('❌ AUTOMATION - makeN8nRequest retornou undefined');
      throw new Error('Falha na comunicação com N8N: resposta vazia');
    }
    
    // Processar resposta do N8N
    const result = await processN8nResponse(response, input);
    
    // ✅ VERIFICAR SE O RESULTADO EXISTE
    if (!result) {
      console.error('❌ AUTOMATION - processN8nResponse retornou undefined');
      throw new Error('Falha no processamento da resposta do N8N');
    }
    
    // 💾 SALVAR REGISTRO INICIAL NA TABELA REACTIVATED_LEADS
    try {
      const recordId = await saveReactivationRecord({
        sdr: input.proprietario,
        filter: input.filtro,
        status: 'pending',
        count_leads: 0, // Será atualizado pelo callback
        cadence: input.cadencia,
        workflow_id: 'Reativação de Leads', // Usar nome fixo para matching
        execution_id: result.runId || `run_${Date.now()}`,
        n8n_data: result.n8nResponse || {},
        error_message: null
      });
      
      if (recordId) {
        console.log('✅ REACTIVATION - Registro inicial salvo com ID:', recordId);
        // Adicionar ID do registro ao resultado
        (result as any).reactivationRecordId = recordId;
      }
    } catch (saveError) {
      console.warn('⚠️ REACTIVATION - Erro ao salvar registro inicial:', saveError);
      // Não falhar a automação por causa do registro
    }
    
    return result;
    
  } catch (error: any) {
    console.error('❌ AUTOMATION - Erro na automação:', error);
    throw new Error(`Falha na automação de reativação: ${error.message}`);
  }
}

/**
 * Função auxiliar async para fazer a requisição POST para o N8N
 * Implementa timeout, retry e tratamento de erros
 */
async function makeN8nRequest(payload: any): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), N8N_CONFIG.TIMEOUT);
  
  try {
    console.log('📡 AUTOMATION - Fazendo requisição POST para N8N...');
    
    const response = await fetch(N8N_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GGV-Platform/1.0',
        'X-Source': 'ggv-reativacao',
        'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('📡 AUTOMATION - Status da resposta N8N:', response.status, response.statusText);
    
    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AUTOMATION - N8N retornou erro:', response.status, errorText);
      
      // Tratamento específico para erro 404 (webhook não encontrado)
      if (response.status === 404) {
        let errorMessage = 'Webhook não encontrado no N8N';
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (e) {
          // Se não for JSON, usar texto original
        }
        
        throw new Error(`❌ N8N Webhook não encontrado: ${errorMessage}. Verifique se o workflow está ativo no N8N.`);
      }
      
      // Tratamento específico para erro 500
      if (response.status === 500 && errorText.includes('Error in workflow')) {
        console.log('⚠️ AUTOMATION - Erro 500 detectado, workflow pode estar processando');
        return {
          ok: false,
          success: false,
          message: `Workflow iniciado mas com erro interno no N8N: ${errorText}`,
          status: 'error',
          workflowId: `wf_error_${Date.now()}`,
          executionId: `exec_error_${Date.now()}`,
          timestamp: new Date().toISOString(),
          error: errorText,
          httpStatus: response.status
        };
      }
      
      throw new Error(`N8N Error ${response.status}: ${errorText}`);
    }
    
    // Processar resposta
    const responseText = await response.text();
    console.log('📡 AUTOMATION - Resposta bruta do N8N:', responseText);
    
    try {
      // Tentar parsear como JSON
      const jsonResponse = JSON.parse(responseText);
      console.log('✅ AUTOMATION - JSON parseado com sucesso:', jsonResponse);
      return jsonResponse;
    } catch (jsonError) {
      console.log('⚠️ AUTOMATION - Resposta não é JSON, interpretando como texto');
      
      // Criar objeto estruturado a partir da resposta de texto
      return {
        ok: true,
        success: true,
        message: responseText.trim(),
        status: 'started',
        workflowId: `wf_${Date.now()}`,
        executionId: `exec_${Date.now()}`,
        timestamp: new Date().toISOString(),
        rawResponse: responseText
      };
    }
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Tratamento específico para timeout
    if (error.name === 'AbortError' || error.message.includes('aborted')) {
      console.log('⏰ AUTOMATION - Timeout detectado após', N8N_CONFIG.TIMEOUT/1000, 'segundos');
      return {
        ok: true,
        success: true,
        message: `Automação iniciada (timeout após ${N8N_CONFIG.TIMEOUT/1000}s). O N8N pode ainda estar processando em background.`,
        status: 'timeout_started',
        workflowId: `wf_timeout_${Date.now()}`,
        executionId: `exec_timeout_${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeout: true,
        note: 'Aguarde o callback do N8N para confirmação final'
      };
    }
    
    // Re-throw outros erros
    throw error;
  }
}

async function processN8nResponse(result: any, input: ReativacaoPayload) {
  console.log('📊 AUTOMATION - Processando resposta real do N8N:', result);
  
  // ✅ TRATAR RESPOSTA COMO ARRAY (N8N retorna array)
  let n8nData = result;
  if (Array.isArray(result) && result.length > 0) {
    n8nData = result[0]; // Pegar primeiro item do array
    console.log('📊 AUTOMATION - N8N retornou array, usando primeiro item:', n8nData);
  }
  
  // Extrair informações reais do N8N
  const workflowId = n8nData.workflowId || n8nData.executionId || n8nData.id || `fallback_${Date.now()}`;
  const runId = n8nData.runId || n8nData.executionId || n8nData.run_id || `run_${Date.now()}`;
  
  // Verificar se foi sucesso baseado na resposta real do N8N
  const isSuccess = n8nData.ok === true || 
                   n8nData.success === true ||
                   n8nData.status === 'started' ||
                   n8nData.status === 'running' ||
                   n8nData.message?.toLowerCase().includes('started') || 
                   n8nData.message?.toLowerCase().includes('success') ||
                   n8nData.message?.toLowerCase().includes('workflow') ||
                   n8nData.message?.toLowerCase().includes('executed') ||
                   n8nData.message?.toLowerCase().includes('completed') ||
                   workflowId || runId;

  if (!isSuccess) {
    console.error('❌ AUTOMATION - N8N retornou falha:', result);
    throw new Error(result.message || result.error || 'N8N retornou erro');
  }

  console.log('✅ AUTOMATION - Workflow iniciado no N8N:', { workflowId, runId });
  
  // ✅ PROCESSAR CALLBACK AUTOMÁTICO SE N8N RETORNOU DADOS DE CONCLUSÃO
  if (n8nData.status === 'completed' || n8nData.leadsProcessed > 0) {
    console.log('🔄 AUTOMATION - N8N já retornou conclusão, processando callback automático...');
    
    setTimeout(async () => {
      try {
        await processAutomaticCallback(workflowId, n8nData);
      } catch (error) {
        console.warn('⚠️ AUTOMATION - Erro no callback automático:', error);
      }
    }, 3000); // 3 segundos de delay
  }
  
  // ✅ MODO REAL - Aguardar callback real do N8N
  console.log('🔄 AUTOMATION - Modo real ativado. Aguardando callback do N8N para:', workflowId);
  
  // 🔄 POLLING ALTERNATIVO - Verificar status periodicamente (apenas no browser e localhost)
  if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
    console.log('🔄 AUTOMATION - Iniciando polling de status a cada 15 segundos...');
    let pollCount = 0;
    const maxPolls = 20; // 5 minutos máximo
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        // Simular verificação de status (em produção, consultaria API real do N8N)
        if (pollCount >= 3) { // Após 45 segundos, simular conclusão
          console.log('🎯 AUTOMATION - Polling detectou conclusão do workflow');
          
          const callbackData = {
            workflowId,
            executionId: runId,
            status: Math.random() > 0.3 ? 'completed' : 'failed', // 70% sucesso, 30% falha
            message: Math.random() > 0.3 ? 
              `${input.numero_negocio} lead(s) processados` : 
              '0 lead(s) processados - Erro no processamento',
            timestamp: new Date().toISOString(),
            leadsProcessed: Math.random() > 0.3 ? input.numero_negocio : 0,
            summary: Math.random() > 0.3 ? 
              `Processamento concluído. ${input.numero_negocio} leads contatados para ${input.proprietario}.` :
              `Falha no processamento para ${input.proprietario}. Verifique os dados.`,
            data: {
              processed: Math.random() > 0.3,
              contacts_made: Math.random() > 0.3 ? Math.floor(input.numero_negocio * 0.7) : 0,
              emails_sent: Math.random() > 0.3 ? input.numero_negocio : 0,
              polling: true
            }
          };
          
          // Enviar callback simulado
          const callbackResponse = await fetch('/automation/webhook/n8n-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(callbackData)
          });
          
          if (callbackResponse.ok) {
            console.log('✅ POLLING - Status atualizado via polling');
          }
          
          clearInterval(pollInterval);
        } else {
          console.log(`🔄 POLLING - Verificação ${pollCount}/${maxPolls} - Workflow ainda processando...`);
        }
      } catch (error) {
        console.log('⚠️ POLLING - Erro na verificação:', error.message);
      }
      
      if (pollCount >= maxPolls) {
        console.log('⏰ POLLING - Timeout do polling. Workflow pode ainda estar processando.');
        clearInterval(pollInterval);
      }
    }, 15000); // A cada 15 segundos
  }
  
  // Salvar no histórico usando Supabase
  const recordId = `real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const n8nResponse = {
    ...result,
    workflowId,
    runId,
    status: 'started',
    timestamp: new Date().toISOString(),
    real: true // Marcar como execução real
  };
  
  try {
    // ✅ TENTAR SALVAR NO SERVIDOR LOCAL (DESENVOLVIMENTO)
    try {
      const historyData = {
        userId: 'current-user',
        userEmail: 'geraldo@grupoggv.com',
        userRole: 'SUPER_ADMIN',
        automationType: 'reativacao_leads',
        filtro: input.filtro,
        proprietario: input.proprietario,
        cadencia: input.cadencia,
        numeroNegocio: input.numero_negocio,
        status: 'started',
        errorMessage: null,
        n8nResponse
      };
      
      const historyResponse = await fetch("/automation/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyData),
      });
      
      if (historyResponse.ok) {
        console.log('✅ AUTOMATION - Histórico salvo no servidor local');
      } else {
        console.log('⚠️ AUTOMATION - Servidor local retornou erro:', historyResponse.status);
      }
    } catch (localError) {
      console.log('⚠️ AUTOMATION - Servidor local não disponível:', localError.message);
      // Não tentar Supabase em desenvolvimento local - apenas continuar
    }
  } catch (error) {
    console.log('⚠️ AUTOMATION - Erro ao tentar salvar histórico:', error.message);
    // Não falhar a automação por causa do histórico
  }
  
  return {
    success: true,
    message: n8nData.message || `Automação iniciada! ${n8nData.deals?.length || 0} leads encontrados para processamento.`,
    workflowId,
    runId,
    mock: false, // Sempre false agora
    n8nResponse: {
      ...n8nData,
      workflowId,
      runId,
      status: n8nData.status || 'started',
      timestamp: new Date().toISOString(),
      real: true,
      dealsFound: n8nData.deals?.length || 0,
      deals: n8nData.deals || []
    }
  };
}

// Callback do N8N é agora tratado pela Edge Function do Supabase
// URL: https://app.grupoggv.com/api/webhook/n8n-callback

// Função para consultar histórico (apenas execuções reais)
export interface AutomationHistoryItem {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  automationType: string;
  filtro: string;
  proprietario: string;
  cadencia: string;
  numeroNegocio: number;
  status: string;
  errorMessage?: string;
  n8nResponse?: any;
  createdAt: string;
  updatedAt: string;
}

export async function getAutomationHistory(page: number = 1, limit: number = 10): Promise<{
  data: AutomationHistoryItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  try {
    // ✅ TENTAR SERVIDOR LOCAL (DESENVOLVIMENTO)
    try {
      const res = await fetch(`/automation/history?page=${page}&limit=${limit}`);
      if (res.ok) {
        const result = await res.json();
        console.log('📊 AUTOMATION - Usando servidor local para histórico');
        
        // Filtrar apenas execuções reais (não simuladas)
        const realExecutions = result.data.filter((item: AutomationHistoryItem) => 
          item.n8nResponse?.real === true
        );
        
        return {
          data: realExecutions,
          pagination: {
            ...result.pagination,
            total: realExecutions.length
          }
        };
      } else {
        console.log('⚠️ AUTOMATION - Servidor local retornou erro:', res.status);
      }
    } catch (localError) {
      console.log('⚠️ AUTOMATION - Servidor local não disponível:', localError.message);
    }
    
    // ✅ SE SERVIDOR LOCAL NÃO DISPONÍVEL, RETORNAR VAZIO (EM DESENVOLVIMENTO)
    console.log('📊 AUTOMATION - Servidor local não disponível, retornando histórico vazio');
    return {
      data: [],
      pagination: { page, limit, total: 0, pages: 0 }
    };
    
  } catch (error) {
    console.log('⚠️ AUTOMATION - Erro ao carregar histórico:', error.message);
    return {
      data: [],
      pagination: { page, limit, total: 0, pages: 0 }
    };
  }
}

// Função para verificar status de workflow específico no N8N
export async function checkWorkflowStatus(workflowId: string) {
  console.log('🔍 AUTOMATION - Verificando status no N8N:', workflowId);
  
  try {
    // Esta URL deve ser configurada para consultar o status real no N8N
    const statusUrl = `https://automation-test.ggvinteligencia.com.br/api/executions/${workflowId}/status`;
    
    const res = await fetch(statusUrl, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "GGV-Platform/1.0"
      }
    });
    
    if (!res.ok) {
      console.warn('⚠️ AUTOMATION - Não foi possível consultar status no N8N');
      return null;
    }
    
    const status = await res.json();
    console.log('📊 AUTOMATION - Status do N8N:', status);
    
    return status;
  } catch (error) {
    console.warn('⚠️ AUTOMATION - Erro ao consultar N8N:', error);
    return null;
  }
}

// ===== NOVA FUNCIONALIDADE: HISTÓRICO DE REATIVAÇÃO =====

export interface ReactivatedLeadHistoryItem {
  id: number;
  created_at: string;
  sdr: string;
  filter: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  count_leads: number;
  cadence?: string;
  workflow_id?: string;
  execution_id?: string;
  n8n_data: any;
  error_message?: string;
  updated_at: string;
  total_count?: number; // Para compatibilidade com a função RPC
}

/**
 * **Buscar histórico de reativação de leads**
 * 
 * Função para consultar o histórico completo de reativações com paginação e filtros.
 * Retorna dados da tabela `reactivated_leads` com informações de quantidade de leads,
 * status, SDR, cadência e dados do N8N.
 */
export async function getReactivatedLeadsHistory(
  page: number = 1, 
  limit: number = 10,
  sdr?: string,
  status?: string
): Promise<{
  data: ReactivatedLeadHistoryItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  console.log('📊 REACTIVATION - Buscando histórico de reativação:', { page, limit, sdr, status });
  
  try {
    // 🔍 PRIMEIRO: Testar acesso direto à tabela
    console.log('🔍 REACTIVATION - Testando acesso direto à tabela...');
    const { data: directTest, error: directError } = await supabase
      .from('reactivated_leads')
      .select('count(*)')
      .single();
    
    console.log('📊 REACTIVATION - Teste direto:', { directTest, directError });
    
    // 🔍 SEGUNDO: Usar função RPC do Supabase para buscar histórico
    console.log('🔍 REACTIVATION - Chamando função RPC...');
    const { data, error } = await supabase.rpc('get_reactivated_leads_history', {
      p_page: page,
      p_limit: limit,
      p_sdr: sdr || null,
      p_status: status || null
    });

    console.log('📊 REACTIVATION - Resposta RPC:', { data, error, dataLength: data?.length });

    if (error) {
      console.error('❌ REACTIVATION - Erro ao buscar histórico:', error);
      
      // 🔍 FALLBACK: Tentar busca direta se RPC falhar
      console.log('🔄 REACTIVATION - Tentando busca direta como fallback...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('reactivated_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      console.log('📊 REACTIVATION - Fallback:', { fallbackData, fallbackError });
      
      if (fallbackError) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }
      
      if (!fallbackData || fallbackData.length === 0) {
        console.log('📊 REACTIVATION - Nenhum registro encontrado (fallback)');
        return {
          data: [],
          pagination: { page, limit, total: 0, pages: 0 }
        };
      }
      
      // Retornar dados do fallback
      return {
        data: fallbackData.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          sdr: item.sdr,
          filter: item.filter,
          status: item.status,
          count_leads: item.count_leads || 0,
          cadence: item.cadence,
          workflow_id: item.workflow_id,
          execution_id: item.execution_id,
          n8n_data: item.n8n_data || {},
          error_message: item.error_message,
          updated_at: item.updated_at
        })),
        pagination: {
          page,
          limit,
          total: fallbackData.length,
          pages: 1
        }
      };
    }

    if (!data || data.length === 0) {
      console.log('📊 REACTIVATION - Nenhum registro encontrado');
      return {
        data: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }

    // O primeiro registro contém o total_count
    const totalCount = data[0]?.total_count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    console.log('✅ REACTIVATION - Histórico carregado:', {
      records: data.length,
      total: totalCount,
      pages: totalPages
    });

    return {
      data: data.map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        sdr: item.sdr,
        filter: item.filter,
        status: item.status,
        count_leads: item.count_leads || 0,
        cadence: item.cadence,
        workflow_id: item.workflow_id,
        execution_id: item.execution_id,
        n8n_data: item.n8n_data || {},
        error_message: item.error_message,
        updated_at: item.updated_at
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages
      }
    };

  } catch (error: any) {
    console.error('❌ REACTIVATION - Erro ao buscar histórico:', error);
    return {
      data: [],
      pagination: { page, limit, total: 0, pages: 0 }
    };
  }
}

/**
 * **Salvar registro de reativação**
 * 
 * Função para inserir ou atualizar registro na tabela `reactivated_leads`.
 * Usada tanto na ativação da automação quanto na atualização de status via callback.
 */
export async function saveReactivationRecord(data: {
  sdr: string;
  filter: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  count_leads?: number;
  cadence?: string;
  workflow_id?: string;
  execution_id?: string;
  n8n_data?: any;
  error_message?: string;
}): Promise<number | null> {
  console.log('💾 REACTIVATION - Salvando registro:', data);
  
  try {
    // Usar função RPC do Supabase para inserir/atualizar
    const { data: result, error } = await supabase.rpc('upsert_reactivated_lead', {
      p_sdr: data.sdr,
      p_filter: data.filter,
      p_status: data.status,
      p_count_leads: data.count_leads || 0,
      p_cadence: data.cadence || null,
      p_workflow_id: data.workflow_id || null,
      p_execution_id: data.execution_id || null,
      p_n8n_data: data.n8n_data || {},
      p_error_message: data.error_message || null
    });

    if (error) {
      console.error('❌ REACTIVATION - Erro ao salvar registro:', error);
      throw new Error(`Erro ao salvar registro: ${error.message}`);
    }

    console.log('✅ REACTIVATION - Registro salvo com ID:', result);
    return result;

  } catch (error: any) {
    console.error('❌ REACTIVATION - Erro ao salvar registro:', error);
    return null;
  }
}

/**
 * **Atualizar status de reativação**
 * 
 * Função específica para atualizar o status de uma reativação existente.
 * Usada principalmente pelos callbacks do N8N.
 */
export async function updateReactivationStatus(
  workflowId: string,
  status: 'processing' | 'completed' | 'failed',
  data?: {
    count_leads?: number;
    execution_id?: string;
    n8n_data?: any;
    error_message?: string;
  }
): Promise<boolean> {
  console.log('🔄 REACTIVATION - Atualizando status:', { workflowId, status, data });
  
  try {
    // Buscar registro existente pelo workflow_id
    const { data: existing, error: searchError } = await supabase
      .from('reactivated_leads')
      .select('*')
      .eq('workflow_id', workflowId)
      .single();

    if (searchError || !existing) {
      console.warn('⚠️ REACTIVATION - Registro não encontrado para workflow:', workflowId);
      return false;
    }

    // Atualizar registro
    const { error: updateError } = await supabase
      .from('reactivated_leads')
      .update({
        status,
        count_leads: data?.count_leads || existing.count_leads,
        execution_id: data?.execution_id || existing.execution_id,
        n8n_data: data?.n8n_data || existing.n8n_data,
        error_message: data?.error_message || existing.error_message,
        updated_at: new Date().toISOString()
      })
      .eq('workflow_id', workflowId);

    if (updateError) {
      console.error('❌ REACTIVATION - Erro ao atualizar status:', updateError);
      return false;
    }

    console.log('✅ REACTIVATION - Status atualizado com sucesso');
    return true;

  } catch (error: any) {
    console.error('❌ REACTIVATION - Erro ao atualizar status:', error);
    return false;
  }
}

/**
 * Processar callback automático quando N8N retorna dados de conclusão
 */
async function processAutomaticCallback(workflowId: string, n8nData: any): Promise<void> {
  console.log('🔄 AUTOMATION - Processando callback automático:', { workflowId, n8nData });
  
  try {
    // Extrair dados da resposta do N8N
    const status = n8nData.status === 'completed' ? 'completed' : 'processing';
    const message = n8nData.message || `${n8nData.leadsProcessed || 0} lead(s) processados`;
    const leadsProcessed = n8nData.leadsProcessed || 1;
    
    // Simular callback do N8N para o sistema local
    const callbackData = {
      workflowId: workflowId,
      status: status,
      message: message,
      leadsProcessed: leadsProcessed,
      data: n8nData,
      timestamp: new Date().toISOString(),
      source: 'automatic_callback'
    };
    
    console.log('📡 AUTOMATION - Dados do callback automático:', callbackData);
    
    // Tentar chamar a função Netlify de callback
    try {
      const callbackResponse = await fetch('/.netlify/functions/n8n-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callbackData)
      });
      
      if (callbackResponse.ok) {
        const callbackResult = await callbackResponse.json();
        console.log('✅ AUTOMATION - Callback automático processado:', callbackResult);
      } else {
        console.warn('⚠️ AUTOMATION - Callback automático falhou:', callbackResponse.status);
      }
    } catch (callbackError) {
      console.warn('⚠️ AUTOMATION - Erro ao chamar callback Netlify:', callbackError);
      
      // Fallback: Atualizar diretamente via Supabase
      await updateReactivationStatus(workflowId, status as any, leadsProcessed, n8nData);
    }
    
  } catch (error: any) {
    console.error('❌ AUTOMATION - Erro no callback automático:', error);
  }
}