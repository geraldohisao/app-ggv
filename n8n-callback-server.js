// Servidor para receber callbacks reais do N8N
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Armazenar histórico real (em produção, isso seria um banco de dados)
let realHistory = [];

// Endpoint para receber callbacks do N8N
app.post('/api/webhook/n8n-callback', (req, res) => {
  const { workflowId, executionId, status, message, data, timestamp } = req.body;
  
  console.log('🔔 N8N CALLBACK - Recebido:', {
    workflowId: workflowId || executionId,
    status,
    message,
    timestamp: timestamp || new Date().toISOString()
  });
  
  // Encontrar e atualizar o registro
  const record = realHistory.find(item => 
    item.n8nResponse?.workflowId === workflowId ||
    item.n8nResponse?.workflowId === executionId
  );
  
  if (record) {
    record.status = status;
    record.updatedAt = new Date().toISOString();
    record.n8nResponse = {
      ...record.n8nResponse,
      status,
      message,
      data,
      timestamp: timestamp || new Date().toISOString(),
      callbackReceived: true
    };
    
    console.log('✅ N8N CALLBACK - Registro atualizado:', record.id);
  } else {
    console.warn('⚠️ N8N CALLBACK - Workflow não encontrado:', workflowId || executionId);
  }
  
  res.json({ 
    success: true, 
    message: 'Callback processado',
    updated: !!record
  });
});

// Endpoint para salvar novos registros de automação
app.post('/automation/history', (req, res) => {
  const data = req.body;
  const id = `real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const record = {
    id,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  realHistory.unshift(record);
  
  // Manter apenas os 50 registros mais recentes
  if (realHistory.length > 50) {
    realHistory = realHistory.slice(0, 50);
  }
  
  console.log('📝 N8N REAL - Novo registro salvo:', {
    id,
    proprietario: data.proprietario,
    status: data.status
  });
  
  res.json({ success: true, id });
});

// Endpoint para consultar histórico real
app.get('/automation/history', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Filtrar apenas execuções reais (não simuladas)
  const realExecutions = realHistory.filter(item => 
    item.n8nResponse?.real === true
  );
  
  const total = realExecutions.length;
  const pages = Math.ceil(total / limit);
  const data = realExecutions.slice(skip, skip + limit);
  
  console.log('📊 N8N REAL - Consultando histórico:', { 
    page, 
    limit, 
    skip, 
    total: realExecutions.length,
    totalRecords: realHistory.length
  });
  
  res.json({
    data,
    pagination: { page, limit, total, pages }
  });
});

// Endpoint para atualizar status via callback
app.post('/automation/history/update', (req, res) => {
  const { workflowId, status, message, data, timestamp, completed } = req.body;
  
  const record = realHistory.find(item => 
    item.n8nResponse?.workflowId === workflowId
  );
  
  if (record) {
    record.status = completed ? 'completed' : status;
    record.updatedAt = timestamp || new Date().toISOString();
    record.n8nResponse = {
      ...record.n8nResponse,
      status: completed ? 'completed' : status,
      message,
      data,
      timestamp: timestamp || new Date().toISOString(),
      callbackReceived: true
    };
    
    console.log('🔄 N8N REAL - Status atualizado via callback:', {
      id: record.id,
      workflowId,
      status: record.status
    });
    
    res.json({ success: true, updated: true });
  } else {
    console.warn('⚠️ N8N REAL - Workflow não encontrado para atualização:', workflowId);
    res.json({ success: false, updated: false, error: 'Workflow não encontrado' });
  }
});

// Endpoint para resetar histórico (apenas para desenvolvimento)
app.post('/automation/history/reset', (req, res) => {
  const oldCount = realHistory.length;
  realHistory = [];
  
  console.log('🗑️ N8N REAL - Histórico resetado:', { removidos: oldCount });
  
  res.json({ 
    success: true, 
    message: `${oldCount} registros removidos`,
    count: oldCount 
  });
});

// Endpoint de status
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    type: 'n8n-real-callback-server',
    records: realHistory.length,
    realRecords: realHistory.filter(item => item.n8nResponse?.real === true).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('🚀 N8N Real Callback Server running on port', PORT);
  console.log('📋 Endpoints disponíveis:');
  console.log('   POST /api/webhook/n8n-callback - Callback do N8N');
  console.log('   POST /automation/history - Salvar registro');
  console.log('   GET  /automation/history - Consultar histórico real');
  console.log('   POST /automation/history/update - Atualizar via callback');
  console.log('   POST /automation/history/reset - Resetar histórico');
  console.log('   GET  /status - Status do servidor');
  console.log('');
  console.log('🔔 Aguardando callbacks reais do N8N...');
});
