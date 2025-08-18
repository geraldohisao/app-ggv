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
  }
];

// Rota para histórico
app.get('/automation/history', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;
  
  const filteredHistory = mockHistory.filter(item => {
    if (req.query.automationType && item.automationType !== req.query.automationType) return false;
    if (req.query.status && item.status !== req.query.status) return false;
    return true;
  });
  
  const paginatedHistory = filteredHistory.slice(skip, skip + limit);
  
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
  const newRecord = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock automation server running on port ${PORT}`);
});
