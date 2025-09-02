// Simple Mock Server - Node.js nativo (sem dependências)
// Execute: node simple-mock-server.js

import { createServer } from 'http';
import { URL } from 'url';

const PORT = 8080;

// Helper para parsing de JSON do body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

// Helper para resposta JSON
function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;
  const path = url.pathname;

  console.log(`${method} ${path}`);

  // CORS preflight
  if (method === 'OPTIONS') {
    sendJSON(res, { ok: true });
    return;
  }

  // Route handlers
  try {
    if (method === 'GET' && path === '/api/diagnostic/test') {
      sendJSON(res, {
        success: true,
        message: 'Simple mock diagnostic test working',
        tests: {
          connectivity: 'OK',
          timestamp: new Date().toISOString(),
          server: 'simple-mock-server',
          environment: 'development'
        }
      });
    }
    
    else if (method === 'POST' && path === '/api/feedback') {
      const body = await parseBody(req);
      console.log('📝 Feedback:', body);
      sendJSON(res, {
        success: true,
        message: 'Mock feedback received',
        timestamp: new Date().toISOString()
      });
    }
    
    else if (method === 'POST' && path === '/api/alert') {
      const body = await parseBody(req);
      console.log('🚨 Alert:', body);
      sendJSON(res, {
        success: true,
        message: 'Mock alert received',
        timestamp: new Date().toISOString()
      });
    }
    
    else if (method === 'GET' && path === '/api/webhook/diag-ggv-register') {
      const dealId = url.searchParams.get('deal_id') || 'mock-deal';
      sendJSON(res, {
        companyName: `Empresa Mock ${dealId}`,
        email: `contato@empresa${dealId}.com.br`,
        activityBranch: 'Tecnologia',
        activitySector: 'Tecnologia / Desenvolvimento / Sites',
        monthlyBilling: 'R$ 101 a 300 mil/mês',
        salesTeamSize: 'De 4 a 10 colaboradores',
        _mockData: true,
        _dealId: dealId
      });
    }
    
    else if (method === 'POST' && path === '/api/webhook/diag-ggv-register') {
      const body = await parseBody(req);
      console.log('🔗 Diagnostic POST:', body);
      sendJSON(res, {
        success: true,
        message: 'Mock diagnostic processed',
        dealId: body.dealId || 'mock-deal',
        timestamp: new Date().toISOString()
      });
    }
    
    // Adicionar endpoint específico para o debug panel
    else if (method === 'POST' && path.includes('diag-ggv-register')) {
      const body = await parseBody(req);
      console.log('🔗 Debug Panel Diagnostic POST:', body);
      sendJSON(res, {
        success: true,
        message: 'Mock debug panel diagnostic processed',
        timestamp: new Date().toISOString()
      });
    }
    
    else {
      // 404 for unknown routes
      sendJSON(res, {
        error: 'Endpoint not found',
        method,
        path,
        available: [
          'GET /api/diagnostic/test',
          'POST /api/feedback',
          'POST /api/alert',
          'GET /api/webhook/diag-ggv-register',
          'POST /api/webhook/diag-ggv-register'
        ]
      }, 404);
    }
  } catch (error) {
    console.error('Server error:', error);
    sendJSON(res, {
      error: 'Internal server error',
      message: error.message
    }, 500);
  }
});

server.listen(PORT, () => {
  console.log('🚀 Simple Mock Server iniciado!');
  console.log(`✅ Rodando em http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Endpoints disponíveis:');
  console.log(`   GET  http://localhost:${PORT}/api/diagnostic/test`);
  console.log(`   POST http://localhost:${PORT}/api/feedback`);
  console.log(`   POST http://localhost:${PORT}/api/alert`);
  console.log(`   GET  http://localhost:${PORT}/api/webhook/diag-ggv-register`);
  console.log(`   POST http://localhost:${PORT}/api/webhook/diag-ggv-register`);
  console.log('');
  console.log('🔧 Para parar: Ctrl+C');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Parando servidor...');
  server.close(() => {
    console.log('✅ Servidor parado');
    process.exit(0);
  });
});
