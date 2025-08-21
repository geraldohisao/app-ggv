import express from 'express';
import cors from 'cors';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock data para histórico
let mockHistory = [
  {
    id: '1',
    userId: 'user-1',
    userEmail: 'geraldo@grupoggv.com',
    userRole: 'SUPER_ADMIN',
    automationType: 'reativacao_leads',
    filtro: 'Lista de reativação - Topo de funil',
    proprietario: 'Andressa',
    cadencia: 'Reativação - Sem Retorno',
    numeroNegocio: 20,
    status: 'success',
    errorMessage: null,
    n8nResponse: { runId: 'mock-run-123', status: 'completed' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    userId: 'user-1',
    userEmail: 'geraldo@grupoggv.com',
    userRole: 'SUPER_ADMIN',
    automationType: 'reativacao_leads',
    filtro: 'Lista de reativação - Topo de funil',
    proprietario: 'Lô-Ruama Oliveira',
    cadencia: 'Reativação - Sem Retorno',
    numeroNegocio: 20,
    status: 'success',
    errorMessage: null,
    n8nResponse: { runId: 'mock-run-456', status: 'completed' },
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutos atrás
    updatedAt: new Date(Date.now() - 300000).toISOString()
  }
];

// Rota para ativar reativação (POST)
app.post('/automation/reactivation', (req, res) => {
  const { filtro, proprietario, cadencia, numero_negocio } = req.body;
  
  console.log('🚀 MOCK - Recebendo solicitação de reativação:', {
    filtro,
    proprietario,
    cadencia,
    numero_negocio
  });
  
  // Simular diferentes cenários baseado no proprietário
  if (proprietario === 'Teste Erro') {
    console.log('❌ MOCK - Simulando erro para teste');
    return res.status(500).json({
      ok: false,
      error: 'Erro simulado para teste',
      message: 'Falha na conexão com N8N'
    });
  }
  
  // Simular sucesso
  const runId = `run_${Date.now()}`;
  const workflowId = `wf_${Date.now()}`;
  
  const response = {
    ok: true,
    forwarded: true,
    message: 'Workflow was started successfully',
    runId,
    workflowId,
    status: 'started',
    timestamp: new Date().toISOString(),
    parameters: {
      filtro,
      proprietario,
      cadencia,
      numero_negocio
    }
  };
  
  console.log('✅ MOCK - Reativação iniciada com sucesso:', runId);
  
  res.json(response);
});

// Rota para consultar histórico (GET)
app.get('/automation/history', (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = Math.min(parseInt(req.query.limit || '10'), 50);
  const skip = (page - 1) * limit;
  
  console.log('📊 MOCK - Consultando histórico:', { page, limit, skip, total: mockHistory.length });
  
  const filteredHistory = mockHistory.filter(item => {
    if (req.query.automationType && item.automationType !== req.query.automationType) return false;
    if (req.query.status && item.status !== req.query.status) return false;
    return true;
  });
  
  const paginatedHistory = filteredHistory.slice(skip, skip + limit);
  
  console.log('📊 MOCK - Retornando', paginatedHistory.length, 'registros');
  
  res.json({
    data: paginatedHistory,
    pagination: {
      page,
      limit,
      total: filteredHistory.length,
      pages: Math.ceil(filteredHistory.length / limit)
    }
  });
});

// Rota para adicionar ao histórico (chamada pelo proxy)
app.post('/automation/history', (req, res) => {
  console.log('📝 MOCK - Recebendo novo registro:', req.body.proprietario);
  
  // Determinar se foi sucesso baseado APENAS na resposta do N8N
  const n8nResponse = req.body.n8nResponse || {};
  const isSuccess = (
    n8nResponse.message?.includes('started') || 
    n8nResponse.message?.includes('Workflow was started') ||
    n8nResponse.message?.includes('success') ||
    n8nResponse.status === 'completed' ||
    n8nResponse.status === 'success' ||
    n8nResponse.runId ||
    n8nResponse.workflowId ||
    n8nResponse.ok === true ||
    n8nResponse.forwarded === true
  );
  
  console.log('📝 MOCK - Análise de sucesso:', {
    message: n8nResponse.message,
    status: n8nResponse.status,
    runId: n8nResponse.runId,
    workflowId: n8nResponse.workflowId,
    ok: n8nResponse.ok,
    forwarded: n8nResponse.forwarded,
    isSuccess: isSuccess
  });
  
  // Se foi sucesso, começar com 'processing' para mostrar progresso
  // Se foi erro, manter como 'error'
  const initialStatus = isSuccess ? 'processing' : 'error';
  
  const newRecord = {
    id: Date.now().toString(),
    ...req.body,
    status: initialStatus, // Usar status determinado pela análise do N8N
    errorMessage: isSuccess ? null : (req.body.errorMessage || n8nResponse.message || 'Erro desconhecido'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('📝 MOCK - Criando registro com status:', initialStatus, 'para SDR:', req.body.proprietario);
  
  mockHistory.unshift(newRecord);
  
  // Manter apenas os últimos 100 registros
  if (mockHistory.length > 100) {
    mockHistory = mockHistory.slice(0, 100);
  }
  
  res.json({ success: true, id: newRecord.id });
});

// Rota para atualizar registro no histórico
app.put('/automation/history/:id', (req, res) => {
  const index = mockHistory.findIndex(item => item.id === req.params.id);
  if (index !== -1) {
    mockHistory[index] = {
      ...mockHistory[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Record not found' });
  }
});

// Rota para limpar histórico
app.post('/automation/history/clear', (req, res) => {
  mockHistory = [];
  res.json({ success: true, message: 'Histórico limpo' });
});

// Rota para reinicializar histórico com dados de teste
app.post('/automation/history/reset', (req, res) => {
  mockHistory = [
    {
      id: '1',
      userId: 'user-1',
      userEmail: 'geraldo@grupoggv.com',
      userRole: 'SUPER_ADMIN',
      automationType: 'reativacao_leads',
      filtro: 'Lista de reativação - Topo de funil',
      proprietario: 'Andressa',
      cadencia: 'Reativação - Sem Retorno',
      numeroNegocio: 20,
      status: 'success',
      errorMessage: null,
      n8nResponse: { runId: 'mock-run-123', status: 'completed' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      userId: 'user-1',
      userEmail: 'geraldo@grupoggv.com',
      userRole: 'SUPER_ADMIN',
      automationType: 'reativacao_leads',
      filtro: 'Lista de reativação - Topo de funil',
      proprietario: 'Lô-Ruama Oliveira',
      cadencia: 'Reativação - Sem Retorno',
      numeroNegocio: 20,
      status: 'success',
      errorMessage: null,
      n8nResponse: { runId: 'mock-run-456', status: 'completed' },
      createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutos atrás
      updatedAt: new Date(Date.now() - 300000).toISOString()
    }
  ];
  
  console.log('🔄 MOCK - Histórico reinicializado com', mockHistory.length, 'registros');
  res.json({ success: true, message: 'Histórico reinicializado', count: mockHistory.length });
});

// Simulação de status de workflow
const workflowStatuses = new Map();

// Rota para verificar status do workflow
app.get('/automation/status/:workflowId', (req, res) => {
  const { workflowId } = req.params;
  
  // Simular diferentes status baseado no tempo
  const now = Date.now();
  let workflowStartTime = workflowStatuses.get(workflowId);
  
  if (!workflowStartTime) {
    // Se não existe, criar agora
    workflowStartTime = now;
    workflowStatuses.set(workflowId, workflowStartTime);
  }
  
  const elapsed = now - workflowStartTime;
  
  let status, message, progress, details;
  
  if (elapsed < 3000) {
    // Primeiros 3 segundos: conectando
    status = 'connecting';
    message = 'Conectando ao N8N...';
    progress = Math.min((elapsed / 3000) * 15, 15);
    details = 'Estabelecendo conexão com o servidor de automação';
  } else if (elapsed < 7000) {
    // 3-7 segundos: iniciando
    status = 'starting';
    message = 'Iniciando workflow de reativação...';
    progress = 15 + Math.min(((elapsed - 3000) / 4000) * 20, 20);
    details = 'Configurando parâmetros e validando dados';
  } else if (elapsed < 15000) {
    // 7-15 segundos: buscando leads
    status = 'fetching';
    message = 'Buscando leads para reativação...';
    progress = 35 + Math.min(((elapsed - 7000) / 8000) * 25, 25);
    details = 'Consultando base de dados e aplicando filtros';
  } else if (elapsed < 25000) {
    // 15-25 segundos: processando
    status = 'processing';
    message = 'Processando leads selecionados...';
    progress = 60 + Math.min(((elapsed - 15000) / 10000) * 25, 25);
    details = 'Aplicando cadência e preparando para envio';
  } else if (elapsed < 30000) {
    // 25-30 segundos: finalizando
    status = 'finalizing';
    message = 'Finalizando importação...';
    progress = 85 + Math.min(((elapsed - 25000) / 5000) * 10, 10);
    details = 'Salvando resultados e gerando relatório';
  } else {
    // Após 30 segundos: concluído
    status = 'completed';
    message = 'Importação concluída com sucesso!';
    progress = 100;
    details = 'Todos os leads foram processados e enviados para as SDRs';
  }
  
  // Calcular leads processados baseado no progresso
  const totalLeads = 20; // Assumindo 20 leads
  const leadsProcessed = Math.floor((progress / 100) * totalLeads);
  
  const response = {
    workflowId,
    status,
    message,
    progress: Math.round(progress),
    elapsed,
    estimatedTotal: 25000, // 25 segundos total
    leadsProcessed,
    totalLeads,
    details,
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 MOCK - Status do workflow:', workflowId, 'Status:', status, 'Progresso:', progress + '%');
  
  // Se o status mudou para completed, atualizar o registro no histórico automaticamente
  if (status === 'completed') {
    const record = mockHistory.find(item => 
      item.n8nResponse?.workflowId === workflowId
    );
    
    if (record && record.status !== 'completed') {
      record.status = 'completed';
      record.updatedAt = new Date().toISOString();
      record.n8nResponse = {
        ...record.n8nResponse,
        status: 'completed',
        message: 'Importação concluída com sucesso!',
        progress: 100,
        leadsProcessed: totalLeads,
        totalLeads,
        autoCompleted: true,
        completedAt: new Date().toISOString()
      };
      
      console.log('✅ MOCK - Registro automaticamente marcado como concluído:', record.id);
    }
  }
  
  res.json(response);
});

// Rota para simular início de workflow
app.post('/automation/start-workflow', (req, res) => {
  const workflowId = `wf_${Date.now()}`;
  workflowStatuses.set(workflowId, Date.now());
  
  res.json({
    workflowId,
    message: 'Workflow was started',
    status: 'started'
  });
});

// Rota para marcar workflow como concluído manualmente
app.post('/automation/complete/:workflowId', (req, res) => {
  const { workflowId } = req.params;
  const { message = 'Workflow concluído manualmente', leadsProcessed } = req.body;
  
  console.log('🎯 MOCK - Marcando workflow como concluído:', workflowId);
  
  // Encontrar o registro no histórico
  const record = mockHistory.find(item => 
    item.n8nResponse?.workflowId === workflowId
  );
  
  if (record) {
    record.status = 'completed';
    record.updatedAt = new Date().toISOString();
    record.n8nResponse = {
      ...record.n8nResponse,
      status: 'completed',
      message,
      progress: 100,
      leadsProcessed: leadsProcessed || record.numeroNegocio,
      totalLeads: record.numeroNegocio,
      manuallyCompleted: true,
      completedAt: new Date().toISOString()
    };
    
    console.log('✅ MOCK - Workflow marcado como concluído:', record.id);
    res.json({ success: true, message: 'Workflow marcado como concluído', record });
  } else {
    console.warn('⚠️ MOCK - Workflow não encontrado:', workflowId);
    res.status(404).json({ error: 'Workflow não encontrado' });
  }
});

// Rota para simular webhook de retorno do N8N
app.post('/automation/webhook/n8n-callback', (req, res) => {
  const { workflowId, status, message, data } = req.body;
  
  console.log('🔔 MOCK - Webhook N8N recebido:', {
    workflowId,
    status,
    message,
    dataKeys: data ? Object.keys(data) : []
  });
  
  // Encontrar e atualizar o registro no histórico
  const record = mockHistory.find(item => 
    item.n8nResponse?.workflowId === workflowId
  );
  
  if (record) {
    record.status = status;
    record.updatedAt = new Date().toISOString();
    record.n8nResponse = {
      ...record.n8nResponse,
      status,
      message,
      data,
      webhookReceived: true,
      webhookTime: new Date().toISOString()
    };
    
    console.log('✅ MOCK - Registro atualizado via webhook:', record.id);
  } else {
    console.warn('⚠️ MOCK - Workflow não encontrado para webhook:', workflowId);
  }
  
  res.json({ success: true, message: 'Webhook processado' });
});

// Endpoint para receber dados do diagnóstico
app.post('/automation/webhook/diag-ggv-register', (req, res) => {
  console.log('📊 MOCK - Recebendo dados do diagnóstico:', req.body);
  
  const { companyData, segment, answers, totalScore, dealId } = req.body;
  
  // Simular processamento
  const mockResponse = {
    success: true,
    message: 'Diagnóstico recebido e processado com sucesso',
    data: {
      company: companyData?.companyName || 'Empresa não informada',
      score: totalScore,
      segment,
      dealId,
      processed: true,
      timestamp: new Date().toISOString()
    }
  };
  
  console.log('✅ MOCK - Diagnóstico processado:', mockResponse);
  res.json(mockResponse);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Mock automation server running on port ${PORT}`);
  console.log(`📋 Endpoints disponíveis:`);
  console.log(`   POST /automation/reactivation - Ativar reativação`);
  console.log(`   GET  /automation/history - Consultar histórico`);
  console.log(`   POST /automation/webhook/n8n-callback - Webhook N8N`);
  console.log(`   POST /automation/webhook/diag-ggv-register - Receber diagnóstico`);
  console.log(`   GET  /automation/status/:workflowId - Status do workflow`);
  console.log(`   POST /automation/complete/:workflowId - Marcar como concluído`);
  console.log(`   POST /automation/history/reset - Reinicializar histórico`);
});
