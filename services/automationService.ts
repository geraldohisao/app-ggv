import { ReativacaoPayload } from "../src/schemas/reativacao";

export async function triggerReativacao(input: ReativacaoPayload) {
  console.log('🚀 AUTOMATION - Iniciando reativação para SDR:', input.proprietario);
  
  const res = await fetch("/automation/reactivation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  const result = await res.json();
  
  console.log('📊 AUTOMATION - Resposta do N8N:', result);
  
  // Gerar workflowId e iniciar simulação
  const workflowId = `wf_${Date.now()}`;
  
  // Salvar no histórico local (mock)
  try {
    // Determinar se foi sucesso baseado na resposta do N8N
    const isSuccess = result.ok && (
      result.message?.includes('started') || 
      result.message?.includes('Workflow was started') ||
      result.message?.includes('success') ||
      result.status === 'completed' ||
      result.status === 'success' ||
      result.runId ||
      result.workflowId
    );
    
    console.log('✅ AUTOMATION - Sucesso detectado:', isSuccess, 'Mensagem:', result.message);
    
    const historyResponse = await fetch("/automation/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: 'current-user',
        userEmail: 'geraldo@grupoggv.com',
        userRole: 'SUPER_ADMIN',
        automationType: 'reativacao_leads',
        filtro: input.filtro,
        proprietario: input.proprietario,
        cadencia: input.cadencia,
        numeroNegocio: input.numero_negocio,
        status: isSuccess ? 'processing' : 'error', // Sempre começar com 'processing' se sucesso
        errorMessage: isSuccess ? null : (result.message || 'Erro desconhecido'),
        n8nResponse: {
          ...result,
          workflowId,
          startTime: new Date().toISOString(),
          status: 'processing', // Status inicial para progresso
          progress: 0, // Progresso inicial
          message: 'Iniciando automação...'
        }
      }),
    });
    
    const historyData = await historyResponse.json();
    console.log('📝 AUTOMATION - Registro criado no histórico:', historyData.id);
    
    // Iniciar polling do status (se foi sucesso)
    if (isSuccess && historyData.id) {
      console.log('🔄 AUTOMATION - Iniciando polling para workflowId:', workflowId);
      startWorkflowPolling(historyData.id, workflowId);
    }
  } catch (error) {
    console.warn('❌ AUTOMATION - Erro ao salvar no histórico:', error);
  }
  
  return result; // { ok: true, forwarded: true, runId?: string }
}

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
  status: 'pending' | 'success' | 'error' | 'processing' | 'starting' | 'finalizing' | 'connecting' | 'fetching' | 'completed';
  errorMessage?: string;
  n8nResponse?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationHistoryResponse {
  data: AutomationHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getAutomationHistory(params?: {
  page?: number;
  limit?: number;
  automationType?: string;
  status?: string;
}): Promise<AutomationHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.automationType) searchParams.append('automationType', params.automationType);
  if (params?.status) searchParams.append('status', params.status);

  const res = await fetch(`/automation/history?${searchParams.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Função para verificar status do workflow no N8N
export async function checkWorkflowStatus(workflowId?: string): Promise<any> {
  if (!workflowId) {
    // Se não temos workflowId, tentar buscar da última execução
    const history = await getAutomationHistory({ limit: 1 });
    const lastExecution = history.data[0];
    if (lastExecution?.n8nResponse?.workflowId) {
      workflowId = lastExecution.n8nResponse.workflowId;
    } else {
      throw new Error('Nenhum workflow ID encontrado');
    }
  }

  // Tentar verificar status via N8N API (se disponível)
  try {
    const res = await fetch(`/automation/status/${workflowId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (error) {
    console.warn('Erro ao verificar status do workflow:', error);
    return { status: 'unknown', message: 'Status não disponível' };
  }
}

// Função para atualizar status de um registro específico
export async function updateAutomationStatus(historyId: string, status: string, details?: any): Promise<void> {
  try {
    await fetch(`/automation/history/${historyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, n8nResponse: details }),
    });
  } catch (error) {
    console.warn('Erro ao atualizar status:', error);
  }
}

// Função para iniciar polling do status do workflow
function startWorkflowPolling(historyId: string, workflowId: string) {
  let pollCount = 0;
  const maxPolls = 60; // Aumentado para 60 verificações (30 segundos com 500ms de intervalo)
  
  console.log('🔄 POLLING - Iniciando para historyId:', historyId, 'workflowId:', workflowId);
  
  const poll = async () => {
    try {
      pollCount++;
      console.log(`🔄 POLLING - Tentativa ${pollCount}/${maxPolls} para workflowId:`, workflowId);
      
      const status = await checkWorkflowStatus(workflowId);
      console.log('📊 POLLING - Status recebido:', status);
      
      // Atualizar o histórico com o novo status
      await updateAutomationStatus(historyId, status.status, status);
      console.log('✅ POLLING - Status atualizado no histórico:', status.status);
      
      // Continuar polling se não estiver concluído
      if (status.status !== 'completed' && pollCount < maxPolls) {
        setTimeout(poll, 500); // Verificar a cada 500ms
      } else if (status.status === 'completed') {
        console.log('🎉 POLLING - Workflow concluído com sucesso:', status);
      } else {
        console.log('⏰ POLLING - Tempo limite atingido, parando polling');
      }
    } catch (error) {
      console.warn('❌ POLLING - Erro na tentativa', pollCount, ':', error);
      
      // Tentar mais algumas vezes mesmo com erro
      if (pollCount < maxPolls) {
        setTimeout(poll, 1000); // Esperar 1 segundo antes da próxima tentativa
      }
    }
  };
  
  // Iniciar polling após 1 segundo
  setTimeout(poll, 1000);
}
