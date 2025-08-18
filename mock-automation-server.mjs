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
  const workflowStartTime = workflowStatuses.get(workflowId) || now;
  const elapsed = now - workflowStartTime;
  
  let status, message, progress, details;
  
  if (elapsed < 2000) {
    // Primeiros 2 segundos: conectando
    status = 'connecting';
    message = 'Conectando ao N8N...';
    progress = Math.min((elapsed / 2000) * 10, 10);
    details = 'Estabelecendo conexão com o servidor de automação';
  } else if (elapsed < 5000) {
    // 2-5 segundos: iniciando
    status = 'starting';
    message = 'Iniciando workflow de reativação...';
    progress = 10 + Math.min(((elapsed - 2000) / 3000) * 15, 15);
    details = 'Configurando parâmetros e validando dados';
  } else if (elapsed < 12000) {
    // 5-12 segundos: buscando leads
    status = 'fetching';
    message = 'Buscando leads para reativação...';
    progress = 25 + Math.min(((elapsed - 5000) / 7000) * 25, 25);
    details = 'Consultando base de dados e aplicando filtros';
  } else if (elapsed < 20000) {
    // 12-20 segundos: processando
    status = 'processing';
    message = 'Processando leads selecionados...';
    progress = 50 + Math.min(((elapsed - 12000) / 8000) * 30, 30);
    details = 'Aplicando cadência e preparando para envio';
  } else if (elapsed < 25000) {
    // 20-25 segundos: finalizando
    status = 'finalizing';
    message = 'Finalizando importação...';
    progress = 80 + Math.min(((elapsed - 20000) / 5000) * 15, 15);
    details = 'Salvando resultados e gerando relatório';
  } else {
    // Após 25 segundos: concluído
    status = 'completed';
    message = 'Importação concluída com sucesso!';
    progress = 100;
    details = 'Todos os leads foram processados e enviados';
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock automation server running on port ${PORT}`);
});
