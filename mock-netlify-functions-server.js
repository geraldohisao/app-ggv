// Mock server para simular Netlify Functions localmente
// Execute: node mock-netlify-functions-server.js
// Acesse: http://localhost:8080/api/*

import express from 'express';
import cors from 'cors';
const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Mock Netlify Functions Server iniciado');
console.log('📡 Simulando endpoints locais para desenvolvimento');

// Mock: /api/diagnostic/test
app.get('/api/diagnostic/test', (req, res) => {
  console.log('🧪 MOCK - GET /api/diagnostic/test');
  
  const tests = {
    connectivity: 'OK',
    timestamp: new Date().toISOString(),
    method: 'GET',
    environment: 'development-mock',
    server: 'mock-netlify-functions',
    version: '1.0.0-mock'
  };

  res.json({
    success: true,
    message: 'Mock diagnostic test endpoint working correctly',
    tests: tests,
    timestamp: new Date().toISOString()
  });
});

// Mock: /api/feedback
app.post('/api/feedback', (req, res) => {
  console.log('📝 MOCK - POST /api/feedback');
  console.log('Body:', req.body);
  
  // Simular processamento
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Mock feedback sent successfully',
      timestamp: new Date().toISOString()
    });
  }, 500);
});

// Mock: /api/alert
app.post('/api/alert', (req, res) => {
  console.log('🚨 MOCK - POST /api/alert');
  console.log('Body:', req.body);
  
  // Simular processamento
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Mock alert sent successfully',
      timestamp: new Date().toISOString()
    });
  }, 300);
});

// Mock: /api/webhook/diag-ggv-register
app.get('/api/webhook/diag-ggv-register', (req, res) => {
  console.log('🔗 MOCK - GET /api/webhook/diag-ggv-register');
  console.log('Query:', req.query);
  
  const dealId = req.query.deal_id || 'mock-deal';
  
  // Simular dados do Pipedrive
  const mockData = {
    companyName: `Empresa Mock ${dealId}`,
    email: `contato@empresa${dealId}.com.br`,
    activityBranch: 'Tecnologia',
    activitySector: 'Tecnologia / Desenvolvimento / Sites',
    monthlyBilling: 'R$ 101 a 300 mil/mês',
    salesTeamSize: 'De 4 a 10 colaboradores',
    salesChannels: [],
    _mockData: true,
    _server: 'mock-netlify-functions',
    _dealId: dealId
  };
  
  res.json(mockData);
});

// Mock: /api/webhook/diag-ggv-register (POST)
app.post('/api/webhook/diag-ggv-register', (req, res) => {
  console.log('🔗 MOCK - POST /api/webhook/diag-ggv-register');
  console.log('Body:', req.body);
  
  // Simular processamento do diagnóstico
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Mock diagnostic processed successfully',
      dealId: req.body.dealId || 'mock-deal',
      timestamp: new Date().toISOString()
    });
  }, 1000);
});

// Catch-all para endpoints não implementados
app.all('*', (req, res) => {
  console.log(`❓ MOCK - ${req.method} ${req.path} - Endpoint não implementado`);
  res.status(404).json({
    error: 'Endpoint não implementado no mock server',
    method: req.method,
    path: req.path,
    available_endpoints: [
      'GET /api/diagnostic/test',
      'POST /api/feedback',
      'POST /api/alert',
      'GET /api/webhook/diag-ggv-register',
      'POST /api/webhook/diag-ggv-register'
    ]
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Mock server rodando em http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Endpoints disponíveis:');
  console.log(`   GET  http://localhost:${PORT}/api/diagnostic/test`);
  console.log(`   POST http://localhost:${PORT}/api/feedback`);
  console.log(`   POST http://localhost:${PORT}/api/alert`);
  console.log(`   GET  http://localhost:${PORT}/api/webhook/diag-ggv-register`);
  console.log(`   POST http://localhost:${PORT}/api/webhook/diag-ggv-register`);
  console.log('');
  console.log('🔧 Para usar: configure VITE_API_BASE_URL=http://localhost:8080');
  console.log('');
});
