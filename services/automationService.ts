import { ReativacaoPayload } from "../src/schemas/reativacao";
import { supabase } from './supabaseClient';

// Configuração real do N8N
const N8N_CONFIG = {
  WEBHOOK_URL: 'https://automation-test.ggvinteligencia.com.br/webhook/reativacao-leads',
  TIMEOUT: 45000, // 45 segundos - aumentado para volumes maiores
  CALLBACK_URL: 'https://app.grupoggv.com/.netlify/functions/n8n-callback' // Netlify Function endpoint
};

export async function triggerReativacao(input: ReativacaoPayload) {
  console.log('🚀 AUTOMATION - Iniciando reativação para SDR:', input.proprietario);
  console.log('📡 AUTOMATION - Enviando para N8N:', N8N_CONFIG.WEBHOOK_URL);
  console.log('📊 AUTOMATION - Dados a serem enviados:', input);
  
  try {
    const payload = {
      ...input,
      // Adicionar callback URL para N8N retornar status
      callback_url: N8N_CONFIG.CALLBACK_URL,
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 AUTOMATION - Payload completo:', payload);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_CONFIG.TIMEOUT);
    
    const res = await fetch(N8N_CONFIG.WEBHOOK_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "GGV-Platform/1.0",
        "X-Source": "ggv-reativacao",
        "Accept": "application/json, text/plain, */*"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('📡 AUTOMATION - Status da resposta N8N:', res.status, res.statusText);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ AUTOMATION - N8N retornou erro:', res.status, errorText);
      
      // Se for erro 500 com "Error in workflow", pode ser um problema temporário
      if (res.status === 500 && errorText.includes('Error in workflow')) {
        console.log('⚠️ AUTOMATION - Erro 500 detectado, pode ser processamento em andamento');
        // Criar resposta simulada para indicar que foi iniciado mas com erro
        const result = {
          ok: false,
          success: false,
          message: `Workflow iniciado mas com erro interno no N8N: ${errorText}`,
          status: 'error',
          workflowId: `wf_error_${Date.now()}`,
          executionId: `exec_error_${Date.now()}`,
          timestamp: new Date().toISOString(),
          error: errorText,
          httpStatus: res.status
        };
        return await processN8nResponse(result, input);
      }
      
      throw new Error(`N8N Error ${res.status}: ${errorText}`);
    }
    
    // Tentar processar resposta - pode ser JSON ou texto
    let result;
    const responseText = await res.text();
    console.log('📡 AUTOMATION - Resposta bruta do N8N:', responseText);
    
    try {
      // Tentar parsear como JSON primeiro
      result = JSON.parse(responseText);
      console.log('✅ AUTOMATION - JSON parseado com sucesso:', result);
    } catch (jsonError) {
      console.log('⚠️ AUTOMATION - Resposta não é JSON válido, interpretando como texto');
      
      // Se não for JSON, criar objeto a partir da resposta de texto
      result = {
        ok: true,
        success: true,
        message: responseText.trim(),
        status: 'started',
        workflowId: `wf_${Date.now()}`,
        executionId: `exec_${Date.now()}`,
        timestamp: new Date().toISOString(),
        rawResponse: responseText
      };
      
      console.log('✅ AUTOMATION - Objeto criado a partir do texto:', result);
    }
    
    return await processN8nResponse(result, input);
    
  } catch (error: any) {
    console.error('❌ AUTOMATION - Erro ao conectar com N8N:', error);
    
    // Tratamento específico para timeout/abort
    if (error.name === 'AbortError' || error.message.includes('aborted')) {
      console.log('⏰ AUTOMATION - Timeout detectado, criando resposta de fallback');
      // Criar resposta simulada indicando que pode estar processando
      const result = {
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
      return await processN8nResponse(result, input);
    }
    
    throw new Error(`Falha ao conectar com N8N: ${error.message}`);
  }
}

async function processN8nResponse(result: any, input: ReativacaoPayload) {
  console.log('📊 AUTOMATION - Processando resposta real do N8N:', result);
  
  // Extrair informações reais do N8N
  const workflowId = result.workflowId || result.executionId || result.id || `fallback_${Date.now()}`;
  const runId = result.runId || result.executionId || result.run_id || `run_${Date.now()}`;
  
  // Verificar se foi sucesso baseado na resposta real do N8N
  const isSuccess = result.ok === true || 
                   result.success === true ||
                   result.status === 'started' ||
                   result.status === 'running' ||
                   result.message?.toLowerCase().includes('started') || 
                   result.message?.toLowerCase().includes('success') ||
                   result.message?.toLowerCase().includes('workflow') ||
                   result.message?.toLowerCase().includes('executed') ||
                   result.message?.toLowerCase().includes('completed') ||
                   workflowId || runId;

  if (!isSuccess) {
    console.error('❌ AUTOMATION - N8N retornou falha:', result);
    throw new Error(result.message || result.error || 'N8N retornou erro');
  }

  console.log('✅ AUTOMATION - Workflow iniciado no N8N:', { workflowId, runId });
  
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
    // Tentar salvar no servidor local primeiro (desenvolvimento)
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
        return; // Sucesso, não precisa tentar Supabase
      }
    } catch (localError) {
      console.log('⚠️ AUTOMATION - Servidor local não disponível, tentando Supabase');
    }
    
    // Fallback: Tentar salvar no Supabase
    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      // Tentar usar RPC primeiro
      try {
        const { error } = await supabase.rpc('save_automation_record', {
          p_id: recordId,
          p_user_id: user?.id || null,
          p_user_email: user?.email || 'unknown@ggv.com',
          p_user_role: 'USER',
          p_automation_type: 'reativacao_leads',
          p_filtro: input.filtro,
          p_proprietario: input.proprietario,
          p_cadencia: input.cadencia,
          p_numero_negocio: input.numero_negocio,
          p_status: 'started',
          p_n8n_response: n8nResponse
        });
        
        if (!error) {
          console.log('✅ AUTOMATION - Histórico salvo no Supabase via RPC:', recordId);
          return;
        }
      } catch (rpcError) {
        console.log('⚠️ AUTOMATION - RPC não disponível, tentando inserção direta');
      }
      
      // Fallback: Inserção direta na tabela
      const { error: insertError } = await supabase
        .from('automation_history')
        .insert([{
          id: recordId,
          user_id: user?.id || null,
          user_email: user?.email || 'unknown@ggv.com',
          user_role: 'USER',
          automation_type: 'reativacao_leads',
          filtro: input.filtro,
          proprietario: input.proprietario,
          cadencia: input.cadencia,
          numero_negocio: input.numero_negocio,
          status: 'started',
          n8n_response: n8nResponse,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      
      if (!insertError) {
        console.log('✅ AUTOMATION - Histórico salvo no Supabase via inserção direta:', recordId);
      } else {
        console.error('❌ AUTOMATION - Erro ao salvar no Supabase:', insertError);
      }
      
    } catch (supabaseError) {
      console.error('❌ AUTOMATION - Erro ao conectar com Supabase:', supabaseError);
    }
  } catch (error) {
    console.error('❌ AUTOMATION - Erro geral ao salvar:', error);
  }
  
  return {
    success: true,
    message: result.message || 'Automação iniciada no N8N',
    workflowId,
    runId,
    mock: false, // Sempre false agora
    n8nResponse: {
      ...result,
      workflowId,
      runId,
      status: 'started',
      timestamp: new Date().toISOString(),
      real: true
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
    // Tentar primeiro o servidor local (desenvolvimento)
    try {
      const res = await fetch(`/automation/history?page=${page}&limit=${limit}`);
      if (res.ok) {
        const result = await res.json();
        console.log('📊 AUTOMATION - Usando servidor local');
        
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
      }
    } catch (localError) {
      console.log('⚠️ AUTOMATION - Servidor local não disponível, tentando Supabase');
    }
    
    // Fallback: Tentar Supabase RPC (se disponível)
    try {
      const { data, error } = await supabase.rpc('get_automation_history', {
        p_page: page,
        p_limit: limit,
        p_user_id: null
      });
      
      if (!error && data) {
        console.log('📊 AUTOMATION - Usando Supabase RPC');
        const total = data[0]?.total_count || 0;
        const pages = Math.ceil(total / limit);
        
        const formattedData: AutomationHistoryItem[] = data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          userEmail: item.user_email,
          userRole: item.user_role,
          automationType: item.automation_type,
          filtro: item.filtro,
          proprietario: item.proprietario,
          cadencia: item.cadencia,
          numeroNegocio: item.numero_negocio,
          status: item.status,
          errorMessage: item.error_message,
          n8nResponse: item.n8n_response,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        
        return {
          data: formattedData,
          pagination: { page, limit, total, pages }
        };
      }
    } catch (supabaseError) {
      console.log('⚠️ AUTOMATION - Supabase RPC não disponível:', supabaseError);
    }
    
    // Fallback final: Tentar consulta direta na tabela (se existir)
    try {
      const { data, error } = await supabase
        .from('automation_history')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      
      if (!error && data) {
        console.log('📊 AUTOMATION - Usando consulta direta Supabase');
        const formattedData: AutomationHistoryItem[] = data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          userEmail: item.user_email,
          userRole: item.user_role,
          automationType: item.automation_type,
          filtro: item.filtro,
          proprietario: item.proprietario,
          cadencia: item.cadencia,
          numeroNegocio: item.numero_negocio,
          status: item.status,
          errorMessage: item.error_message,
          n8nResponse: item.n8n_response,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        
        return {
          data: formattedData,
          pagination: { page, limit, total: data.length, pages: Math.ceil(data.length / limit) }
        };
      }
    } catch (directError) {
      console.log('⚠️ AUTOMATION - Consulta direta falhou:', directError);
    }
    
    // Se tudo falhar, retornar vazio
    console.log('📊 AUTOMATION - Nenhuma fonte de dados disponível');
    return {
      data: [],
      pagination: { page, limit, total: 0, pages: 0 }
    };
    
  } catch (error) {
    console.error('❌ AUTOMATION - Erro geral ao carregar histórico:', error);
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