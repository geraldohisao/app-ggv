// Netlify Function: Simple diagnostic test endpoint
// Endpoint: /.netlify/functions/diagnostic-test
// Alias: /api/diagnostic/test

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  try {
    const timestamp = new Date().toISOString();
    const method = event.httpMethod;
    const query = event.queryStringParameters || {};
    const userAgent = event.headers['user-agent'] || '';
    
    console.log('🧪 DIAGNOSTIC TEST - Método:', method);
    console.log('🧪 DIAGNOSTIC TEST - Query:', query);
    console.log('🧪 DIAGNOSTIC TEST - Timestamp:', timestamp);

    // Simular alguns testes básicos
    const tests = {
      connectivity: 'OK',
      timestamp: timestamp,
      method: method,
      environment: process.env.NODE_ENV || 'production',
      netlify: process.env.NETLIFY ? 'true' : 'false',
      supabaseUrl: process.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
      version: '1.0.0'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Diagnostic test endpoint working correctly',
        tests: tests,
        timestamp: timestamp
      })
    };

  } catch (error) {
    console.error('❌ DIAGNOSTIC TEST - Erro:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
